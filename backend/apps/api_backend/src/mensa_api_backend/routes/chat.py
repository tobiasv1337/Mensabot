from fastapi import APIRouter

from ..analytics import analytics_store, reset_current_analytics_context, set_current_analytics_context
from ..i18n import resolve_language
from ..models import ChatRequest, ChatResponse
from ..tooling.loop import run_tool_calling_loop


router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    lang = resolve_language(request.language)
    context = analytics_store.prepare_request_context(
        user_id=request.analytics.user_id if request.analytics else None,
        chat_id=request.analytics.chat_id if request.analytics else None,
        request_id=request.analytics.request_id if request.analytics else None,
        message_origin=request.analytics.message_origin if request.analytics else None,
        interaction_kind="llm_chat",
    )
    token = set_current_analytics_context(context)
    try:
        response = await run_tool_calling_loop(
            request.messages,
            include_tool_calls=request.include_tool_calls,
            user_filters=request.filters,
            judge_correction=request.judge_correction,
            language=lang,
        )
    finally:
        reset_current_analytics_context(token)
    analytics_store.record_chat_response(
        context,
        filters=request.filters.model_dump(mode="python") if request.filters is not None else None,
    )
    return response
