from datetime import datetime, timedelta
from typing import Dict, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Task, StudySession, FocusSession
from app.schemas import AnalyticsSummaryResponse, DayStudyMinutes
from app.deps import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(
    today: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Today's local date in YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "completed")
    pending_tasks = sum(1 for t in tasks if t.status == "pending")
    overdue_tasks = sum(1 for t in tasks if t.status == "pending" and t.due_date < today)
    completion_rate = round((completed_tasks / total_tasks) * 100, 1) if total_tasks > 0 else 0.0

    # Subject distribution
    subject_dist: Dict[str, int] = {}
    for t in tasks:
        subj = t.subject or "Unassigned"
        subject_dist[subj] = subject_dist.get(subj, 0) + 1

    # Calculate last 7 days ending at `today`
    today_dt = datetime.strptime(today, "%Y-%m-%d").date()
    dates_7 = [(today_dt - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)]

    # Study minutes per day from completed StudySessions and FocusSessions
    study_sessions = (
        db.query(StudySession)
        .filter(
            StudySession.user_id == current_user.id,
            StudySession.completed == True,
            StudySession.date.in_(dates_7)
        )
        .all()
    )

    focus_sessions = (
        db.query(FocusSession)
        .filter(
            FocusSession.user_id == current_user.id,
            FocusSession.mode == "focus",
            FocusSession.local_date.in_(dates_7)
        )
        .all()
    )

    minutes_map: Dict[str, int] = {d: 0 for d in dates_7}
    for s in study_sessions:
        if s.date in minutes_map:
            minutes_map[s.date] += s.duration_minutes
    for f in focus_sessions:
        if f.local_date in minutes_map:
            minutes_map[f.local_date] += f.duration_minutes

    day_study_list: List[DayStudyMinutes] = []
    for d_str in dates_7:
        d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
        label = d_obj.strftime("%a") # e.g. "Mon"
        day_study_list.append(
            DayStudyMinutes(
                date=d_str,
                label=label,
                minutes=minutes_map[d_str]
            )
        )

    return AnalyticsSummaryResponse(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        overdue_tasks=overdue_tasks,
        completion_rate=completion_rate,
        subject_distribution=subject_dist,
        study_minutes_last_7_days=day_study_list
    )
