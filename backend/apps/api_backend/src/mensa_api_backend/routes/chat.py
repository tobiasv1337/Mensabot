from fastapi import APIRouter

from ..models import ChatRequest, ChatResponse
from ..tooling.loop import run_tool_calling_loop


router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    return await run_tool_calling_loop(
        request.messages,
        include_tool_calls=request.include_tool_calls,
        user_filters=request.filters,
    )
