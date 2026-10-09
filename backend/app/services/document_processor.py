import time
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import Document, ForgeryStatus, ProcessingStatus
from app.services.audit import log_action
from app.services.classification import classify_document
from app.services.forgery import analyze_forgery
from app.services.ocr_service import extract_fields, extract_text
from app.services.preprocessing import load_document_as_bgr, preprocess_image
from app.services.file_storage import resolve_stored_path


STEPS = [
    "Uploading",
    "Preprocessing",
    "Classification",
    "OCR Extraction",
    "Forgery Analysis",
    "Results",
]


def _step_update(steps: list[dict], index: int, state: str) -> None:
    if 0 <= index < len(steps):
        steps[index]["state"] = state


def process_document(db: Session, document: Document, actor_email: str | None) -> Document:
    settings = get_settings()
    start = time.perf_counter()
    steps = [{"name": s, "state": "pending"} for s in STEPS]
    document.processing_steps = steps
    document.processing_status = ProcessingStatus.PROCESSING.value
    document.processing_error = None
    db.commit()

    log_action(
        db,
        "analysis_started",
        document_id=document.id,
        actor_email=actor_email,
        details={},
    )

    try:
        _step_update(steps, 0, "completed")
        _step_update(steps, 1, "in_progress")
        db.commit()

        path = resolve_stored_path(document.stored_filename)
        img = load_document_as_bgr(path)
        _ = preprocess_image(img)
        _step_update(steps, 1, "completed")
        _step_update(steps, 2, "in_progress")
        db.commit()

        ocr_text, ocr_status = extract_text(path)
        document.ocr_raw_text = ocr_text

        cls = classify_document(path, ocr_text=ocr_text, category_hint=document.category_hint)
        document.predicted_category = cls.category
        document.classification_confidence = cls.confidence
        document.classification_source = cls.source
        _step_update(steps, 2, "completed")
        _step_update(steps, 3, "in_progress")
        db.commit()

        fields = extract_fields(cls.category, ocr_text)
        document.ocr_fields = {**fields, "_ocr_engine_status": ocr_status.message}
        _step_update(steps, 3, "completed")
        _step_update(steps, 4, "in_progress")
        db.commit()

        ela_name = f"ela_{document.id}_{uuid.uuid4().hex[:8]}.png"
        ela_path = settings.upload_path / ela_name
        forgery = analyze_forgery(path, img, ela_path)
        if forgery.get("ela", {}).get("available"):
            document.ela_stored_filename = ela_name
        else:
            document.ela_stored_filename = None

        status_map = {
            "no_suspicious": ForgeryStatus.NO_SUSPICIOUS.value,
            "suspicious": ForgeryStatus.SUSPICIOUS.value,
            "manual_review": ForgeryStatus.MANUAL_REVIEW.value,
        }
        document.forgery_status = status_map.get(forgery["status"], ForgeryStatus.MANUAL_REVIEW.value)
        document.forgery_details = forgery
        _step_update(steps, 4, "completed")
        _step_update(steps, 5, "completed")
        document.processing_status = ProcessingStatus.COMPLETED.value
        document.processing_time_ms = int((time.perf_counter() - start) * 1000)
        document.processing_steps = steps
        db.commit()

        log_action(
            db,
            "analysis_completed",
            document_id=document.id,
            actor_email=actor_email,
            details={"forgery_status": document.forgery_status},
        )
    except Exception as exc:
        document.processing_status = ProcessingStatus.FAILED.value
        document.processing_error = str(exc)
        for step in steps:
            if step["state"] in ("pending", "in_progress"):
                step["state"] = "failed"
                break
        document.processing_steps = steps
        db.commit()
        log_action(
            db,
            "analysis_failed",
            document_id=document.id,
            actor_email=actor_email,
            details={"error_type": type(exc).__name__},
        )

    db.refresh(document)
    return document
