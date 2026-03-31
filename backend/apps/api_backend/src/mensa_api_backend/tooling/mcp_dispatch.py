import json
from typing import Any, Dict, List

from fastmcp import Client as MCPClient

from mensa_mcp_server import mcp

from ..logging import logger
from ..models import ToolCallTrace
from ..streaming import ChatProgressSink, await_with_heartbeat
from .parsing import append_tool_message, record_tool_error, unwrap_tool_result


async def call_mcp_tool(tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    logger.info("Tool %s called with args %s.", tool_name, args)
    async with MCPClient(mcp) as mcp_client:
        try:
            response = await mcp_client.call_tool(tool_name, args)
            data = unwrap_tool_result(response)
            logger.debug("Got tool response: %s", json.dumps(data, indent=2))
            return {"ok": True, "tool": tool_name, "args": args, "result": data}
        except Exception as exc:
            logger.exception("Error calling tool %s with args %s", tool_name, args)
            return {"error": f"Failed to call MCP tool '{tool_name}': {str(exc)}"}


async def handle_mcp_tool(*, tool_name: str, args: Any, tool_trace: ToolCallTrace, tool_traces: list[ToolCallTrace], messages: List[Dict[str, Any]], call_id: str | None, iteration: int, progress_sink: ChatProgressSink) -> None:
    if args is None:
        args = {}
    if not isinstance(args, dict):
        record_tool_error(tool_trace=tool_trace, tool_traces=tool_traces, messages=messages, call_id=call_id, tool_name=tool_name, error="Tool arguments must be a JSON object")
        return
    result_payload = await await_with_heartbeat(call_mcp_tool(tool_name, args), progress_sink, phase="executing_tools", iteration=iteration)
    if isinstance(result_payload, dict) and "error" in result_payload:
        tool_trace.ok = False
        tool_trace.error = result_payload.get("error")
    elif isinstance(result_payload, dict) and result_payload.get("ok") is True:
        tool_trace.ok = True
        tool_trace.result = result_payload.get("result")
    else:
        tool_trace.result = result_payload
    tool_traces.append(tool_trace)
    append_tool_message(messages, call_id, tool_name, result_payload)
