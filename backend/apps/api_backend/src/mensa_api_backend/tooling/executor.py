from typing import Any, Dict, List

from ..analytics import analytics_store, get_current_analytics_context
from ..i18n import DEFAULT_LANGUAGE
from ..models import InternalChatResponse, ToolCallTrace, UserFilters
from ..prompts import CLARIFICATION_TOOL_NAME, DIRECTIONS_TOOL_NAME, LOCATION_TOOL_NAME
from ..streaming import ChatProgressSink, NoOpChatProgressSink, build_trace_id
from .filter_policy import ResolvedUserFilters, validate_tool_filters
from .mcp_dispatch import handle_mcp_tool
from .parsing import parse_tool_args, parse_tool_call, record_tool_error
from .ui_tools import handle_clarification_tool, handle_directions_tool, handle_location_tool


async def handle_tool_calls(tool_calls: list[Any], messages: List[Dict[str, Any]], tool_traces: list[ToolCallTrace], *, iteration: int, include_tool_calls: bool, user_filters: UserFilters | None = None, language: str = DEFAULT_LANGUAGE, progress_sink: ChatProgressSink | None = None) -> InternalChatResponse | None:
    sink = progress_sink or NoOpChatProgressSink()
    analytics_context = get_current_analytics_context()
    resolved_filters = ResolvedUserFilters.from_user_filters(user_filters)
    for ordinal, call in enumerate(tool_calls, start=1):
        parsed = parse_tool_call(call)
        tool_trace = ToolCallTrace(id=parsed.call_id, name=parsed.tool_name, iteration=iteration)
        trace_id = build_trace_id(parsed.call_id, iteration, ordinal)
        args, skip = parse_tool_args(raw_args=parsed.raw_args, call_id=parsed.call_id, tool_name=parsed.tool_name, tool_trace=tool_trace, tool_traces=tool_traces, messages=messages)
        if skip:
            if tool_trace.ok is False:
                await sink.emit_tool_trace(trace_id=trace_id, state="error", trace=tool_trace.model_copy(deep=True))
                analytics_store.record_tool_call(
                    context=analytics_context,
                    tool_name=parsed.tool_name,
                    args=tool_trace.args if isinstance(tool_trace.args, dict) else None,
                    ok=False,
                    result={"error": tool_trace.error or "tool_arguments_invalid"},
                )
            continue
        tool_trace.args = args
        policy_error = validate_tool_filters(tool_name=parsed.tool_name, args=args, resolved_filters=resolved_filters)
        if policy_error is not None:
            record_tool_error(
                tool_trace=tool_trace,
                tool_traces=tool_traces,
                messages=messages,
                call_id=parsed.call_id,
                tool_name=parsed.tool_name,
                error=str(policy_error.get("error") or "Active UI filters blocked this tool call."),
                payload=policy_error,
            )
            await sink.emit_tool_trace(trace_id=trace_id, state="error", trace=tool_trace.model_copy(deep=True))
            analytics_store.record_tool_call(
                context=analytics_context,
                tool_name=parsed.tool_name,
                args=args if isinstance(args, dict) else None,
                ok=False,
                result={"error": tool_trace.error or "tool_blocked_by_filters"},
            )
            continue
        await sink.emit_tool_trace(trace_id=trace_id, state="started", trace=tool_trace.model_copy(deep=True))
        if parsed.tool_name == LOCATION_TOOL_NAME:
            response = handle_location_tool(args=args, tool_trace=tool_trace, tool_traces=tool_traces, include_tool_calls=include_tool_calls, lang=language)
            await sink.emit_tool_trace(trace_id=trace_id, state="completed", trace=tool_trace.model_copy(deep=True))
            analytics_store.record_tool_call(
                context=analytics_context,
                tool_name=parsed.tool_name,
                args=args if isinstance(args, dict) else None,
                ok=True,
                result=tool_trace.result,
            )
            return response
        if parsed.tool_name == DIRECTIONS_TOOL_NAME:
            response = await handle_directions_tool(args=args, tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=parsed.call_id, tool_name=parsed.tool_name, include_tool_calls=include_tool_calls, lang=language)
            if response is not None:
                await sink.emit_tool_trace(trace_id=trace_id, state="completed", trace=tool_trace.model_copy(deep=True))
                analytics_store.record_tool_call(
                    context=analytics_context,
                    tool_name=parsed.tool_name,
                    args=args if isinstance(args, dict) else None,
                    ok=True,
                    result=tool_trace.result,
                )
                return response
            if tool_trace.ok is False:
                await sink.emit_tool_trace(trace_id=trace_id, state="error", trace=tool_trace.model_copy(deep=True))
                analytics_store.record_tool_call(
                    context=analytics_context,
                    tool_name=parsed.tool_name,
                    args=args if isinstance(args, dict) else None,
                    ok=False,
                    result={"error": tool_trace.error or "directions_failed"},
                )
            continue
        if parsed.tool_name == CLARIFICATION_TOOL_NAME:
            response = handle_clarification_tool(args=args, tool_trace=tool_trace, tool_traces=tool_traces, include_tool_calls=include_tool_calls, lang=language)
            await sink.emit_tool_trace(trace_id=trace_id, state="completed", trace=tool_trace.model_copy(deep=True))
            analytics_store.record_tool_call(
                context=analytics_context,
                tool_name=parsed.tool_name,
                args=args if isinstance(args, dict) else None,
                ok=True,
                result=tool_trace.result,
            )
            return response
        await handle_mcp_tool(tool_name=parsed.tool_name, args=args, tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=parsed.call_id, iteration=iteration, progress_sink=sink)
        await sink.emit_tool_trace(trace_id=trace_id, state="error" if tool_trace.ok is False else "completed", trace=tool_trace.model_copy(deep=True))
        analytics_store.record_tool_call(
            context=analytics_context,
            tool_name=parsed.tool_name,
            args=args if isinstance(args, dict) else None,
            ok=tool_trace.ok is not False,
            result=tool_trace.result if tool_trace.ok is not False else {"error": tool_trace.error or "tool_failed"},
        )
    return None
