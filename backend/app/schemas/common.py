from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str
    database: str
    ocr: dict[str, Any]
    models: dict[str, bool]


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=4)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, str]


class ReviewUpdate(BaseModel):
    action: str = Field(description="approve | reject | manual_review | escalate")
    comment: str | None = None
