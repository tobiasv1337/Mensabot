import json
from dataclasses import dataclass
from typing import Any, Dict, List

import anyio
from fastmcp import Client as MCPClient
from openmensa_sdk import OpenMensaAPIError

from mensa_mcp_server import mcp
from mensa_mcp_server.cache import shared_cache
from mensa_mcp_server.cache_keys import openmensa_canteen_key
from mensa_mcp_server.server import make_openmensa_client

from ..concurrency import get_io_semaphore
from ..config import settings
from ..i18n import DEFAULT_LANGUAGE, get_string
from ..logging import logger
from ..models import ChatResponse, ToolCallTrace, UserFilters
from ..prompts import (
    DIET_PREFERENCE_TO_FILTER,
    DIRECTIONS_TOOL_NAME,
    LOCATION_TOOL_NAME,
)

CACHE_TTL_CANTEEN_INFO_S = 60 * 60 * 24


@dataclass
class ParsedToolCall:
    call_id: str | None
    tool_name: str
    raw_args: Any


def _normalize_tool_arg_value(value: Any) -> Any:
    if isinstance(value, str):
        stripped = value.strip().lower()
        if stripped in {"null", "none"}:
            return None
        return value
    if isinstance(value, list):
        return [_normalize_tool_arg_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_tool_arg_value(item) for key, item in value.items()}
    return value


def _normalize_tool_args(args: Any) -> Any:
    return _normalize_tool_arg_value(args)


def try_repair_json(s: str) -> str:
    t = s.strip()

    if t.startswith("{") and not t.endswith("}"):
        t += "}" * (t.count("{") - t.count("}"))

    if t.startswith("[") and not t.endswith("]"):
        t += "]" * (t.count("[") - t.count("]"))

    return t.replace(",}", "}").replace(",]", "]")


def unwrap_tool_result(resp: Any) -> Any:
    """Convert FastMCP tool result into plain Python data for the LLM."""
    if getattr(resp, "structured_content", None) is not None:
        return resp.structured_content
    if getattr(resp, "model_dump", None) is not None:
        return resp.model_dump()
    return resp


def _parse_tool_call(call: Any) -> ParsedToolCall:
    func = getattr(call, "function", None)
    if func is not None:
        tool_name = getattr(func, "name", None) or getattr(call, "name", None)
        raw_args = getattr(func, "arguments", None)
    else:
        tool_name = getattr(call, "name", None)
        raw_args = getattr(call, "arguments", None)

    if tool_name is None:
        tool_name = "<unknown_tool>"

    return ParsedToolCall(call_id=call.id, tool_name=tool_name, raw_args=raw_args)


def _append_tool_message(messages: List[Dict[str, Any]], call_id: str | None, tool_name: str, payload: Dict[str, Any]) -> None:
    messages.append(
        {
            "role": "tool",
            "tool_call_id": call_id,
            "name": tool_name,
            "content": json.dumps(payload),
        }
    )


def _record_tool_error(
    *,
    tool_trace: ToolCallTrace,
    tool_traces: list[ToolCallTrace],
    messages: List[Dict[str, Any]],
    call_id: str | None,
    tool_name: str,
    error: str,
) -> None:
    tool_trace.ok = False
    tool_trace.error = error
    tool_traces.append(tool_trace)
    _append_tool_message(messages, call_id, tool_name, {"error": error})


