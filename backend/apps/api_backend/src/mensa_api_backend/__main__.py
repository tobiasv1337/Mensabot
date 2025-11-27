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
) -> Dict[str, Any]:
    """
    Stub: pretend we queried OpenMensa and found some canteens near TU Berlin.
    Just for testing purposes. :)
    """
    print(f"[STUB] list_canteens_near(lat={lat}, lng={lng}, radius_km={radius_km}, page={page})")

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

# STUB tool definition. Just for testing function-calling behavior for now. :)
tools = [
    {
        "type": "function",
        "function": {
            "name": "list_canteens_near",
            "description": (
                "List canteens near a geographic location (paginated). "
                "Use this to find nearby university canteens. "
                "Return real canteen names, distances, and addresses."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {
                        "type": "number",
                        "description": "Latitude in WGS84 decimal degrees."
                    },
                    "lng": {
                        "type": "number",
                        "description": "Longitude in WGS84 decimal degrees."
                    },
                    "radius_km": {
                        "type": "number",
                        "description": "Search radius in kilometers.",
                        "default": 3.0
                    },
                    "page": {
                        "type": "integer",
                        "description": "Page number for pagination (1-based).",
                        "default": 1,
                        "minimum": 1
                    },
                },
                "required": ["lat", "lng"],
            },
        },
    },
]


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
        print(f"Retrieved {len(raw_tools)} tools from MCP server: {raw_tools}")
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
        print(f"Converted {len(openai_tools)} tools to OpenAI format: {openai_tools}")
        return openai_tools

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

def run_tool_calling_loop(request_text: str) -> str:
    messages = generate_messages(request_text)

    while True:
        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            tools=tools,
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

        
        print("Tool calls detected!")
        tool_calls = message.tool_calls or []
        if not tool_calls:
            print("No tool calls found, exiting loop.")
            final_message = message
            break

        # Per OpenAI spec, we should append this tool calling message to the messages. But the SAIA backend seems to have issues with that responding that only a single tool call is allowed.
        #messages.append(message)

        print(f"Number of tool calls: {len(tool_calls)}")
        for call in tool_calls:
            tool_name = call.function.name
            raw_args = call.function.arguments
            print(f"Tool call ID: {call.id}, function: {tool_name}, arguments: {raw_args}")

            try:
                args = json.loads(raw_args)
            except json.JSONDecodeError as e:
                result = {"error": f"Failed to parse arguments: {str(e)}"}
            else:
                if tool_name == "list_canteens_near":
                    result = list_canteens_near(**args)
                else:
                    result = {"error": f"Unknown tool: {tool_name}"}

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "name": tool_name,
                    "content": json.dumps(result),
                }
            )

            if not (isinstance(result, dict) and "error" in result):
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


    print("Final message content:")
    print(final_message.content)

    print("Info Log: All infos about this request:")
    print(messages)
    print(json.dumps(final_message.model_dump(), indent=2))

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
    resp = run_tool_calling_loop(message)

    return ChatResponse(reply=resp)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

def main():
    test = asyncio.run(get_openai_tools_from_mcp())
    print(f"Tools from MCP: {test}")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
