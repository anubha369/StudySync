from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, StudySession
from app.schemas import StudySessionCreate, StudySessionUpdate, StudySessionResponse
from app.deps import get_current_user

router = APIRouter(prefix="/api/sessions", tags=["study_sessions"])

@router.get("", response_model=List[StudySessionResponse])
def get_study_sessions(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(StudySession).filter(StudySession.user_id == current_user.id)

    if from_date:
        query = query.filter(StudySession.date >= from_date)
    if to_date:
        query = query.filter(StudySession.date <= to_date)

    query = query.order_by(StudySession.date.asc(), StudySession.start_time.asc())
    return query.all()

@router.post("", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
def create_study_session(
    session_in: StudySessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_session = StudySession(
        user_id=current_user.id,
        title=session_in.title.strip(),
        subject=session_in.subject.strip(),
        date=session_in.date,
        start_time=session_in.start_time,
        duration_minutes=session_in.duration_minutes,
        completed=bool(session_in.completed)
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.get("/{session_id}", response_model=StudySessionResponse)
def get_study_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study session not found")
    return session

@router.put("/{session_id}", response_model=StudySessionResponse)
def update_study_session(
    session_id: str,
    session_in: StudySessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study session not found")

    update_data = session_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if isinstance(value, str):
            setattr(session, field, value.strip())
        else:
            setattr(session, field, value)

    db.commit()
    db.refresh(session)
    return session

@router.patch("/{session_id}/toggle-complete", response_model=StudySessionResponse)
def toggle_study_session_complete(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study session not found")

    session.completed = not session.completed
    db.commit()
    db.refresh(session)
    return session

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_study_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(StudySession).filter(
        StudySession.id == session_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study session not found")

    db.delete(session)
    db.commit()
    return None