def _parse_tool_args(
    *,
    raw_args: Any,
    call_id: str | None,
    tool_name: str,
    tool_trace: ToolCallTrace,
    tool_traces: list[ToolCallTrace],
    messages: List[Dict[str, Any]],
) -> tuple[Any | None, bool]:
    if isinstance(raw_args, (dict, list)):
        return _normalize_tool_args(raw_args), False

    if isinstance(raw_args, str):
        try:
            return _normalize_tool_args(json.loads(raw_args)), False
        except json.JSONDecodeError:
            try:
                repaired = _normalize_tool_args(json.loads(try_repair_json(raw_args)))
                logger.warning(
                    "Tool %s called with MALFORMED JSON arguments, but repair succeeded: %s",
                    tool_name,
                    raw_args,
                )
                return repaired, False
            except json.JSONDecodeError as e:
                logger.error(
                    "Tool %s called with INVALID JSON arguments: %s\n%s",
                    tool_name,
                    raw_args,
                    e,
                )
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call_id,
                        "name": tool_name,
                        "content": f"Invalid JSON arguments: {e}",
                    }
                )
                return None, True

    tool_trace.raw_args = raw_args
    _record_tool_error(
        tool_trace=tool_trace,
        tool_traces=tool_traces,
        messages=messages,
        call_id=call_id,
        tool_name=tool_name,
        error="Tool call arguments missing or in an unsupported format",
    )
    return None, True


