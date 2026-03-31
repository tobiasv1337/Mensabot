import json
from dataclasses import dataclass
from typing import Any, Dict, List

from ..logging import logger
from ..models import ToolCallTrace


@dataclass
class ParsedToolCall:
    call_id: str | None
    tool_name: str
    raw_args: Any


def _normalize_tool_arg_value(value: Any) -> Any:
    if isinstance(value, str):
        stripped = value.strip()
        stripped_lower = stripped.lower()
        if stripped_lower in {"null", "none"}:
            return None
        if (stripped.startswith("[") and stripped.endswith("]")) or (stripped.startswith("{") and stripped.endswith("}")):
            try:
                parsed = json.loads(stripped)
                if isinstance(parsed, (list, dict)):
                    return _normalize_tool_arg_value(parsed)
            except json.JSONDecodeError:
                pass
        return value
    if isinstance(value, list):
        return [_normalize_tool_arg_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_tool_arg_value(item) for key, item in value.items()}
    return value


def normalize_tool_args(args: Any) -> Any:
    return _normalize_tool_arg_value(args)


def try_repair_json(raw: str) -> str:
    repaired = raw.strip()
    if repaired.startswith("{") and not repaired.endswith("}"):
        repaired += "}" * (repaired.count("{") - repaired.count("}"))
    if repaired.startswith("[") and not repaired.endswith("]"):
        repaired += "]" * (repaired.count("[") - repaired.count("]"))
    return repaired.replace(",}", "}").replace(",]", "]")


def unwrap_tool_result(response: Any) -> Any:
    if getattr(response, "structured_content", None) is not None:
        return response.structured_content
    if getattr(response, "model_dump", None) is not None:
        return response.model_dump()
    return response


def parse_tool_call(call: Any) -> ParsedToolCall:
    func = getattr(call, "function", None)
    if func is not None:
        tool_name = getattr(func, "name", None) or getattr(call, "name", None)
        raw_args = getattr(func, "arguments", None)
    else:
        tool_name = getattr(call, "name", None)
        raw_args = getattr(call, "arguments", None)
    return ParsedToolCall(call_id=call.id, tool_name=tool_name or "<unknown_tool>", raw_args=raw_args)


def append_tool_message(messages: List[Dict[str, Any]], call_id: str | None, tool_name: str, payload: Dict[str, Any]) -> None:
    messages.append({"role": "tool", "tool_call_id": call_id, "name": tool_name, "content": json.dumps(payload)})


def record_tool_error(*, tool_trace: ToolCallTrace, tool_traces: list[ToolCallTrace], messages: List[Dict[str, Any]], call_id: str | None, tool_name: str, error: str, payload: Dict[str, Any] | None = None) -> None:
    tool_trace.ok = False
    tool_trace.error = error
    if payload is not None:
        tool_trace.result = payload
    tool_traces.append(tool_trace)
    append_tool_message(messages, call_id, tool_name, payload or {"error": error})


def patch_invalid_tool_call(messages: List[Dict[str, Any]], call_id: str | None) -> None:
    for message in reversed(messages):
        if message.get("role") != "assistant" or "tool_calls" not in message:
            continue
        for tool_call in message.get("tool_calls", []):
            if tool_call.get("id") == call_id and "function" in tool_call:
                tool_call["function"]["arguments"] = '{"_error": "patched_invalid_json_by_server"}'
        break


def parse_tool_args(*, raw_args: Any, call_id: str | None, tool_name: str, tool_trace: ToolCallTrace, tool_traces: list[ToolCallTrace], messages: List[Dict[str, Any]]) -> tuple[Any | None, bool]:
    if isinstance(raw_args, (dict, list)):
        return normalize_tool_args(raw_args), False
    if isinstance(raw_args, str):
        try:
            return normalize_tool_args(json.loads(raw_args)), False
        except json.JSONDecodeError:
            try:
                repaired = normalize_tool_args(json.loads(try_repair_json(raw_args)))
                logger.warning("Tool %s called with MALFORMED JSON arguments, but repair succeeded: %s", tool_name, raw_args)
                return repaired, False
            except json.JSONDecodeError as exc:
                logger.error("Tool %s called with INVALID JSON arguments: %s\n%s", tool_name, raw_args, exc)
                tool_trace.raw_args = raw_args
                record_tool_error(tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=call_id, tool_name=tool_name, error=f"Invalid JSON arguments: {exc}")
                patch_invalid_tool_call(messages, call_id)
                return None, True
    tool_trace.raw_args = raw_args
    record_tool_error(tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=call_id, tool_name=tool_name, error="Tool call arguments missing or in an unsupported format")
    patch_invalid_tool_call(messages, call_id)
    return None, True
