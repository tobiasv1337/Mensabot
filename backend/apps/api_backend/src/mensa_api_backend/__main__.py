import os
import json
import logging
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

from typing import Any, Dict, List, Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai.types.chat import ChatCompletion, ChatCompletionMessage
from pydantic import BaseModel
from openai import OpenAI, RateLimitError
from dotenv import load_dotenv
from fastmcp import Client as MCPClient
from mensa_mcp_server import mcp

load_dotenv() # Load environment variables from .env file

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    # model: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str

def get_env_required(name: str) -> str:
    """
    Get a required environment variable. Raise an error if not set.
    """
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value

LLM_API_KEY = get_env_required("LLM_API_KEY")
LLM_BASE_URL = get_env_required("LLM_BASE_URL")
LLM_MODEL = get_env_required("LLM_MODEL")
MCP_URL = get_env_required("MCP_URL")
LLM_SUPPORTS_TOOL_MESSAGES = os.getenv("LLM_SUPPORTS_TOOL_MESSAGES", "false").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
MAX_LLM_ITERATIONS = int(os.getenv("MAX_LLM_ITERATIONS", "10"))
LLM_MAX_RETRIES = int(os.getenv("LLM_MAX_RETRIES", "10"))
LLM_RETRY_BASE_DELAY = float(os.getenv("LLM_RETRY_BASE_DELAY", "1.0"))
LLM_RETRY_MAX_DELAY = float(os.getenv("LLM_RETRY_MAX_DELAY", "30.0"))
LLM_FALLBACK_RESPONSE = (
    "I'm sorry, but I wasn't able to provide a satisfactory answer within the allowed number of "
    "attempts. Please try rephrasing your question or ask something else."
)
LLM_BASE_SYSTEM_PROMPT = (
    f"You are the Mensabot, a friendly assistant for university canteen inquiries. Only answer questions that are at least somewhat related to canteens, meals, food, eating, or dining. Politely decline unrelated or critical topics.\n"
    "\n"
    "## Core Principles\n"
    "1. **Always use tools for current data** - For menus, opening hours, prices, and availability, always call available tools. Never guess about time-sensitive information.\n"
    "2. **Don't hallucinate** - If unsure and no tool is available, say 'I don't have that information' instead of making something up.\n"
    "3. **Be direct** - Provide concise, relevant answers suitable for mobile chat. Avoid lengthy explanations unless specifically asked.\n"
    "4. **Use multiple tool calls** - Call tools as many times as needed to gather complete information. Don't stop early if more data is required.\n"
    "5. **Use tool calls efficiently** - You have at most "
    f"{MAX_LLM_ITERATIONS} tool-call iterations (request + tool-results cycles). Plan calls to get all required data, avoid redundant or duplicate requests, and do not ask multiple tools for the same data at the same time.\n"
    "6. **Clarify when needed** - If the user request is unclear, vague, or missing important details, ask a brief follow-up question before answering rather than guessing or hallucinating.\n"
    "7. **Hide the backend** - Don't mention tools, OpenMensa, or technical systems or any alternative apps and systems in your answer unless asked.\n"
    "8. **Trust canteen IDs** - Canteen IDs remain stable; you can rely on them across calls.\n"
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
    "- **Examples of good length:**\n"
    "  - Opening hours: \"🕐 Mon-Fri: 11:00-14:00\\n🕐 Sat-Sun: Closed\"\n"
    "  - Menu info: \"Today: Pasta with tomato sauce, salad, dessert\"\n"
    "  - Don't say: \"Our canteen has multiple options available including pasta...\" - just list them directly."
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

client = OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

async def create_chat_completion_with_retry(messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> ChatCompletion:
    """Call the chat completion API with simple exponential (capped) backoff on rate limits."""
    last_error: Exception | None = None
    for attempt in range(1, LLM_MAX_RETRIES + 1):
        try:
            return client.chat.completions.create(
                model=LLM_MODEL,
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

            delay = LLM_RETRY_BASE_DELAY * (2 ** (attempt - 1))
            if retry_after is not None:
                try:
                    delay = float(retry_after)
                except (TypeError, ValueError):
                    logger.warning("Retry-After header unparsable (%s); using backoff delay %.2fs", retry_after, delay)
            delay = min(delay, LLM_RETRY_MAX_DELAY)
            if attempt >= LLM_MAX_RETRIES:
                break
            logger.warning("Rate limit hit (attempt %d/%d). Retrying in %.2fs.\nError: %s", attempt, LLM_MAX_RETRIES, delay, last_error)
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
    return LLM_FALLBACK_RESPONSE

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

async def run_tool_calling_loop(message_log: List[ChatMessage]) -> str:
    messages = prepare_message_log(message_log)

    tools = await get_openai_tools_from_mcp()
    logger.debug("OpenAI tools fetched from MCP: %s", json.dumps(tools, indent=2))
    for iteration in range(1, MAX_LLM_ITERATIONS + 1):
        try:
            completion = await create_chat_completion_with_retry(messages=messages, tools=tools)
        except RateLimitError as e:
            logger.error("LLM completion failed after retry logic due to rate limit: %s", str(e))
            return LLM_FALLBACK_RESPONSE

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
            return ensure_message_content(message, finish_reason)

        
        tool_calls = message.tool_calls or []
        if not tool_calls:
            logger.warning("LLM reported finish_reason=tool_calls but no tool_calls were provided. Returning current message after %d iterations.", iteration)
            logger.debug("Final response: %s", json.dumps(message.model_dump(), indent=2))
            return ensure_message_content(message, finish_reason)

        if LLM_SUPPORTS_TOOL_MESSAGES:
            messages.append(message)

        logger.info("Number of tool calls: %d", len(tool_calls))
        for call in tool_calls:
            tool_name = call.function.name
            raw_args = call.function.arguments

            try:
                args = json.loads(raw_args)
            except json.JSONDecodeError as e:
                logger.error("Tool %s called with INVALID JSON arguments: %s\nJSON parse error: %s", tool_name, raw_args, str(e))
                result_payload = {"error": f"Failed to parse arguments. Invalid JSON: {str(e)}"}
            else:
                # Delegate to MCP
                result_payload = await call_mcp_tool(tool_name, args)

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "name": tool_name,
                    "content": json.dumps(result_payload),
                }
            )

            if not LLM_SUPPORTS_TOOL_MESSAGES:
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
        
    logger.warning("Max LLM iterations (%d) reached without obtaining a final response. Returning fallback message.", MAX_LLM_ITERATIONS)
    return LLM_FALLBACK_RESPONSE

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    response = await run_tool_calling_loop(request.messages)
    return ChatResponse(reply=response)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
