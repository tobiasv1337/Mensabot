import asyncio
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Literal

from openai import AsyncOpenAI, RateLimitError
from openai.types.chat import ChatCompletion, ChatCompletionMessage

from ..config import settings
from ..concurrency import get_llm_semaphore
from ..logging import logger
from ..models import ChatMessage, ChatResponse, ToolCallTrace, UserFilters
from ..prompts import EMPTY_REPLY_NUDGE, LLM_BASE_SYSTEM_PROMPT, MISSING_TOOL_CALLS_NUDGE, build_user_filters_prompt
from ..services.time_context import get_time_context
from .executor import handle_tool_calls
from .registry import get_openai_tools_from_mcp


client = AsyncOpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)


@dataclass
class LoopDecision:
    response: ChatResponse | None
    continue_loop: bool


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


async def create_chat_completion_with_retry(messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> ChatCompletion:
    """Call the chat completion API with simple exponential (capped) backoff on rate limits."""
    last_error: Exception | None = None
    for attempt in range(1, settings.llm_max_retries + 1):
        try:
            async with get_llm_semaphore():
                return await client.chat.completions.create(
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


def format_message_history(messages: List[ChatMessage], format: Literal["openai"] = "openai") -> List[ChatCompletionMessage]:
    if format == "openai":
        formatted_messages: List[ChatCompletionMessage] = [*messages]
    else:
        raise ValueError(f"Unsupported target message format: {format}")

    return formatted_messages


def prepare_message_log(message_log: List[ChatMessage], user_filters: UserFilters | None = None) -> List[ChatCompletionMessage]:
    """Format the message log (history + current request) into the format required by the LLM."""
    system_messages = [
        {
            "role": "system",
            "content": LLM_BASE_SYSTEM_PROMPT,
        },
        get_time_context(),
    ]

    filters_prompt = build_user_filters_prompt(user_filters)
    if filters_prompt:
        system_messages.append({"role": "system", "content": filters_prompt})

    return [
        *system_messages,
        *format_message_history(message_log),
    ]


def _build_chat_response(
    reply: str,
    tool_traces: list[ToolCallTrace],
    include_tool_calls: bool,
) -> ChatResponse:
    return ChatResponse(
        status="ok",
        reply=reply,
        tool_calls=(tool_traces or None) if include_tool_calls else None,
    )


def _get_first_choice(completion: ChatCompletion):
    if not getattr(completion, "choices", None):
        try:
            dumped = completion.model_dump()
        except Exception:
            dumped = repr(completion)
        logger.error("LLM completion has no choices: %s", dumped)
        raise RuntimeError("LLM returned no choices; check upstream LLM/Proxy configuration")
    return completion.choices[0]


def _extract_tool_calls(choice) -> tuple[str, Any, list[Any]]:
    finish_reason = choice.finish_reason
    message = choice.message
    tool_calls = getattr(message, "tool_calls", None) or []

    if tool_calls and finish_reason != "tool_calls":
        logger.warning("Overriding finish_reason=%s -> tool_calls because tool_calls are present.", finish_reason)
        finish_reason = "tool_calls"

    return finish_reason, message, tool_calls


def _handle_non_tool_completion(
    *,
    message: Any,
    finish_reason: str,
    iteration: int,
    messages: list[Dict[str, Any]],
    tool_traces: list[ToolCallTrace],
    include_tool_calls: bool,
) -> LoopDecision:
    content = getattr(message, "content", None)
    if isinstance(content, str) and content.strip():
        logger.info(
            "Final response returned after %d iterations: %s",
            iteration,
            json.dumps(message.model_dump(), indent=2),
        )
        return LoopDecision(
            response=_build_chat_response(content, tool_traces, include_tool_calls),
            continue_loop=False,
        )

    logger.warning(
        "LLM returned empty assistant content (finish_reason=%s) on iteration %d; nudging and retrying.",
        finish_reason,
        iteration,
    )
    messages.append({"role": "system", "content": EMPTY_REPLY_NUDGE})
    return LoopDecision(response=None, continue_loop=True)


def _nudge_missing_tool_calls(iteration: int, messages: list[Dict[str, Any]]) -> None:
    logger.warning(
        "LLM reported finish_reason=tool_calls but provided no tool_calls on iteration %d; nudging and retrying.",
        iteration,
    )
    messages.append({"role": "system", "content": MISSING_TOOL_CALLS_NUDGE})


DIET_ALLERGEN_WARNING = (
    "\n\n> ⚠️ **Warning:** We cannot guarantee the correctness of any diet type or allergen filtering "
    "in the generated responses. Please double check before consuming."
)


def _has_diet_or_allergen_context(user_filters: UserFilters | None, tool_traces: list[ToolCallTrace]) -> bool:
    """Return True when the response involves diet/allergen filtering that warrants a disclaimer."""
    for trace in tool_traces:
        args = trace.args
        if not isinstance(args, dict):
            continue
        diet = args.get("diet_filter")
        if diet and diet != "all":
            return True
        if args.get("exclude_allergens"):
            return True
        # Check nested batch requests
        requests = args.get("requests")
        if isinstance(requests, list):
            for req in requests:
                if not isinstance(req, dict):
                    continue
                if req.get("diet_filter") and req["diet_filter"] != "all":
                    return True
                if req.get("exclude_allergens"):
                    return True
    return False


def _maybe_append_filter_warning(response: ChatResponse, user_filters: UserFilters | None, tool_traces: list[ToolCallTrace]) -> ChatResponse:
    """Append a filter disclaimer to the reply when diet/allergen filtering was involved."""
    if response.status != "ok":
        return response
    if not response.reply:
        return response
    if not _has_diet_or_allergen_context(user_filters, tool_traces):
        return response
    response.reply = response.reply.rstrip() + DIET_ALLERGEN_WARNING
    return response


async def run_tool_calling_loop(message_log: List[ChatMessage], include_tool_calls: bool = False, user_filters: UserFilters | None = None) -> ChatResponse:
    response, tool_traces = await _run_tool_calling_loop_inner(message_log, include_tool_calls, user_filters)
    return _maybe_append_filter_warning(response, user_filters, tool_traces)


async def _run_tool_calling_loop_inner(message_log: List[ChatMessage], include_tool_calls: bool = False, user_filters: UserFilters | None = None) -> tuple[ChatResponse, list[ToolCallTrace]]:
    messages = prepare_message_log(message_log, user_filters)
    tools = await get_openai_tools_from_mcp()
    logger.debug("OpenAI tools fetched from MCP: %s", json.dumps(tools, indent=2))

    tool_traces: list[ToolCallTrace] = []
    for iteration in range(1, settings.max_llm_iterations + 1):
        try:
            completion = await create_chat_completion_with_retry(messages=messages, tools=tools)
        except RateLimitError as e:
            logger.error("LLM completion failed after retry logic due to rate limit: %s", str(e))
            return _build_chat_response(settings.llm_fallback_response, tool_traces, include_tool_calls), tool_traces

        logger.debug("Received completion: %s", completion.model_dump())
        choice = _get_first_choice(completion)
        finish_reason, message, tool_calls = _extract_tool_calls(choice)

        if finish_reason != "tool_calls":
            decision = _handle_non_tool_completion(
                message=message,
                finish_reason=finish_reason,
                iteration=iteration,
                messages=messages,
                tool_traces=tool_traces,
                include_tool_calls=include_tool_calls,
            )
            if decision.response is not None:
                return decision.response, tool_traces
            if decision.continue_loop:
                continue

        if not tool_calls:
            _nudge_missing_tool_calls(iteration, messages)
            continue

        if settings.llm_supports_tool_messages:
            messages.append(sanitize_message(message))

        logger.info("Number of tool calls: %d", len(tool_calls))
        early_response = await handle_tool_calls(
            tool_calls,
            messages,
            tool_traces,
            iteration=iteration,
            include_tool_calls=include_tool_calls,
            user_filters=user_filters,
        )
        if early_response is not None:
            return early_response, tool_traces

    logger.warning(
        "Max LLM iterations (%d) reached without obtaining a final response. Returning fallback message.",
        settings.max_llm_iterations,
    )
    return _build_chat_response(settings.llm_fallback_response, tool_traces, include_tool_calls), tool_traces
