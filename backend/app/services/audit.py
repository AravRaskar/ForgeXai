from sqlalchemy.orm import Session

from app.models.entities import AuditLog


def log_action(
    db: Session,
    action: str,
    *,
    document_id: str | None = None,
    actor_id: str | None = None,
    actor_email: str | None = None,
    details: dict | None = None,
) -> None:
    entry = AuditLog(
        action=action,
        document_id=document_id,
        actor_id=actor_id,
        actor_email=actor_email,
        details=details or {},
    )
    db.add(entry)
    db.commit()
