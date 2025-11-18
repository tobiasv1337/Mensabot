from fastapi import FastAPI
from typing import Optional, Any, Dict, List
from pydantic import BaseModel
from openai import OpenAI
import json

api_key = ""
base_url = "https://chat-ai.academiccloud.de/v1"
model = "meta-llama-3.1-8b-instruct"

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


app = FastAPI()
client = OpenAI(api_key=api_key, base_url=base_url)

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

messages: List[Dict[str, Any]] = [
    {
        "role": "system",
        "content": (
            "You are the Mensabot for university canteens."
            "If the user asks for information, use the available tools to get real data if possible."
            "Don't make up any information by hallucination."
            "If no tool is available to answer that question, you are allowed to answer based on your internal knowledge."
            "You are allowed to answer based on your internal knowledge, but then clearly state that that this is your guess that you couldn't verify and the information may be outdated or incorrect."
            "But if you are still sure about your answer based on your internal knowledge, you can also just give the answer directly."
            "If you are very unsure about an answer and no tool is available, simply tell the user you just don't know and can't access that information instead of making something up."
            "If you are done using tools and want to give a final answer to the user, just respond directly with the answer to the user."
            "Don't mention anything about tools or tool usage in your final answer."
        ),
    },
    {"role": "user", "content": "What are the canteens near TU Berlin? And what are the canteens in munich? What about in all other cities?"},
    #{"role": "user", "content": "What is Spaghetti Carbonara?"}
]

while True:
    completion = client.chat.completions.create(
        model=model,
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

exit(0)

MCP_URL = "http://localhost:8000/mcp"

class ChatRequest(BaseModel):
    messages: list[dict]
    model: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    model = req.model or "llama-3.3-70b-instruct"

    resp = client.responses.create(
        model=model,
        input=req.messages,
        tools=[
            {
                "type": "mcp",
                "server_label": "mensabot_mcp",
                "server_url": MCP_URL,
                "require_approval": "never",
            }
        ],
    )

    return ChatResponse(reply=resp.output_text)

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
