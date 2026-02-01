import asyncio
import json
from typing import Any, Dict, List, Literal

from fastmcp import Client as MCPClient
from openai import OpenAI, RateLimitError
from openai.types.chat import ChatCompletion, ChatCompletionMessage
from openmensa_sdk import OpenMensaAPIError

from mensa_mcp_server import mcp
from mensa_mcp_server.server import make_openmensa_client

from ..config import settings
from ..logging import logger
from ..models import ChatMessage, ChatResponse, ToolCallTrace
from ..prompts import (
    DIRECTIONS_FALLBACK_PROMPT,
    DIRECTIONS_TOOL_NAME,
    EMPTY_REPLY_NUDGE,
    LLM_BASE_SYSTEM_PROMPT,
    LOCATION_FALLBACK_PROMPT,
    LOCATION_TOOL_NAME,
    MISSING_TOOL_CALLS_NUDGE,
)
from ..services.time_context import get_time_context


client = OpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)


def sanitize_message(msg):
    if isinstance(msg, dict):
        d = dict(msg)
    else:
        d = msg.model_dump()

    role = d.get("role")

    if role == "assistant":
        allowed = {"role", "content", "tool_calls"}
    elif role == "tool":
        allowed = {"role", "tool_call_id", "name", "content"}
    elif role in ("user", "system"):
        allowed = {"role", "content", "name"}
    else:
        allowed = set(d.keys())

    return {k: v for k, v in d.items() if k in allowed and v is not None}


def try_repair_json(s: str) -> str:
    t = s.strip()

    if t.startswith("{") and not t.endswith("}"):
        t += "}" * (t.count("{") - t.count("}"))

    if t.startswith("[") and not t.endswith("]"):
        t += "]" * (t.count("[") - t.count("]"))

    return t.replace(",}", "}").replace(",]", "]")


async def create_chat_completion_with_retry(messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> ChatCompletion:
    """Call the chat completion API with simple exponential (capped) backoff on rate limits."""
    last_error: Exception | None = None
    for attempt in range(1, settings.llm_max_retries + 1):
        try:
            return client.chat.completions.create(
                model=settings.llm_model,
                messages=[sanitize_message(m) for m in messages],
                tools=tools,
                tool_choice="auto",
                stream=False,
            )
        except RateLimitError as err:
            last_error = err
            retry_after = None
            headers = getattr(err, "headers", None)
            if isinstance(headers, dict):
                retry_after = headers.get("Retry-After")

            delay = settings.llm_retry_base_delay * (2 ** (attempt - 1))
            if retry_after is not None:
                try:
                    delay = float(retry_after)
                except (TypeError, ValueError):
                    logger.warning("Retry-After header unparsable (%s); using backoff delay %.2fs", retry_after, delay)
            delay = min(delay, settings.llm_retry_max_delay)
            if attempt >= settings.llm_max_retries:
                break
            logger.warning(
                "Rate limit hit (attempt %d/%d). Retrying in %.2fs.\nError: %s",
                attempt,
                settings.llm_max_retries,
                delay,
                last_error,
            )
            await asyncio.sleep(delay)
        except Exception:
            raise

    # If we exhausted retries, re-raise the last rate limit error.
    if last_error:
        raise last_error
    raise RuntimeError("Unexpected: no completion and no last_error recorded")


def ensure_message_content(message: Any, finish_reason: str) -> str:
    """Return textual assistant content or fall back to a generic apology."""
    content = getattr(message, "content", None)
    if isinstance(content, str) and content.strip():
        return content
    logger.warning("LLM response missing usable content (finish_reason=%s). Returning fallback message.", finish_reason)
    return settings.llm_fallback_response


async def get_openai_tools_from_mcp() -> List[Dict[str, Any]]:
    """
    Fetch tool definitions from the MCP server and convert them to OpenAI tool format.
    Returns:
        List[Dict[str, Any]]: List of tool definitions in OpenAI function calling format.
        Each tool has the structure: {"type": "function", "function": {...}}
    """
    async with MCPClient(mcp) as mcp_client:
        raw_tools = await mcp_client.list_tools()
        tool_list = list(raw_tools)

        openai_tools = []

        for tool in tool_list:
            name = getattr(tool, "name", None)
            description = getattr(tool, "description", "")
            parameters = getattr(tool, "inputSchema", None)
            if not name or not parameters:
                logger.warning(
                    "Tool is missing name or inputSchema. Name: %s, has parameters: %s\n Tool: %s.\nSkipping this tool.",
                    name,
                    parameters is not None,
                    tool,
                )
                continue

            openai_tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": name,
                        "description": description,
                        "parameters": parameters,
                    },
                }
            )
        return openai_tools


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


