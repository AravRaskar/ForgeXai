from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.database.session import Base, SessionLocal, engine
from app.models.entities import User


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _seed_demo_user(db)
    finally:
        db.close()


def _seed_demo_user(db: Session) -> None:
    settings = get_settings()
    existing = db.query(User).filter(User.email == settings.demo_user_email).first()
    if existing:
        return
    user = User(
        email=settings.demo_user_email,
        full_name=settings.demo_user_name,
        hashed_password=hash_password(settings.demo_user_password),
    )
    db.add(user)
    db.commit()
