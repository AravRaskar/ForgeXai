import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.core.config import get_settings

ALLOWED_MIME = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
}
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".pdf"}


def safe_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: JPG, JPEG, PNG, PDF.")
    return ext


async def save_upload(file: UploadFile) -> tuple[str, str, int, str]:
    settings = get_settings()
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")
    ext = safe_extension(file.filename)
    content_type = file.content_type or ""
    if content_type and content_type not in ALLOWED_MIME:
        if ext == ".pdf" and content_type != "application/octet-stream":
            raise HTTPException(status_code=400, detail=f"Invalid MIME type: {content_type}")

    data = await file.read()
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.max_upload_size_mb} MB.",
        )
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest = settings.upload_path / stored_name
    dest.write_bytes(data)
    mime = content_type or ("application/pdf" if ext == ".pdf" else "image/jpeg")
    return stored_name, file.filename, len(data), mime


def resolve_stored_path(stored_filename: str) -> Path:
    settings = get_settings()
    base = settings.upload_path.resolve()
    candidate = (base / stored_filename).resolve()
    if not str(candidate).startswith(str(base)):
        raise HTTPException(status_code=400, detail="Invalid file reference.")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="Stored file not found.")
    return candidate


def mask_value(value: str | None, visible: int = 4) -> str:
    if not value or value == "Not detected":
        return value or "Not detected"
    cleaned = re.sub(r"\s+", "", value)
    if len(cleaned) <= visible:
        return "*" * len(cleaned)
    return "*" * (len(cleaned) - visible) + cleaned[-visible:]
