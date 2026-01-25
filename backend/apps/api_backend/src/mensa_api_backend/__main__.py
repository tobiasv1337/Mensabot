import json
import logging
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

from typing import Any, Dict, List, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from openai.types.chat import ChatCompletion, ChatCompletionMessage
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from openai import OpenAI, RateLimitError
from fastmcp import Client as MCPClient
from mensa_mcp_server import mcp
from mensa_mcp_server.server import make_openmensa_client
from openmensa_sdk import CanteenIndexStore

class APIBackendSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="API_BACKEND_", env_file="src/mensa_api_backend/.env", env_file_encoding="utf-8", extra="forbid", case_sensitive=False)

    llm_api_key: str
    llm_base_url: str
    llm_model: str

    llm_supports_tool_messages: bool = False
    log_level: str = "INFO"
    max_llm_iterations: int = 10
    llm_max_retries: int = 10
    llm_retry_base_delay: float = 1.0
    llm_retry_max_delay: float = 30.0
    llm_fallback_response: str = (
        "I'm sorry, but I wasn't able to provide a satisfactory answer within the allowed number of "
        "attempts. Please try rephrasing your question or ask something else."
    )

    canteen_index_path: str | None = None
    canteen_index_ttl_hours: float = 24.0


settings = APIBackendSettings()

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    include_tool_calls: bool = False
    # model: Optional[str] = None

class ToolCallTrace(BaseModel):
    id: str | None = None
    name: str
    args: Dict[str, Any] | None = None
    raw_args: str | None = None
    result: Any | None = None
    ok: bool | None = None
    error: str | None = None
    iteration: int | None = None

class ChatResponse(BaseModel):
    status: Literal["ok", "needs_location"]
    reply: str | None = None
    prompt: str | None = None
    tool_calls: list[ToolCallTrace] | None = None


class CanteenOut(BaseModel):
    id: int
    name: str
    city: str | None = None
    address: str | None = None
    lat: float | None = None
    lng: float | None = None


class PageInfo(BaseModel):
    current_page: int
    per_page: int
    next_page: int | None = None
    has_next: bool


class CanteenIndexInfo(BaseModel):
    updated_at: str
    total_canteens: int


class CanteenListResponse(BaseModel):
    canteens: list[CanteenOut]
    page_info: PageInfo
    index: CanteenIndexInfo
    total_results: int


class CanteenSearchResultOut(BaseModel):
    canteen: CanteenOut
    score: float
    distance_km: float | None = None


class CanteenSearchResponse(BaseModel):
    results: list[CanteenSearchResultOut]
    total_results: int
    index: CanteenIndexInfo

LOG_LEVEL = settings.log_level.upper()
LLM_BASE_SYSTEM_PROMPT = (
    f"You are the Mensabot, a friendly assistant for university canteen inquiries. Only answer questions that are at least somewhat related to canteens, meals, food, eating, or dining. Politely decline unrelated or critical topics.\n"
    "\n"
    "## Core Principles\n"
    "1. **Always use tools for current data** - For menus, opening hours, prices, and availability, always call available tools. Never guess about time-sensitive information.\n"
    "2. **Don't hallucinate** - If unsure and no tool is available, say 'I don't have that information' instead of making something up. Never answer important information especially time sensitive data like menus or opening hours based on your training data. Only use tool results.\n"
    "3. **Be direct** - Provide concise, relevant answers suitable for mobile chat. Avoid lengthy explanations unless specifically asked.\n"
    "4. **Use multiple tool calls** - Call tools as many times as needed to gather complete information. Don't stop early if more data is required.\n"
    "5. **Use tool calls efficiently** - You have at most "
    f"{settings.max_llm_iterations} tool-call iterations (request + tool-results cycles). Plan calls to get all required data, avoid redundant or duplicate requests.\n"
    "6. **Clarify when needed** - If the user request is unclear, vague, or missing important details, ask a brief follow-up question before answering rather than guessing or hallucinating.\n"
    "7. **Hide the backend** - Don't mention tools, OpenMensa, or technical systems or any alternative apps and systems in your answer unless asked.\n"
    "8. **Trust canteen IDs** - Canteen IDs remain stable; you can rely on them across different calls.\n"
    "9. **Never do calendar math** - If the user mentions relative dates or weekdays (today, tomorrow, next week, next Monday, etc.), call `get_date_context` and copy the ISO dates exactly. Do not infer or calculate dates yourself.\n"
    "\n"
    "## Formatting Guidelines\n"
    "- Use **GitHub-Flavored Markdown** only (headings, bold, italic, bullet lists, numbered lists, code blocks).\n"
    "- **Tables must be mobile-friendly**: Use narrow, vertical formats instead of wide horizontal tables. Consider using bullet lists or numbered lists instead of tables when possible.\n"
    "  Example: Instead of a wide table, use \"🕐 Monday: 11:00-14:00\\n🕑 Tuesday: 11:00-14:00\"\n"
    "- **For important notes**, use Markdown blockquotes with emojis:\n"
    "  > ⚠️ **Warning:** ...\n"
    "  > 💡 **Hint:** ...\n"
    "  > ℹ️ **Info:** ...\n"
    "  Use sparingly for critical information only.\n"
    "- No emojis outside of blockquotes where they don't make sense (except in opening hours, etc. for clarity).\n"
    "\n"
    "## Tone and Language\n"
    "- Be friendly, helpful, and professional.\n"
    "- Respond in the **same language** the user used in their request.\n"
    "- **Keep responses SHORT and SCANNABLE** - Think 1-3 sentences for simple answers. Maximum 2-3 short paragraphs for complex information.\n"
    "- Answers must fit comfortably in **mobile chat bubbles** (typically ~500 characters max per response).\n"
    "- Break up long information into **short bullet points or numbered lists** - one idea per line.\n"
    "- Avoid paragraphs with multiple sentences. Use line breaks liberally.\n"
    "- Don't say: \"Our canteen has multiple options available including pasta...\" - just list the options directly.\n"
    "- If the user only asks for the menu in general, provide a structured summary of the main dishes and inform the user that they can request the full menu if desired.\n"
    "- If the user requests the full canteen menu, you must provide the complete menu.\n"
    "- If you display menus for multiple days or canteens, you may combine or group identical items to keep your answer short and concise.\n"
    "- Use formatted lists or tables for menus where appropriate to enhance readability on mobile.\n"
    "- **Always prefer multiple vertical lists or tables (one per day or canteen) over wide horizontal tables with many columns.** Wide tables are hard to read on mobile devices.\n"
    "  For example, instead of a table with multiple columns for days of the week or canteens, use several vertical lists or tables under each other - one for each day or canteen.\n"
)