async def call_mcp_tool(tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call a tool via FastMCP and return a JSON-serializable dict.
    Args:
        tool_name: Name of the MCP tool to call.
        args: Arguments to pass to the tool.
    Returns:
        On success: {"ok": True, "tool": str, "args": dict, "result": Any}
        On failure: {"error": str}
    """
    logger.info("Tool %s called with args %s.", tool_name, args)
    async with MCPClient(mcp) as mcp_client:
        try:
            resp = await mcp_client.call_tool(tool_name, args)
            data = unwrap_tool_result(resp)
            logger.debug("Got tool response: %s", json.dumps(data, indent=2))
            return {"ok": True, "tool": tool_name, "args": args, "result": data}
        except Exception as e:
            logger.exception("Error calling tool %s with args %s", tool_name, args)
            return {"error": f"Failed to call MCP tool '{tool_name}': {str(e)}"}


def _handle_location_tool(
    *,
    args: Any,
    tool_trace: ToolCallTrace,
    tool_traces: list[ToolCallTrace],
    include_tool_calls: bool,
    lang: str = DEFAULT_LANGUAGE,
) -> ChatResponse:
    prompt = args.get("prompt") if isinstance(args, dict) else None
    prompt_text = prompt if (isinstance(prompt, str) and prompt.strip()) else get_string("location_fallback_prompt", lang)
    logger.info("Location request tool triggered with prompt: %s", prompt_text)
    tool_trace.ok = True
    tool_trace.result = {"needs_location": True, "prompt": prompt_text}
    tool_traces.append(tool_trace)
    return ChatResponse(
        status="needs_location",
        prompt=prompt_text,
        tool_calls=(tool_traces or None) if include_tool_calls else None,
    )


async def _handle_directions_tool(
    *,
    args: Any,
    tool_trace: ToolCallTrace,
    tool_traces: list[ToolCallTrace],
    messages: List[Dict[str, Any]],
    call_id: str | None,
    tool_name: str,
    include_tool_calls: bool,
    lang: str = DEFAULT_LANGUAGE,
) -> ChatResponse | None:
    prompt = args.get("prompt") if isinstance(args, dict) else None
    prompt_text = prompt if (isinstance(prompt, str) and prompt.strip()) else get_string("directions_fallback_prompt", lang)
    raw_canteen_id = args.get("canteen_id") if isinstance(args, dict) else None
    raw_lat = args.get("lat") if isinstance(args, dict) else None
    raw_lng = args.get("lng") if isinstance(args, dict) else None

    canteen_id = None
    lat = None
    lng = None
    validation_error = None

    if raw_canteen_id is not None:
        try:
            canteen_id = int(raw_canteen_id)
        except (TypeError, ValueError):
            validation_error = "canteen_id must be an integer"

    if not validation_error and (raw_lat is not None or raw_lng is not None):
        try:
            lat = float(raw_lat)
            lng = float(raw_lng)
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                validation_error = "Coordinates out of range"
        except (TypeError, ValueError):
            validation_error = "Invalid or incomplete coordinates"

    if validation_error:
        _record_tool_error(
            tool_trace=tool_trace,
            tool_traces=tool_traces,
            messages=messages,
            call_id=call_id,
            tool_name=tool_name,
            error=validation_error,
        )
        return None

    if (lat is None) != (lng is None):
        _record_tool_error(
            tool_trace=tool_trace,
            tool_traces=tool_traces,
            messages=messages,
            call_id=call_id,
            tool_name=tool_name,
            error="lat and lng must be provided together",
        )
        return None

    if canteen_id is None and (lat is None or lng is None):
        _record_tool_error(
            tool_trace=tool_trace,
            tool_traces=tool_traces,
            messages=messages,
            call_id=call_id,
            tool_name=tool_name,
            error="Provide canteen_id or lat/lng",
        )
        return None

    if canteen_id is not None and lat is None and lng is None:
        cache_key = openmensa_canteen_key(canteen_id)
        cached = shared_cache.get(cache_key)
        if cached is not None:
            lat = cached.get("lat")
            lng = cached.get("lng")

        if lat is None or lng is None:
            def _fetch_canteen():
                with make_openmensa_client() as om_client:
                    return om_client.get_canteen(canteen_id)

            try:
                async with get_io_semaphore():
                    canteen = await anyio.to_thread.run_sync(_fetch_canteen)
                lat = getattr(canteen, "latitude", None)
                lng = getattr(canteen, "longitude", None)
                shared_cache.set(
                    cache_key,
                    {
                        "id": canteen_id,
                        "name": getattr(canteen, "name", None),
                        "city": getattr(canteen, "city", None),
                        "address": getattr(canteen, "address", None),
                        "lat": lat,
                        "lng": lng,
                    },
                    ttl_s=CACHE_TTL_CANTEEN_INFO_S,
                )
            except OpenMensaAPIError as exc:
                _record_tool_error(
                    tool_trace=tool_trace,
                    tool_traces=tool_traces,
                    messages=messages,
                    call_id=call_id,
                    tool_name=tool_name,
                    error=f"Failed to resolve canteen {canteen_id}: {exc}",
                )
                return None

    if lat is None or lng is None:
        _record_tool_error(
            tool_trace=tool_trace,
            tool_traces=tool_traces,
            messages=messages,
            call_id=call_id,
            tool_name=tool_name,
            error="Canteen coordinates unavailable",
        )
        return None

    logger.info("Directions request tool triggered with prompt: %s (lat=%s, lng=%s)", prompt_text, lat, lng)
    tool_trace.ok = True
    tool_trace.result = {
        "needs_directions": True,
        "prompt": prompt_text,
        "lat": lat,
        "lng": lng,
    }
    tool_traces.append(tool_trace)
    return ChatResponse(
        status="needs_directions",
        prompt=prompt_text,
        lat=lat,
        lng=lng,
        tool_calls=(tool_traces or None) if include_tool_calls else None,
    )


def _append_tool_guidance(messages: List[Dict[str, Any]], result_payload: Dict[str, Any], lang: str = DEFAULT_LANGUAGE) -> None:
    if settings.llm_supports_tool_messages:
        return

    if not (isinstance(result_payload, dict) and "error" in result_payload):
        messages.append(
            {
                "role": "system",
                "content": get_string("tool_guidance_success", lang),
            }
        )
    else:
        messages.append(
            {
                "role": "system",
                "content": get_string("tool_guidance_error", lang),
            }
        )


MENU_TOOL_NAMES = frozenset({"get_menu_for_date", "get_menus_batch"})


def _apply_filters_to_menu_args(args: dict, user_filters: UserFilters) -> dict:
    """Override diet_filter, exclude_allergens and price_category in menu tool call arguments based on user filters."""
    if user_filters.diet:
        mapped = DIET_PREFERENCE_TO_FILTER.get(user_filters.diet)
        if mapped:
            args["diet_filter"] = mapped

    if user_filters.allergens:
        args["exclude_allergens"] = list(user_filters.allergens)

    if user_filters.price_category:
        args["price_category"] = user_filters.price_category

    return args


def _apply_filters_to_batch_args(args: dict, user_filters: UserFilters) -> dict:
    """Override diet_filter and exclude_allergens in each request of a get_menus_batch call."""
    requests = args.get("requests")
    if isinstance(requests, list):
        for req in requests:
            if isinstance(req, dict):
                _apply_filters_to_menu_args(req, user_filters)
    return args


async def _handle_mcp_tool(
    *,
    tool_name: str,
    args: Any,
    tool_trace: ToolCallTrace,
    tool_traces: list[ToolCallTrace],
    messages: List[Dict[str, Any]],
    call_id: str | None,
    user_filters: UserFilters | None = None,
    lang: str = DEFAULT_LANGUAGE,
) -> None:
    if args is None:
        args = {}

    if not isinstance(args, dict):
        _record_tool_error(
            tool_trace=tool_trace,
            tool_traces=tool_traces,
            messages=messages,
            call_id=call_id,
            tool_name=tool_name,
            error="Tool arguments must be a JSON object",
        )
        return

    if user_filters and tool_name in MENU_TOOL_NAMES:
        if tool_name == "get_menus_batch":
            args = _apply_filters_to_batch_args(args, user_filters)
        else:
            args = _apply_filters_to_menu_args(args, user_filters)
        tool_trace.args = args

    result_payload = await call_mcp_tool(tool_name, args)
    if isinstance(result_payload, dict) and "error" in result_payload:
        tool_trace.ok = False
        tool_trace.error = result_payload.get("error")
    elif isinstance(result_payload, dict) and result_payload.get("ok") is True:
        tool_trace.ok = True
        tool_trace.result = result_payload.get("result")
    else:
        tool_trace.result = result_payload
    tool_traces.append(tool_trace)

    _append_tool_message(messages, call_id, tool_name, result_payload)
    _append_tool_guidance(messages, result_payload, lang)


async def handle_tool_calls(
    tool_calls: list[Any],
    messages: List[Dict[str, Any]],
    tool_traces: list[ToolCallTrace],
    *,
    iteration: int,
    include_tool_calls: bool,
    user_filters: UserFilters | None = None,
    language: str = DEFAULT_LANGUAGE,
) -> ChatResponse | None:
    for call in tool_calls:
        parsed = _parse_tool_call(call)
        tool_trace = ToolCallTrace(id=parsed.call_id, name=parsed.tool_name, iteration=iteration)

        args, skip = _parse_tool_args(
            raw_args=parsed.raw_args,
            call_id=parsed.call_id,
            tool_name=parsed.tool_name,
            tool_trace=tool_trace,
            tool_traces=tool_traces,
            messages=messages,
        )
        if skip:
            continue

        tool_trace.args = args

        if parsed.tool_name == LOCATION_TOOL_NAME:
            return _handle_location_tool(
                args=args,
                tool_trace=tool_trace,
                tool_traces=tool_traces,
                include_tool_calls=include_tool_calls,
                lang=language,
            )

        if parsed.tool_name == DIRECTIONS_TOOL_NAME:
            response = await _handle_directions_tool(
                args=args,
                tool_trace=tool_trace,
                tool_traces=tool_traces,
                messages=messages,
                call_id=parsed.call_id,
                tool_name=parsed.tool_name,
                include_tool_calls=include_tool_calls,
                lang=language,
            )
            if response is not None:
                return response
            continue

        await _handle_mcp_tool(
            tool_name=parsed.tool_name,
            args=args,
            tool_trace=tool_trace,
            tool_traces=tool_traces,
            messages=messages,
            call_id=parsed.call_id,
            user_filters=user_filters,
            lang=language,
        )

    return None
