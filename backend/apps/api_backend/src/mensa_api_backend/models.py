from typing import Any, Dict, Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class CanteenFilter(BaseModel):
    id: int
    name: str


class UserFilters(BaseModel):
    diet: Literal["vegetarian", "vegan", "meat"] | None = None
    allergens: list[str] = []
    canteens: list[CanteenFilter] = []
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
    allow_none: bool | None = None
    tool_calls: list[ToolCallTrace] | None = None


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
