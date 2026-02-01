import json
from typing import Any, Dict, List

from fastmcp import Client as MCPClient
from openmensa_sdk import OpenMensaAPIError

from mensa_mcp_server import mcp
from mensa_mcp_server.cache import shared_cache
from mensa_mcp_server.cache_keys import openmensa_canteen_key
from mensa_mcp_server.server import make_openmensa_client

from ..config import settings
from ..logging import logger
from ..models import ChatResponse, ToolCallTrace
from ..prompts import (
    DIRECTIONS_FALLBACK_PROMPT,
    DIRECTIONS_TOOL_NAME,
    LOCATION_FALLBACK_PROMPT,
    LOCATION_TOOL_NAME,
)

CACHE_TTL_CANTEEN_INFO_S = 60 * 60 * 24


def try_repair_json(s: str) -> str:
    t = s.strip()

    if t.startswith("{") and not t.endswith("}"):
        t += "}" * (t.count("{") - t.count("}"))

    if t.startswith("[") and not t.endswith("]"):
        t += "]" * (t.count("[") - t.count("]"))

    return t.replace(",}", "}").replace(",]", "]")


def unwrap_tool_result(resp: Any) -> Any:
    """
    Convert FastMCP tool result into plain Python data for the LLM.
    """
    if getattr(resp, "structured_content", None) is not None:
        return resp.structured_content
    if getattr(resp, "model_dump", None) is not None:
        return resp.model_dump()
    return resp


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


async def handle_tool_calls(
    tool_calls: list[Any],
    messages: List[Dict[str, Any]],
    tool_traces: list[ToolCallTrace],
    *,
    iteration: int,
    include_tool_calls: bool,
) -> ChatResponse | None:
    for call in tool_calls:
        # Extract tool name and arguments
        func = getattr(call, "function", None)
        if func is not None:
            tool_name = getattr(func, "name", None) or getattr(call, "name", None)
            raw_args = getattr(func, "arguments", None)
        else:
            tool_name = getattr(call, "name", None)
            raw_args = getattr(call, "arguments", None)

        if tool_name is None:
            tool_name = "<unknown_tool>"

        tool_trace = ToolCallTrace(id=call.id, name=tool_name, iteration=iteration)

        # Parse arguments: if already a dict/list, use as-is; if a string, try JSON decode
        args = None
        if isinstance(raw_args, (dict, list)):
            args = raw_args
        elif isinstance(raw_args, str):
            try:
                args = json.loads(raw_args)
            except json.JSONDecodeError:
                try:
                    args = json.loads(try_repair_json(raw_args))
                    logger.warning(
                        "Tool %s called with MALFORMED JSON arguments, but repair succeeded: %s",
                        tool_name,
                        raw_args,
                    )
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
                            "tool_call_id": call.id,
                            "name": tool_name,
                            "content": f"Invalid JSON arguments: {e}",
                        }
                    )
                    continue
        else:
            # Unknown argument shape
            tool_trace.raw_args = raw_args
            tool_trace.ok = False
            tool_trace.error = "Tool call arguments missing or in an unsupported format"
            tool_traces.append(tool_trace)
            result_payload = {"error": tool_trace.error}
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "name": tool_name,
                    "content": json.dumps(result_payload),
                }
            )
            continue

        tool_trace.args = args

        if tool_name == LOCATION_TOOL_NAME:
            prompt = args.get("prompt") if isinstance(args, dict) else None
            prompt_text = prompt or LOCATION_FALLBACK_PROMPT
            logger.info("Location request tool triggered with prompt: %s", prompt_text)
            tool_trace.ok = True
            tool_trace.result = {"needs_location": True, "prompt": prompt_text}
            tool_traces.append(tool_trace)
            return ChatResponse(
                status="needs_location",
                prompt=prompt_text,
                tool_calls=(tool_traces or None) if include_tool_calls else None,
            )

        if tool_name == DIRECTIONS_TOOL_NAME:
            args_dict = args if isinstance(args, dict) else {}
            prompt = args_dict.get("prompt")
            prompt_text = prompt or DIRECTIONS_FALLBACK_PROMPT
            
            raw_canteen_id = args_dict.get("canteen_id")
            raw_lat = args_dict.get("lat")
            raw_lng = args_dict.get("lng")
            
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

            if not validation_error and canteen_id is None and lat is None:
                validation_error = "Provide canteen_id or lat/lng"

            if validation_error:
                tool_trace.ok = False
                tool_trace.error = validation_error
                tool_traces.append(tool_trace)
                result_payload = {"error": tool_trace.error}
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.id,
                        "name": tool_name,
                        "content": json.dumps(result_payload),
                    }
                )
                continue

            if canteen_id is not None and lat is None and lng is None:
                cache_key = openmensa_canteen_key(canteen_id)
                cached = shared_cache.get(cache_key)
                if cached is not None:
                    lat = cached.get("lat")
                    lng = cached.get("lng")

                if lat is None or lng is None:
                    try:
                        with make_openmensa_client() as om_client:
                            canteen = om_client.get_canteen(canteen_id)
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
                        tool_trace.ok = False
                        tool_trace.error = f"Failed to resolve canteen {canteen_id}: {exc}"
                        tool_traces.append(tool_trace)
                        result_payload = {"error": tool_trace.error}
                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": call.id,
                                "name": tool_name,
                                "content": json.dumps(result_payload),
                            }
                        )
                        continue
                    except Exception as exc:
                        tool_trace.ok = False
                        tool_trace.error = f"Unexpected error while resolving canteen {canteen_id}: {exc}"
                        tool_traces.append(tool_trace)
                        result_payload = {"error": tool_trace.error}
                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": call.id,
                                "name": tool_name,
                                "content": json.dumps(result_payload),
                            }
                        )
                        continue

            if lat is None or lng is None:
                tool_trace.ok = False
                tool_trace.error = "Canteen coordinates unavailable"
                tool_traces.append(tool_trace)
                result_payload = {"error": tool_trace.error}
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.id,
                        "name": tool_name,
                        "content": json.dumps(result_payload),
                    }
                )
                continue

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

        # Delegate to MCP: allow no-argument tool calls by treating None as {}
        if args is None:
            args = {}

        if not isinstance(args, dict):
            tool_trace.ok = False
            tool_trace.error = "Tool arguments must be a JSON object"
            tool_traces.append(tool_trace)
            result_payload = {"error": tool_trace.error}
        else:
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

        messages.append(
            {
                "role": "tool",
                "tool_call_id": call.id,
                "name": tool_name,
                "content": json.dumps(result_payload),
            }
        )

        if not settings.llm_supports_tool_messages:
            if not (isinstance(result_payload, dict) and "error" in result_payload):
                messages.append(
                    {
                        "role": "system",
                        "content": (
                            "You have just successfully received the tool results you requested as a JSON object."
                            "You can assume these tool results to be 100% correct and accurate."
                            "You don't need to validate them and can fully trust them to answer the user query."
                            "Now either make further tool calls if needed, or answer the user based on the tool results."
                        ),
                    }
                )
            else:
                messages.append(
                    {
                        "role": "system",
                        "content": (
                            "The previous tool call failed and did NOT provide useful data. "
                            "You should not rely on this tool result. "
                            "Either try to call another tool to get the information you need, or if no suitable tool is available, either admit you don't know the answer or try to answer based on your internal knowledge, clearly stating that this is just your guess and may be outdated or incorrect."
                        ),
                    }
                )

    return None
