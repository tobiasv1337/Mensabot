from fastapi import FastAPI
from typing import Optional
from pydantic import BaseModel
from openai import OpenAI

api_key = ""
base_url = "https://chat-ai.academiccloud.de/v1"
model = "meta-llama-3.1-8b-instruct"

app = FastAPI()
client = OpenAI(api_key=api_key, base_url=base_url)

messages=[{"role":"system","content":"You are a helpful assistant"},{"role":"user","content":"You should see a deepwiki MCP tool. Tell me about the mcp tools available to you. Use some of them and tell me about the results."}]

# Test chat completion
chat_completion = client.chat.completions.create(
    messages=messages,
    model= model,
)
print(chat_completion)

# Test responses with MCP tool
resp = client.responses.create(
    model=model,
    input=messages,
    tools=[
        {
            "type": "mcp",
            "server_label": "deepwiki_mcp",
            "server_url": "https://mcp.deepwiki.com/mcp",
            "require_approval": "never",
        }
    ],
)

print(resp.output_text)
print(resp)

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
