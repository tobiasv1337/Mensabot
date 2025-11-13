from fastapi import FastAPI
from typing import Optional
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI()
client = OpenAI()

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
