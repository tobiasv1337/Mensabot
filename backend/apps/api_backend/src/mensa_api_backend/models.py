"""
Mensabot API Backend — models
Author: Tobias Veselsky
Description: Pydantic models for API request and response schemas.
"""

from typing import Literal
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    # model: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
