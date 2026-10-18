from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.database import get_db
from app.models import User, Task
from app.schemas import TaskCreate, TaskUpdate, TaskResponse
from app.deps import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

@router.get("", response_model=List[TaskResponse])
def get_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    subject_filter: Optional[str] = Query(None, alias="subject"),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query("due_date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if status_filter:
        query = query.filter(Task.status == status_filter)
    if priority_filter:
        query = query.filter(Task.priority == priority_filter)
    if subject_filter:
        query = query.filter(Task.subject == subject_filter)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Task.title.ilike(search_term),
                Task.subject.ilike(search_term),
                Task.description.ilike(search_term)
            )
        )

    # Sorting
    if sort == "priority":
        # high > medium > low
        # In SQLite, we can order by CASE statement or simple order
        from sqlalchemy import case
        priority_order = case(
            (Task.priority == "high", 1),
            (Task.priority == "medium", 2),
            (Task.priority == "low", 3),
            else_=4
        )
        query = query.order_by(priority_order.asc(), Task.due_date.asc())
    elif sort == "-due_date":
        query = query.order_by(Task.due_date.desc(), Task.created_at.desc())
    else: # Default due_date ascending
        query = query.order_by(Task.due_date.asc(), Task.created_at.desc())

    return query.all()

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_task = Task(
        user_id=current_user.id,
        title=task_in.title.strip(),
        subject=task_in.subject.strip(),
        description=(task_in.description or "").strip(),
        due_date=task_in.due_date,
        priority=task_in.priority,
        status="pending",
        completed_at=None
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    task_in: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    update_data = task_in.model_dump(exclude_unset=True)
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == "completed" and task.status != "completed":
            task.completed_at = datetime.now(timezone.utc)
        elif new_status == "pending" and task.status != "pending":
            task.completed_at = None

    for field, value in update_data.items():
        if isinstance(value, str):
            setattr(task, field, value.strip())
        else:
            setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task

@router.patch("/{task_id}/toggle", response_model=TaskResponse)
def toggle_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if task.status == "completed":
        task.status = "pending"
        task.completed_at = None
    else:
        task.status = "completed"
        task.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    db.delete(task)
    db.commit()
    return None
