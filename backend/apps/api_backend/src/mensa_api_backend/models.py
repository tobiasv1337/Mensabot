from typing import Any, Dict, Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class CanteenFilter(BaseModel):
    id: int
    name: str


class UserFilters(BaseModel):
    diet: Literal["vegetarian", "vegan", "meat"] | None = None
    allergens: list[str] = Field(default_factory=list)
    canteens: list[CanteenFilter] = Field(default_factory=list)
    price_category: Literal["students", "employees", "pupils", "others"] | None = None


class ChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    messages: list[ChatMessage]
    include_tool_calls: bool = False
    filters: UserFilters | None = None
    language: str | None = None
    judge_correction: bool = Field(default=True, alias="judgeCorrection")


class ChatStreamRequestEnvelope(BaseModel):
    type: Literal["chat.request"]
    payload: ChatRequest


class ToolCallTrace(BaseModel):
    id: str | None = None
    name: str
    args: Dict[str, Any] | None = None
    raw_args: str | None = None
    result: Any | None = None
    ok: bool | None = None
    error: str | None = None
    iteration: int | None = None


class ChatResponse(BaseModel):
    status: Literal["ok", "needs_location", "needs_directions", "needs_clarification"]
    reply: str | None = None
    prompt: str | None = None
    lat: float | None = None
    lng: float | None = None
    options: list[str] | None = None
    selection_mode: Literal["single", "multi"] | None = None
    allow_no_match: bool | None = None
    tool_calls: list[ToolCallTrace] | None = None


class _BaseInternalChatResponse(BaseModel):
    tool_calls: list[ToolCallTrace] | None = None


class InternalChatOkResponse(_BaseInternalChatResponse):
    status: Literal["ok"] = "ok"
    reply: str


class InternalChatNeedsLocationResponse(_BaseInternalChatResponse):
    status: Literal["needs_location"] = "needs_location"
    prompt: str


class InternalChatNeedsDirectionsResponse(_BaseInternalChatResponse):
    status: Literal["needs_directions"] = "needs_directions"
    prompt: str
    lat: float
    lng: float


class InternalChatNeedsClarificationResponse(_BaseInternalChatResponse):
    status: Literal["needs_clarification"] = "needs_clarification"
    prompt: str
    options: list[str]
    selection_mode: Literal["single", "multi"]
    allow_no_match: bool


InternalChatResponse: TypeAlias = InternalChatOkResponse | InternalChatNeedsLocationResponse | InternalChatNeedsDirectionsResponse | InternalChatNeedsClarificationResponse


def to_public_chat_response(response: InternalChatResponse) -> ChatResponse:
    match response:
        case InternalChatOkResponse(): return ChatResponse(status=response.status, reply=response.reply, tool_calls=response.tool_calls)
        case InternalChatNeedsLocationResponse(): return ChatResponse(status=response.status, prompt=response.prompt, tool_calls=response.tool_calls)
        case InternalChatNeedsDirectionsResponse(): return ChatResponse(status=response.status, prompt=response.prompt, lat=response.lat, lng=response.lng, tool_calls=response.tool_calls)
        case InternalChatNeedsClarificationResponse(): return ChatResponse(status=response.status, prompt=response.prompt, options=response.options, selection_mode=response.selection_mode, allow_no_match=response.allow_no_match, tool_calls=response.tool_calls)
        case _: raise TypeError(f"Unsupported internal chat response: {type(response).__name__}")


class TranscribeResponse(BaseModel):
    text: str
    duration_s: float | None = None


class CanteenOut(BaseModel):
    id: int
    name: str
    city: str | None = None
    address: str | None = None
    lat: float | None = None
    lng: float | None = None


class PageInfo(BaseModel):
    current_page: int
    per_page: int
    next_page: int | None = None
    has_next: bool


class CanteenIndexInfo(BaseModel):
    updated_at: str
    total_canteens: int
    total_cities: int


class CanteenListResponse(BaseModel):
    canteens: list[CanteenOut]
    page_info: PageInfo
    index: CanteenIndexInfo
    total_results: int


class CanteenSearchResultOut(BaseModel):
    canteen: CanteenOut
    score: float
    distance_km: float | None = None


class CanteenSearchResponse(BaseModel):
    results: list[CanteenSearchResultOut]
    total_results: int
    page_info: PageInfo
    index: CanteenIndexInfo
