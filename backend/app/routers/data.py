import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Profile, Task, StudySession, FocusSession
from app.schemas import ImportDataRequest, DeleteDataConfirmation
from app.deps import get_current_user

router = APIRouter(prefix="/api", tags=["data"])

@router.get("/export")
def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    sessions = db.query(StudySession).filter(StudySession.user_id == current_user.id).all()
    focus_sessions = db.query(FocusSession).filter(FocusSession.user_id == current_user.id).all()

    export_payload = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "version": "1.0",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "profile": {
            "display_name": profile.display_name if profile else "Student",
            "college": profile.college if profile else "",
            "course": profile.course if profile else "",
            "year": profile.year if profile else "",
            "avatar": profile.avatar if profile else None,
            "theme": profile.theme if profile else "system",
        } if profile else None,
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "subject": t.subject,
                "description": t.description,
                "due_date": t.due_date,
                "priority": t.priority,
                "status": t.status,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            }
            for t in tasks
        ],
        "study_sessions": [
            {
                "id": s.id,
                "title": s.title,
                "subject": s.subject,
                "date": s.date,
                "start_time": s.start_time,
                "duration_minutes": s.duration_minutes,
                "completed": s.completed,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            }
            for s in sessions
        ],
        "focus_sessions": [
            {
                "id": f.id,
                "mode": f.mode,
                "duration_minutes": f.duration_minutes,
                "completed_at": f.completed_at.isoformat() if f.completed_at else None,
                "local_date": f.local_date,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "updated_at": f.updated_at.isoformat() if f.updated_at else None,
            }
            for f in focus_sessions
        ]
    }

    content = json.dumps(export_payload, indent=2)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=studysync-export.json"}
    )

@router.post("/import")
def import_user_data(
    payload: ImportDataRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tasks_count = 0
    sessions_count = 0
    focus_count = 0

    # 1. Import Profile
    if payload.profile:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if not profile:
            profile = Profile(user_id=current_user.id)
            db.add(profile)
        
        display_name = payload.profile.get("display_name") or payload.profile.get("displayName")
        if display_name:
            profile.display_name = str(display_name)[:100]
        if "college" in payload.profile:
            profile.college = str(payload.profile["college"])[:120]
        if "course" in payload.profile:
            profile.course = str(payload.profile["course"])[:120]
        if "year" in payload.profile:
            profile.year = str(payload.profile["year"])[:50]
        if "avatar" in payload.profile:
            profile.avatar = payload.profile["avatar"]
        if "theme" in payload.profile and payload.profile["theme"] in ["system", "light", "dark"]:
            profile.theme = payload.profile["theme"]

    # 2. Import Tasks
    if payload.tasks and isinstance(payload.tasks, list):
        for t in payload.tasks:
            title = t.get("title")
            subject = t.get("subject")
            due_date = t.get("due_date") or t.get("dueDate")
            if not title or not subject or not due_date:
                continue

            priority = t.get("priority", "medium")
            if priority not in ["low", "medium", "high"]:
                priority = "medium"

            status_val = t.get("status", "pending")
            if status_val not in ["pending", "completed"]:
                status_val = "pending"

            description = t.get("description", "")
            task_id = t.get("id")

            # Check if existing task with this id
            existing_task = None
            if task_id:
                existing_task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()

            if existing_task:
                existing_task.title = str(title)[:120]
                existing_task.subject = str(subject)[:60]
                existing_task.description = str(description)[:1000]
                existing_task.due_date = str(due_date)[:10]
                existing_task.priority = priority
                existing_task.status = status_val
            else:
                new_task = Task(
                    id=str(task_id) if task_id else None,
                    user_id=current_user.id,
                    title=str(title)[:120],
                    subject=str(subject)[:60],
                    description=str(description)[:1000],
                    due_date=str(due_date)[:10],
                    priority=priority,
                    status=status_val
                )
                db.add(new_task)
            tasks_count += 1

    # 3. Import Sessions
    if payload.sessions and isinstance(payload.sessions, list):
        for s in payload.sessions:
            title = s.get("title")
            subject = s.get("subject")
            date_val = s.get("date")
            start_time = s.get("start_time") or s.get("startTime", "09:00")
            if not title or not subject or not date_val:
                continue

            duration = s.get("duration_minutes") or s.get("durationMinutes", 45)
            try:
                duration = int(duration)
                if duration < 1 or duration > 600:
                    duration = 45
            except (ValueError, TypeError):
                duration = 45

            completed = bool(s.get("completed", False))
            session_id = s.get("id")

            existing_session = None
            if session_id:
                existing_session = db.query(StudySession).filter(StudySession.id == session_id, StudySession.user_id == current_user.id).first()

            if existing_session:
                existing_session.title = str(title)[:120]
                existing_session.subject = str(subject)[:60]
                existing_session.date = str(date_val)[:10]
                existing_session.start_time = str(start_time)[:10]
                existing_session.duration_minutes = duration
                existing_session.completed = completed
            else:
                new_session = StudySession(
                    id=str(session_id) if session_id else None,
                    user_id=current_user.id,
                    title=str(title)[:120],
                    subject=str(subject)[:60],
                    date=str(date_val)[:10],
                    start_time=str(start_time)[:10],
                    duration_minutes=duration,
                    completed=completed
                )
                db.add(new_session)
            sessions_count += 1

    # 4. Import Timer / Focus History
    focus_list = []
    if payload.timer and isinstance(payload.timer, dict) and "history" in payload.timer:
        focus_list = payload.timer["history"]
    elif payload.timer and isinstance(payload.timer, list):
        focus_list = payload.timer

    if isinstance(focus_list, list):
        for f in focus_list:
            fid = f.get("id")
            if not fid:
                continue
            existing_f = db.query(FocusSession).filter(FocusSession.id == fid, FocusSession.user_id == current_user.id).first()
            if not existing_f:
                mode = f.get("mode", "focus")
                duration = f.get("duration_minutes") or f.get("durationMinutes", 25)
                local_date = f.get("local_date") or f.get("localDate") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
                completed_at_str = f.get("completed_at") or f.get("completedAt")
                completed_at = datetime.now(timezone.utc)
                if completed_at_str:
                    try:
                        completed_at = datetime.fromisoformat(completed_at_str.replace("Z", "+00:00"))
                    except Exception:
                        pass
                
                new_f = FocusSession(
                    id=str(fid),
                    user_id=current_user.id,
                    mode=mode,
                    duration_minutes=int(duration),
                    completed_at=completed_at,
                    local_date=str(local_date)[:10]
                )
                db.add(new_f)
                focus_count += 1

    db.commit()
    return {
        "message": "Data imported successfully",
        "tasks_imported": tasks_count,
        "sessions_imported": sessions_count,
        "focus_sessions_imported": focus_count
    }

@router.delete("/data")
def delete_user_data(
    body: DeleteDataConfirmation,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not body.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation flag must be true to delete all user data"
        )

    # Delete all tasks, study sessions, and focus sessions
    db.query(Task).filter(Task.user_id == current_user.id).delete()
    db.query(StudySession).filter(StudySession.user_id == current_user.id).delete()
    db.query(FocusSession).filter(FocusSession.user_id == current_user.id).delete()

    # Reset profile to defaults
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if profile:
        profile.display_name = "Student"
        profile.college = ""
        profile.course = ""
        profile.year = ""
        profile.avatar = None
        profile.theme = "system"

    db.commit()
    return {"message": "All user data deleted successfully"}
