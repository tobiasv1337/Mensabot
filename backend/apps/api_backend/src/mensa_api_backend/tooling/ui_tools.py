from typing import Any, Dict, List, Literal

import anyio
from mensabot_backend_core.canteen_service import CanteenLookupError, CanteenNotFoundError, fetch_canteen_info

from ..concurrency import get_io_semaphore
from ..i18n import DEFAULT_LANGUAGE, get_string
from ..logging import logger
from ..models import InternalChatNeedsClarificationResponse, InternalChatNeedsDirectionsResponse, InternalChatNeedsLocationResponse, InternalChatResponse, ToolCallTrace
from .parsing import record_tool_error


def _parse_boolish(value: Any, *, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() not in {"false", "0", "no", "f", "off"}
    return default


def _parse_clarification_selection_mode(value: Any) -> Literal["single", "multi"]:
    return "multi" if isinstance(value, str) and value.strip().lower() == "multi" else "single"


def handle_location_tool(*, args: Any, tool_trace: ToolCallTrace, tool_traces: list[ToolCallTrace], include_tool_calls: bool, lang: str = DEFAULT_LANGUAGE) -> InternalChatResponse:
    prompt = args.get("prompt") if isinstance(args, dict) else None
    prompt_text = prompt if (isinstance(prompt, str) and prompt.strip()) else get_string("location_fallback_prompt", lang)
    logger.info("Location request tool triggered with prompt: %s", prompt_text)
    tool_trace.ok = True
    tool_trace.result = {"needs_location": True, "prompt": prompt_text}
    tool_traces.append(tool_trace)
    return InternalChatNeedsLocationResponse(prompt=prompt_text, tool_calls=(tool_traces or None) if include_tool_calls else None)


async def handle_directions_tool(*, args: Any, tool_trace: ToolCallTrace, tool_traces: list[ToolCallTrace], messages: List[Dict[str, Any]], call_id: str | None, tool_name: str, include_tool_calls: bool, lang: str = DEFAULT_LANGUAGE) -> InternalChatResponse | None:
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
        try:
            async with get_io_semaphore():
                canteen = await anyio.to_thread.run_sync(fetch_canteen_info, canteen_id)
            lat = canteen.lat
            lng = canteen.lng
        except (CanteenLookupError, CanteenNotFoundError) as exc:
            record_tool_error(tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=call_id, tool_name=tool_name, error=f"Failed to resolve canteen {canteen_id}: {exc}")
            return None
    if lat is None or lng is None:
        record_tool_error(tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=call_id, tool_name=tool_name, error="Canteen coordinates unavailable")
        return None
    logger.info("Directions request tool triggered with prompt: %s (lat=%s, lng=%s)", prompt_text, lat, lng)
    tool_trace.ok = True
    tool_trace.result = {"needs_directions": True, "prompt": prompt_text, "lat": lat, "lng": lng}
    tool_traces.append(tool_trace)
    return InternalChatNeedsDirectionsResponse(prompt=prompt_text, lat=lat, lng=lng, tool_calls=(tool_traces or None) if include_tool_calls else None)


def handle_clarification_tool(*, args: Any, tool_trace: ToolCallTrace, tool_traces: list[ToolCallTrace], include_tool_calls: bool, lang: str = DEFAULT_LANGUAGE) -> InternalChatResponse:
    prompt = args.get("prompt") if isinstance(args, dict) else None
    prompt_text = prompt if (isinstance(prompt, str) and prompt.strip()) else get_string("clarification_fallback_prompt", lang)
    options = args.get("options") if isinstance(args, dict) else None
    if isinstance(options, list):
        options = [str(option).strip() for option in options if str(option).strip()]
    else:
        options = []
    selection_mode_raw = args.get("selection_mode", "single") if isinstance(args, dict) else "single"
    selection_mode = _parse_clarification_selection_mode(selection_mode_raw)
    allow_no_match_raw = args.get("allow_no_match", True) if isinstance(args, dict) else True
    allow_no_match = _parse_boolish(allow_no_match_raw, default=True)
    logger.info("Clarification request tool triggered with prompt: %s, options: %s, selection_mode: %s, allow_no_match: %s", prompt_text, options, selection_mode, allow_no_match)
    tool_trace.ok = True
    tool_trace.result = {"needs_clarification": True, "prompt": prompt_text, "options": options, "selection_mode": selection_mode, "allow_no_match": allow_no_match}
    tool_traces.append(tool_trace)
    return InternalChatNeedsClarificationResponse(prompt=prompt_text, options=options, selection_mode=selection_mode, allow_no_match=allow_no_match, tool_calls=(tool_traces or None) if include_tool_calls else None)
