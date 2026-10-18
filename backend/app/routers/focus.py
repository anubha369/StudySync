from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, FocusSession
from app.schemas import FocusSessionCreate, FocusSessionResponse
from app.deps import get_current_user

router = APIRouter(prefix="/api/focus", tags=["focus"])

@router.get("", response_model=List[FocusSessionResponse])
def get_focus_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = (
        db.query(FocusSession)
        .filter(FocusSession.user_id == current_user.id)
        .order_by(FocusSession.completed_at.desc())
        .all()
    )
    return sessions

@router.post("", response_model=FocusSessionResponse, status_code=status.HTTP_201_CREATED)
def record_focus_session(
    session_in: FocusSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Idempotent check: if session with this ID already exists for this user, return it
    existing = db.query(FocusSession).filter(
        FocusSession.id == session_in.id,
        FocusSession.user_id == current_user.id
    ).first()

    if existing:
        return existing

    new_session = FocusSession(
        id=session_in.id,
        user_id=current_user.id,
        mode=session_in.mode,
        duration_minutes=session_in.duration_minutes,
        completed_at=session_in.completed_at or datetime.now(timezone.utc),
        local_date=session_in.local_date
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session
