from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.entities import Document, ForgeryStatus, ProcessingStatus, ReviewStatus, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    total = db.query(func.count(Document.id)).scalar() or 0
    classified = (
        db.query(func.count(Document.id))
        .filter(Document.processing_status == ProcessingStatus.COMPLETED.value)
        .filter(Document.predicted_category.isnot(None))
        .scalar()
        or 0
    )
    suspicious = (
        db.query(func.count(Document.id))
        .filter(Document.forgery_status == ForgeryStatus.SUSPICIOUS.value)
        .scalar()
        or 0
    )
    manual = (
        db.query(func.count(Document.id))
        .filter(
            Document.review_status == ReviewStatus.MANUAL_REVIEW.value,
        )
        .scalar()
        or 0
    ) + (
        db.query(func.count(Document.id))
        .filter(Document.forgery_status == ForgeryStatus.MANUAL_REVIEW.value)
        .scalar()
        or 0
    )

    recent = (
        db.query(Document)
        .order_by(Document.created_at.desc())
        .limit(8)
        .all()
    )
    recent_items = [
        {
            "id": d.id,
            "original_filename": d.original_filename,
            "predicted_category": d.predicted_category,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "review_status": d.review_status,
            "forgery_status": d.forgery_status,
            "processing_status": d.processing_status,
        }
        for d in recent
    ]

    categories = (
        db.query(Document.predicted_category, func.count(Document.id))
        .filter(Document.predicted_category.isnot(None))
        .group_by(Document.predicted_category)
        .all()
    )
    category_chart = [{"category": c or "Unknown", "count": n} for c, n in categories]

    genuine = db.query(func.count(Document.id)).filter(
        Document.forgery_status == ForgeryStatus.NO_SUSPICIOUS.value
    ).scalar() or 0
    sus = db.query(func.count(Document.id)).filter(
        Document.forgery_status == ForgeryStatus.SUSPICIOUS.value
    ).scalar() or 0
    mr = db.query(func.count(Document.id)).filter(
        Document.forgery_status == ForgeryStatus.MANUAL_REVIEW.value
    ).scalar() or 0

    since = datetime.now(timezone.utc) - timedelta(days=7)
    activity = (
        db.query(func.date(Document.created_at), func.count(Document.id))
        .filter(Document.created_at >= since)
        .group_by(func.date(Document.created_at))
        .all()
    )
    activity_chart = [{"date": str(day), "count": cnt} for day, cnt in activity]

    return {
        "totals": {
            "processed": total,
            "classified": classified,
            "suspicious": suspicious,
            "manual_review": manual,
        },
        "category_distribution": category_chart,
        "forgery_distribution": [
            {"label": "No suspicious indicators", "count": genuine},
            {"label": "Suspicious indicators", "count": sus},
            {"label": "Manual review", "count": mr},
        ],
        "recent_uploads": recent_items,
        "weekly_activity": activity_chart,
    }
