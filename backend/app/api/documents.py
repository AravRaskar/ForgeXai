import io
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.entities import Document, ProcessingStatus, ReviewStatus, User
from app.schemas.common import ReviewUpdate
from app.schemas.document import (
    AnalyzeResponse,
    DocumentDetail,
    DocumentListItem,
    DocumentListResponse,
    DocumentUploadResponse,
)
from app.services.audit import log_action
from app.services.document_processor import process_document
from app.services.file_storage import mask_value, resolve_stored_path, save_upload
from app.services.report import build_pdf_report

router = APIRouter(prefix="/documents", tags=["documents"])


def _masked_fields(fields: dict | None) -> dict | None:
    if not fields:
        return None
    sensitive_keys = {"name", "document_number", "account_number", "payee_or_beneficiary", "amount"}
    out = {}
    for k, v in fields.items():
        if k.startswith("_"):
            continue
        if k in sensitive_keys and isinstance(v, str):
            out[k] = mask_value(v)
        else:
            out[k] = v
    return out


def _to_detail(doc: Document, reveal: bool = False) -> DocumentDetail:
    return DocumentDetail(
        id=doc.id,
        original_filename=doc.original_filename,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        category_hint=doc.category_hint,
        predicted_category=doc.predicted_category,
        classification_confidence=doc.classification_confidence,
        classification_source=doc.classification_source,
        ocr_raw_text=doc.ocr_raw_text if reveal else None,
        ocr_fields=doc.ocr_fields if reveal else None,
        ocr_fields_masked=_masked_fields(doc.ocr_fields),
        forgery_status=doc.forgery_status,
        forgery_details=doc.forgery_details,
        processing_status=doc.processing_status,
        processing_error=doc.processing_error,
        processing_steps=doc.processing_steps,
        processing_time_ms=doc.processing_time_ms,
        review_status=doc.review_status,
        reviewer_comment=doc.reviewer_comment,
        reviewed_at=doc.reviewed_at,
        created_at=doc.created_at,
        preview_url=f"/api/documents/{doc.id}/file",
        ela_url=f"/api/documents/{doc.id}/ela" if doc.ela_stored_filename else None,
    )


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile,
    category_hint: str | None = Form(None),
    authorized: bool = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not authorized:
        raise HTTPException(status_code=400, detail="Authorization confirmation is required.")
    stored_name, original, size, mime = await save_upload(file)
    doc = Document(
        uploader_id=user.id,
        original_filename=original,
        stored_filename=stored_name,
        mime_type=mime,
        file_size=size,
        category_hint=category_hint or None,
        processing_status=ProcessingStatus.PENDING.value,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    log_action(
        db,
        "document_uploaded",
        document_id=doc.id,
        actor_id=user.id,
        actor_email=user.email,
        details={"filename": original, "size": size},
    )
    return DocumentUploadResponse(
        id=doc.id,
        original_filename=doc.original_filename,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        processing_status=doc.processing_status,
    )


def _run_analysis(document_id: str, actor_email: str):
    from app.database.session import SessionLocal

    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            process_document(db, doc, actor_email)
    finally:
        db.close()


@router.post("/{document_id}/analyze", response_model=AnalyzeResponse)
def analyze_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    sync: bool = Query(False, description="Run synchronously for demo (default: background)"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if doc.processing_status == ProcessingStatus.PROCESSING.value:
        return AnalyzeResponse(
            document_id=doc.id,
            processing_status=doc.processing_status,
            message="Analysis already in progress.",
        )

    if sync:
        process_document(db, doc, user.email)
        db.refresh(doc)
        return AnalyzeResponse(
            document_id=doc.id,
            processing_status=doc.processing_status,
            message="Analysis completed." if doc.processing_status == "completed" else "Analysis failed.",
        )

    doc.processing_status = ProcessingStatus.PROCESSING.value
    db.commit()
    background_tasks.add_task(_run_analysis, document_id, user.email)
    return AnalyzeResponse(
        document_id=doc.id,
        processing_status=ProcessingStatus.PROCESSING.value,
        message="Analysis started in background. Poll document details for status.",
    )


@router.get("", response_model=DocumentListResponse)
def list_documents(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: str | None = None,
    category: str | None = None,
    review_status: str | None = None,
    forgery_status: str | None = None,
    suspicious_only: bool = False,
    pending_review: bool = False,
):
    q = db.query(Document)
    if search:
        q = q.filter(Document.original_filename.ilike(f"%{search}%"))
    if category:
        q = q.filter(Document.predicted_category == category)
    if review_status:
        q = q.filter(Document.review_status == review_status)
    if forgery_status:
        q = q.filter(Document.forgery_status == forgery_status)
    if suspicious_only:
        q = q.filter(Document.forgery_status == "suspicious")
    if pending_review:
        q = q.filter(Document.review_status.in_(["pending", "manual_review"]))
    total = q.count()
    rows = q.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [
        DocumentListItem(
            id=d.id,
            original_filename=d.original_filename,
            predicted_category=d.predicted_category,
            category_hint=d.category_hint,
            created_at=d.created_at,
            classification_source=d.classification_source,
            forgery_status=d.forgery_status,
            review_status=d.review_status,
            processing_status=d.processing_status,
        )
        for d in rows
    ]
    return DocumentListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{document_id}", response_model=DocumentDetail)
def get_document(
    document_id: str,
    reveal: bool = Query(False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _to_detail(doc, reveal=reveal)


@router.get("/{document_id}/file")
def get_document_file(
    document_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    path = resolve_stored_path(doc.stored_filename)
    return FileResponse(path, media_type=doc.mime_type, filename=doc.original_filename)


@router.get("/{document_id}/ela")
def get_ela_image(
    document_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not doc.ela_stored_filename:
        raise HTTPException(status_code=404, detail="ELA visualization not available.")
    path = resolve_stored_path(doc.ela_stored_filename)
    return FileResponse(path, media_type="image/png")


@router.patch("/{document_id}/review")
def update_review(
    document_id: str,
    body: ReviewUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    action = body.action.lower()
    comment = body.comment
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    mapping = {
        "approve": ReviewStatus.APPROVED.value,
        "reject": ReviewStatus.REJECTED.value,
        "manual_review": ReviewStatus.MANUAL_REVIEW.value,
        "escalate": ReviewStatus.MANUAL_REVIEW.value,
    }
    if action not in mapping:
        raise HTTPException(status_code=400, detail="Invalid action.")

    if action in ("reject", "escalate") and not (comment and comment.strip()):
        raise HTTPException(status_code=400, detail="Comment required for rejection or escalation.")

    doc.review_status = mapping[action]
    doc.reviewer_id = user.id
    doc.reviewer_comment = comment
    doc.reviewed_at = datetime.now(timezone.utc)
    db.commit()

    audit_action = {
        "approve": "document_approved",
        "reject": "document_rejected",
        "manual_review": "document_marked_for_review",
        "escalate": "document_escalated",
    }[action]
    log_action(
        db,
        audit_action,
        document_id=doc.id,
        actor_id=user.id,
        actor_email=user.email,
        details={"comment": comment or ""},
    )
    return {"message": "Review updated.", "review_status": doc.review_status}


@router.get("/{document_id}/report")
def download_report(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    pdf_bytes = build_pdf_report(doc)
    log_action(
        db,
        "report_downloaded",
        document_id=doc.id,
        actor_id=user.id,
        actor_email=user.email,
        details={},
    )
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="analysis-{doc.id[:8]}.pdf"'},
    )
