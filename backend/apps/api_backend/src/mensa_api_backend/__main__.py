import os
import json
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Any, Dict, List
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from fastmcp import Client as MCPClient
from mensa_mcp_server import mcp

load_dotenv() # Load environment variables from .env file

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

def list_canteens_near(
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    page: int = 1,
    per_page: int = 20,
) -> Dict[str, Any]:
    """
    Stub: pretend we queried OpenMensa and found some canteens near TU Berlin.
    Just for testing purposes. :)
    """
    print(f"[STUB] list_canteens_near(lat={lat}, lng={lng}, radius_km={radius_km}, page={page}, per_page={per_page})")

    return {
        "page_info": {
            "page": page,
            "has_next": False,
            "next_page": None,
        },
        "query": {
            "lat": lat,
            "lng": lng,
            "radius_km": radius_km,
            "page": page,
        },
        "canteens": [
            {
                "id": 1,
                "name": "Mensa TU Hardenbergstraße",
                "distance_km": 0.4,
                "address": "Hardenbergstr. 34, 10623 Berlin",
            },
            {
                "id": 2,
                "name": "Mensa TU Marchstraße",
                "distance_km": 0.9,
                "address": "Marchstr. 6, 10587 Berlin",
            },
        ],
    }


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

async def get_openai_tools_from_mcp() -> List[Dict[str, Any]]:
    async with MCPClient(mcp) as mcp_client:
        raw_tools = await mcp_client.list_tools()
        tool_list = list(raw_tools)
        
        openai_tools = []

        for tool in tool_list:
            name = getattr(tool, "name", None)
            description = getattr(tool, "description", "")
            parameters = getattr(tool, "inputSchema", None)
            if not name or not parameters:
                print(f"Warning: Tool {tool} is missing name or inputSchema!")
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

async def call_mcp_tool(tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call a tool via FastMCP and return a JSON-serializable dict.
    """
    async with MCPClient(mcp) as mcp_client:
        try:
            resp = await mcp_client.call_tool(tool_name, args)
            data = unwrap_tool_result(resp)
            print(f"Tool {tool_name} called with args {args}, got response: {resp}")
            return {"ok": True, "tool": tool_name, "args": args, "result": data}
        except Exception as e:
            print(f"Error calling tool {tool_name} with args {args}: {e}")
            return {"error": f"Failed to call MCP tool '{tool_name}': {str(e)}"}

def generate_messages(request_text: str) -> List[Dict[str, Any]]:
    messages: List[Dict[str, Any]] = [
        {
            "role": "system",
            "content": (
                "You are the Mensabot for university canteens.\n"
                "If the user asks for information, use the available tools to get real data if possible. Don't make up any information by hallucination.\n"
                "If no tool is available to answer that question, you are allowed to answer based on your internal knowledge. "
                "But if you do so, clearly state that this is your guess that you couldn't verify and the information may be outdated or incorrect.\n"
                "If you are unsure about an answer and no tool is available, simply tell the user you just don't know and can't access that information instead of making something up.\n"
                "If you are done using tools and want to give a final answer to the user, just respond directly with the answer to the user. "
                "Don't mention anything about tools or tool usage in your final answer.\n"
                "Always respond in a friendly and helpful manner.\n"
                "Always respond in the same language the user used in their request."
            ),
        },
    ]
    request = {
        "role": "user",
        "content": request_text,
    }
    messages.append(request)
    return messages

async def run_tool_calling_loop(request_text: str) -> str:
    messages = generate_messages(request_text)

    while True:
        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            tools= await get_openai_tools_from_mcp(),
            tool_choice="auto",
            temperature=0.2,
        )
        print(f"Received completion: {completion.model_dump()}")
        choice = completion.choices[0]
        finish_reason = choice.finish_reason
        message = choice.message

        if finish_reason != "tool_calls":
            final_message = message
            break

        
        tool_calls = message.tool_calls or []
        if not tool_calls:
            final_message = message
            break

        if "academiccloud.de" not in LLM_BASE_URL:
            messages.append(message)

        print(f"Number of tool calls: {len(tool_calls)}")
        for call in tool_calls:
            tool_name = call.function.name
            raw_args = call.function.arguments

            try:
                args = json.loads(raw_args)
                # Delegate to MCP
                result_payload: Dict[str, Any] = await call_mcp_tool(tool_name, args)
            except json.JSONDecodeError as e:
                result_payload = {"error": f"Failed to parse arguments: {str(e)}"}

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "name": tool_name,
                    "content": json.dumps(result_payload),
                }
            )

            if "academiccloud.de" in LLM_BASE_URL:
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


    print(f"Final message: {json.dumps(final_message.model_dump(), indent=2)}")
    return final_message.content



class ChatRequest(BaseModel):
    # For now make it a simple single string request for simplicity and easy terminal testing.
    message: str
    # messages: list[dict]
    # model: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    message = request.message
    resp = await run_tool_calling_loop(message)

    return ChatResponse(reply=resp)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
