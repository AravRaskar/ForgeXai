from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    id: str
    original_filename: str
    file_size: int
    mime_type: str
    processing_status: str


class DocumentListItem(BaseModel):
    id: str
    original_filename: str
    predicted_category: str | None
    category_hint: str | None
    created_at: datetime
    classification_source: str | None
    forgery_status: str | None
    review_status: str
    processing_status: str


class DocumentDetail(BaseModel):
    id: str
    original_filename: str
    file_size: int
    mime_type: str
    category_hint: str | None
    predicted_category: str | None
    classification_confidence: float | None
    classification_source: str | None
    ocr_raw_text: str | None
    ocr_fields: dict[str, Any] | None
    ocr_fields_masked: dict[str, Any] | None
    forgery_status: str | None
    forgery_details: dict[str, Any] | None
    processing_status: str
    processing_error: str | None
    processing_steps: list[dict[str, str]] | None
    processing_time_ms: int | None
    review_status: str
    reviewer_comment: str | None
    reviewed_at: datetime | None
    created_at: datetime
    preview_url: str
    ela_url: str | None


class DocumentListResponse(BaseModel):
    items: list[DocumentListItem]
    total: int
    page: int
    page_size: int


class AnalyzeResponse(BaseModel):
    document_id: str
    processing_status: str
    message: str
