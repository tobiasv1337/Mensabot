import os
import json

from typing import Any, Dict, List, Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai.types.chat import ChatCompletionMessage
from openai import OpenAI
from pydantic import BaseModel
from dotenv import load_dotenv

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


def format_message_history(messages: List[ChatMessage], format: Literal["openai"] = "openai") -> List[ChatCompletionMessage]:
    if format == "openai":
        messages: List[ChatCompletionMessage] = [*messages]
    else:
        raise ValueError(f"Unsupported target message format: {format}")
    
    return messages

def run_tool_calling_loop(messages: list[ChatMessage]) -> str:
    messages = format_message_history(messages)

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

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    response = run_tool_calling_loop(request.message)
    return ChatResponse(reply=response)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
