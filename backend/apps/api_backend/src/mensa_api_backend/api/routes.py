"""
Mensabot API Backend — api.routes
Author: Tobias Veselsky
Description: API endpoint handlers.
"""

from fastapi import APIRouter

from ..models import ChatRequest, ChatResponse
from ..services.llm import run_tool_calling_loop


router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    response = run_tool_calling_loop(request.messages)
    return ChatResponse(reply=response)


@router.get("/api/health")
async def health():
    return {"status": "ok"}
