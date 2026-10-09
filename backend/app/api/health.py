from pathlib import Path

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import get_settings
from app.database.session import SessionLocal
from app.schemas.common import HealthResponse
from app.services.classification import CLASSIFIER_WEIGHTS
from app.services.forgery import FORGERY_WEIGHTS
from app.services.ocr_service import get_ocr_status

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    db_ok = "ok"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_ok = "error"

    ocr = get_ocr_status()
    return HealthResponse(
        status="ok" if db_ok == "ok" else "degraded",
        database=db_ok,
        ocr={"engine": ocr.engine, "available": ocr.available, "message": ocr.message},
        models={
            "classification_cnn": CLASSIFIER_WEIGHTS.is_file(),
            "forgery_cnn": FORGERY_WEIGHTS.is_file(),
        },
    )