def format_message_history(messages: List[ChatMessage], format: Literal["openai"] = "openai") -> List[ChatCompletionMessage]:
    if format == "openai":
        formatted_messages: List[ChatCompletionMessage] = [*messages]
    else:
        raise ValueError(f"Unsupported target message format: {format}")

    return formatted_messages


def prepare_message_log(message_log: List[ChatMessage]) -> List[ChatCompletionMessage]:
    """Format the message log (history + current request) into the format required by the LLM."""
    return [
        {
            "role": "system",
            "content": LLM_BASE_SYSTEM_PROMPT,
        },
        get_time_context(),
        *format_message_history(message_log),
    ]


async def run_tool_calling_loop(message_log: List[ChatMessage], include_tool_calls: bool = False) -> ChatResponse:
    messages = prepare_message_log(message_log)

    tools = await get_openai_tools_from_mcp()
    logger.debug("OpenAI tools fetched from MCP: %s", json.dumps(tools, indent=2))
    tool_traces: list[ToolCallTrace] = []
    for iteration in range(1, settings.max_llm_iterations + 1):
        try:
            completion = await create_chat_completion_with_retry(messages=messages, tools=tools)
        except RateLimitError as e:
            logger.error("LLM completion failed after retry logic due to rate limit: %s", str(e))
            return ChatResponse(
                status="ok",
                reply=settings.llm_fallback_response,
                tool_calls=(tool_traces or None) if include_tool_calls else None,
            )

        if not getattr(completion, "choices", None):
            try:
                dumped = completion.model_dump()
            except Exception:
                dumped = repr(completion)
            logger.error("LLM completion has no choices: %s", dumped)
            raise RuntimeError("LLM returned no choices; check upstream LLM/Proxy configuration")

        logger.debug("Received completion: %s", completion.model_dump())
        choice = completion.choices[0]
        finish_reason = choice.finish_reason
        message = choice.message

        tool_calls = getattr(message, "tool_calls", None) or []
        if tool_calls and finish_reason != "tool_calls":
            logger.warning("Overriding finish_reason=%s -> tool_calls because tool_calls are present.", finish_reason)
            finish_reason = "tool_calls"

        if finish_reason != "tool_calls":
            content = getattr(message, "content", None)
            if isinstance(content, str) and content.strip():
                logger.info(
                    "Final response returned after %d iterations: %s",
                    iteration,
                    json.dumps(message.model_dump(), indent=2),
                )
                return ChatResponse(
                    status="ok",
                    reply=content,
                    tool_calls=(tool_traces or None) if include_tool_calls else None,
                )

            # Empty content: don't immediately fallback; nudge and keep the loop going.
            logger.warning(
                "LLM returned empty assistant content (finish_reason=%s) on iteration %d; nudging and retrying.",
                finish_reason,
                iteration,
            )
            messages.append({"role": "system", "content": EMPTY_REPLY_NUDGE})
            continue

        if not tool_calls:
            # finish_reason claims tool calls, but none were provided. Nudge and retry.
            logger.warning(
                "LLM reported finish_reason=tool_calls but provided no tool_calls on iteration %d; nudging and retrying.",
                iteration,
            )
            messages.append({"role": "system", "content": MISSING_TOOL_CALLS_NUDGE})
            continue

        if settings.llm_supports_tool_messages:
            messages.append(sanitize_message(message))

        logger.info("Number of tool calls: %d", len(tool_calls))
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
                    try:
                        with make_openmensa_client() as om_client:
                            canteen = om_client.get_canteen(canteen_id)
                        lat = getattr(canteen, "latitude", None)
                        lng = getattr(canteen, "longitude", None)
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

    logger.warning(
        "Max LLM iterations (%d) reached without obtaining a final response. Returning fallback message.",
        settings.max_llm_iterations,
    )
    return ChatResponse(
        status="ok",
        reply=settings.llm_fallback_response,
        tool_calls=(tool_traces or None) if include_tool_calls else None,
    )
