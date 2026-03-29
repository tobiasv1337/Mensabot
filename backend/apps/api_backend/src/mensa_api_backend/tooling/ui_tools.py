from typing import Any, Dict, List

import anyio
from openmensa_sdk import OpenMensaAPIError

from mensa_mcp_server.cache import shared_cache
from mensa_mcp_server.cache_keys import openmensa_canteen_key
from mensa_mcp_server.server import make_openmensa_client
from mensa_mcp_server.settings import settings as mcp_settings

from ..concurrency import get_io_semaphore
from ..i18n import DEFAULT_LANGUAGE, get_string
from ..logging import logger
from ..models import ChatNeedsClarificationResponse, ChatNeedsDirectionsResponse, ChatNeedsLocationResponse, ChatResponse, ToolCallTrace
from .parsing import record_tool_error


def handle_location_tool(*, args: Any, tool_trace: ToolCallTrace, tool_traces: list[ToolCallTrace], include_tool_calls: bool, lang: str = DEFAULT_LANGUAGE) -> ChatResponse:
    prompt = args.get("prompt") if isinstance(args, dict) else None
    prompt_text = prompt if (isinstance(prompt, str) and prompt.strip()) else get_string("location_fallback_prompt", lang)
    logger.info("Location request tool triggered with prompt: %s", prompt_text)
    tool_trace.ok = True
    tool_trace.result = {"needs_location": True, "prompt": prompt_text}
    tool_traces.append(tool_trace)
    return ChatNeedsLocationResponse(prompt=prompt_text, tool_calls=(tool_traces or None) if include_tool_calls else None)


async def handle_directions_tool(*, args: Any, tool_trace: ToolCallTrace, tool_traces: list[ToolCallTrace], messages: List[Dict[str, Any]], call_id: str | None, tool_name: str, include_tool_calls: bool, lang: str = DEFAULT_LANGUAGE) -> ChatResponse | None:
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
        record_tool_error(tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=call_id, tool_name=tool_name, error=validation_error)
        return None
    if (lat is None) != (lng is None):
        record_tool_error(tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=call_id, tool_name=tool_name, error="lat and lng must be provided together")
        return None
    if canteen_id is None and (lat is None or lng is None):
        record_tool_error(tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=call_id, tool_name=tool_name, error="Provide canteen_id or lat/lng")
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
                shared_cache.set(cache_key, {"id": canteen_id, "name": getattr(canteen, "name", None), "city": getattr(canteen, "city", None), "address": getattr(canteen, "address", None), "lat": lat, "lng": lng}, ttl_s=mcp_settings.openmensa_canteen_info_cache_ttl_s)
            except OpenMensaAPIError as exc:
                record_tool_error(tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=call_id, tool_name=tool_name, error=f"Failed to resolve canteen {canteen_id}: {exc}")
                return None
    if lat is None or lng is None:
        record_tool_error(tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=call_id, tool_name=tool_name, error="Canteen coordinates unavailable")
        return None
    logger.info("Directions request tool triggered with prompt: %s (lat=%s, lng=%s)", prompt_text, lat, lng)
    tool_trace.ok = True
    tool_trace.result = {"needs_directions": True, "prompt": prompt_text, "lat": lat, "lng": lng}
    tool_traces.append(tool_trace)
    return ChatNeedsDirectionsResponse(prompt=prompt_text, lat=lat, lng=lng, tool_calls=(tool_traces or None) if include_tool_calls else None)


def handle_clarification_tool(*, args: Any, tool_trace: ToolCallTrace, tool_traces: list[ToolCallTrace], include_tool_calls: bool, lang: str = DEFAULT_LANGUAGE) -> ChatResponse:
    prompt = args.get("prompt") if isinstance(args, dict) else None
    prompt_text = prompt if (isinstance(prompt, str) and prompt.strip()) else get_string("clarification_fallback_prompt", lang)
    options = args.get("options") if isinstance(args, dict) else None
    if not isinstance(options, list) or len(options) < 1:
        options = []
    allow_none_raw = args.get("allow_none", True) if isinstance(args, dict) else True
    if isinstance(allow_none_raw, bool):
        allow_none = allow_none_raw
    elif isinstance(allow_none_raw, str):
        allow_none = allow_none_raw.strip().lower() not in {"false", "0", "no", "f", "off"}
    else:
        allow_none = True
    logger.info("Clarification request tool triggered with prompt: %s, options: %s", prompt_text, options)
    tool_trace.ok = True
    tool_trace.result = {"needs_clarification": True, "prompt": prompt_text, "options": options, "allow_none": allow_none}
    tool_traces.append(tool_trace)
    return ChatNeedsClarificationResponse(prompt=prompt_text, options=options, allow_none=allow_none, tool_calls=(tool_traces or None) if include_tool_calls else None)