logger = logging.getLogger("mensa_api_backend")
logger.setLevel(LOG_LEVEL)

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    logger.addHandler(handler)
    logger.propagate = False


app = FastAPI()

# Allow local dev frontends to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)

async def create_chat_completion_with_retry(messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> ChatCompletion:
    """Call the chat completion API with simple exponential (capped) backoff on rate limits."""
    last_error: Exception | None = None
    for attempt in range(1, settings.llm_max_retries + 1):
        try:
            return client.chat.completions.create(
                model=settings.llm_model,
                messages=messages,
                tools=tools,
                tool_choice="auto",
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
            logger.warning("Rate limit hit (attempt %d/%d). Retrying in %.2fs.\nError: %s", attempt, settings.llm_max_retries, delay, last_error)
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
                logger.warning(f"Tool is missing name or inputSchema. Name: {name}, has parameters: {parameters is not None}\n Tool: {tool}.\nSkipping this tool.")
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
            logger.exception(f"Error calling tool {tool_name} with args {args}")
            return {"error": f"Failed to call MCP tool '{tool_name}': {str(e)}"}


_canteen_index_store: CanteenIndexStore | None = None


def get_canteen_index_store() -> CanteenIndexStore:
    global _canteen_index_store
    if _canteen_index_store is None:
        _canteen_index_store = CanteenIndexStore(path=settings.canteen_index_path) if settings.canteen_index_path else CanteenIndexStore()
    return _canteen_index_store


def load_canteen_index():
    store = get_canteen_index_store()
    with make_openmensa_client() as client:
        return store.refresh_if_stale(client, ttl_hours=settings.canteen_index_ttl_hours)


def _canteen_to_out(canteen) -> CanteenOut:
    return CanteenOut(
        id=canteen.id,
        name=canteen.name,
        city=canteen.city,
        address=canteen.address,
        lat=canteen.latitude,
        lng=canteen.longitude,
    )

def get_time_context() -> ChatCompletionMessage:
    """
    Generate a system prompt that informs the LLM about the current local date and time in Europe/Berlin.
    """

    now = datetime.now(ZoneInfo("Europe/Berlin"))
    weekday = now.strftime("%A")
    local = now.strftime("%Y-%m-%d %H:%M")

    return {
        "role": "system",
        "content": (
            f"Current local date and time: {weekday}, {local} (timezone: Europe/Berlin). "
            "Assume all canteen opening hours and menus refer to this timezone. "
            "When the user says 'today', interpret it as this local date."
        ),
    }

def format_message_history(messages: List[ChatMessage], format: Literal["openai"] = "openai") -> List[ChatCompletionMessage]:
    if format == "openai":
        formatted_messages: List[ChatCompletionMessage] = [*messages]
    else:
        raise ValueError(f"Unsupported target message format: {format}")
    
    return formatted_messages

def prepare_message_log(message_log: List[ChatMessage]) -> List[ChatCompletionMessage]:
    """ Format the message log (history + current request) into the format required by the LLM. """
    return [
        {
            "role": "system",
            "content": LLM_BASE_SYSTEM_PROMPT,
        },
        get_time_context(),
        *format_message_history(message_log),
    ]

LOCATION_TOOL_NAME = "request_user_location"
LOCATION_FALLBACK_PROMPT = "To answer your question, I need your location. Would you like to share it?"


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
            return ChatResponse(status="ok", reply=settings.llm_fallback_response, tool_calls=(tool_traces or None) if include_tool_calls else None)

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

        if finish_reason != "tool_calls":
            logger.info("Final response returned after %d iterations: %s", iteration, json.dumps(message.model_dump(), indent=2))
            return ChatResponse(status="ok", reply=ensure_message_content(message, finish_reason), tool_calls=(tool_traces or None) if include_tool_calls else None)

        
        tool_calls = message.tool_calls or []
        if not tool_calls:
            logger.warning("LLM reported finish_reason=tool_calls but no tool_calls were provided. Returning current message after %d iterations.", iteration)
            logger.debug("Final response: %s", json.dumps(message.model_dump(), indent=2))
            return ChatResponse(status="ok", reply=ensure_message_content(message, finish_reason), tool_calls=(tool_traces or None) if include_tool_calls else None)

        if settings.llm_supports_tool_messages:
            messages.append(message)

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
                except json.JSONDecodeError as e:
                    logger.error("Tool %s called with INVALID JSON arguments: %s\nJSON parse error: %s", tool_name, raw_args, str(e))
                    tool_trace.raw_args = raw_args
                    tool_trace.ok = False
                    tool_trace.error = f"Failed to parse arguments. Invalid JSON: {str(e)}"
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
                    # continue to next call after logging invalid args
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
                return ChatResponse(status="needs_location", prompt=prompt_text, tool_calls=(tool_traces or None) if include_tool_calls else None)

            # Delegate to MCP: ensure args is a dict
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
        
    logger.warning("Max LLM iterations (%d) reached without obtaining a final response. Returning fallback message.", settings.max_llm_iterations)
    return ChatResponse(status="ok", reply=settings.llm_fallback_response, tool_calls=(tool_traces or None) if include_tool_calls else None)

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    response = await run_tool_calling_loop(request.messages, include_tool_calls=request.include_tool_calls)
    return response


@app.get("/api/canteens", response_model=CanteenListResponse)
async def list_canteens(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=500),
    city: str | None = None,
    has_coordinates: bool | None = None,
):
    index = load_canteen_index()
    canteens, total = index.list(page=page, per_page=per_page, city=city, has_coordinates=has_coordinates)
    next_page = page + 1 if page * per_page < total else None
    return CanteenListResponse(
        canteens=[_canteen_to_out(c) for c in canteens],
        page_info=PageInfo(
            current_page=page,
            per_page=per_page,
            next_page=next_page,
            has_next=next_page is not None,
        ),
        index=CanteenIndexInfo(
            updated_at=index.updated_at.isoformat(),
            total_canteens=len(index.canteens),
        ),
        total_results=total,
    )


@app.get("/api/canteens/search", response_model=CanteenSearchResponse)
async def search_canteens(
    query: str | None = None,
    city: str | None = None,
    near_lat: float | None = Query(None, ge=-90.0, le=90.0),
    near_lng: float | None = Query(None, ge=-180.0, le=180.0),
    radius_km: float | None = Query(None, gt=0.0),
    limit: int = Query(20, ge=1, le=100),
    min_score: float = Query(60.0, ge=0.0, le=100.0),
    has_coordinates: bool | None = None,
):
    if (near_lat is None) != (near_lng is None):
        raise HTTPException(status_code=400, detail="near_lat and near_lng must be provided together.")

    index = load_canteen_index()
    results, total = index.search(
        query,
        city=city,
        near_lat=near_lat,
        near_lng=near_lng,
        radius_km=radius_km,
        limit=limit,
        min_score=min_score,
        has_coordinates=has_coordinates,
    )

    return CanteenSearchResponse(
        results=[
            CanteenSearchResultOut(
                canteen=_canteen_to_out(r.canteen),
                score=r.score,
                distance_km=r.distance_km,
            )
            for r in results
        ],
        total_results=total,
        index=CanteenIndexInfo(
            updated_at=index.updated_at.isoformat(),
            total_canteens=len(index.canteens),
        ),
    )

@app.get("/api/health")
async def health():
    return {"status": "ok"}

def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
