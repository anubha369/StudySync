from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
import re

# ----------------- Base Config -----------------
class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ----------------- Auth & User -----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    display_name: str = Field("Student", min_length=1, max_length=100)

    @field_validator("email")
    @classmethod
    def email_to_lower(cls, v: str) -> str:
        return v.lower().strip()

class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def email_to_lower(cls, v: str) -> str:
        return v.lower().strip()

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ----------------- Profile -----------------
class ProfileBase(BaseModel):
    display_name: str = Field("Student", min_length=1, max_length=100)
    college: str = Field("", max_length=120)
    course: str = Field("", max_length=120)
    year: str = Field("", max_length=50)
    avatar: Optional[str] = Field(None, max_length=450000, description="Optional base64 image (max ~300KB)")
    theme: str = Field("system", pattern="^(system|light|dark)$")

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    college: Optional[str] = Field(None, max_length=120)
    course: Optional[str] = Field(None, max_length=120)
    year: Optional[str] = Field(None, max_length=50)
    avatar: Optional[str] = Field(None, max_length=450000)
    theme: Optional[str] = Field(None, pattern="^(system|light|dark)$")

class ProfileResponse(ProfileBase, OrmBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

class UserResponse(OrmBase):
    id: str
    email: str
    created_at: datetime
    profile: Optional[ProfileResponse] = None

# ----------------- Tasks -----------------
class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    subject: str = Field(..., min_length=1, max_length=60)
    description: Optional[str] = Field("", max_length=1000)
    due_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    priority: str = Field("medium", pattern="^(low|medium|high)$")

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    subject: Optional[str] = Field(None, min_length=1, max_length=60)
    description: Optional[str] = Field(None, max_length=1000)
    due_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    status: Optional[str] = Field(None, pattern="^(pending|completed)$")

class TaskResponse(TaskBase, OrmBase):
    id: str
    user_id: str
    status: str
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# ----------------- Study Sessions (Planner) -----------------
class StudySessionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    subject: str = Field(..., min_length=1, max_length=60)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    duration_minutes: int = Field(45, ge=1, le=600)

class StudySessionCreate(StudySessionBase):
    completed: Optional[bool] = False

class StudySessionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    subject: Optional[str] = Field(None, min_length=1, max_length=60)
    date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    start_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    duration_minutes: Optional[int] = Field(None, ge=1, le=600)
    completed: Optional[bool] = None

class StudySessionResponse(StudySessionBase, OrmBase):
    id: str
    user_id: str
    completed: bool
    created_at: datetime
    updated_at: datetime

# ----------------- Focus Sessions -----------------
class FocusSessionCreate(BaseModel):
    id: str = Field(..., min_length=10, max_length=40, description="Client-generated unique UUID")
    mode: str = Field("focus", pattern="^(focus|short_break|long_break)$")
    duration_minutes: int = Field(25, ge=1, le=600)
    completed_at: Optional[datetime] = None
    local_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")

class FocusSessionResponse(OrmBase):
    id: str
    user_id: str
    mode: str
    duration_minutes: int
    completed_at: datetime
    local_date: str
    created_at: datetime
    updated_at: datetime

# ----------------- Data Export / Import -----------------
class ExportDataResponse(BaseModel):
    exported_at: datetime
    user: Dict[str, Any]
    profile: Optional[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    study_sessions: List[Dict[str, Any]]
    focus_sessions: List[Dict[str, Any]]

class ImportDataRequest(BaseModel):
    tasks: Optional[List[Dict[str, Any]]] = None
    sessions: Optional[List[Dict[str, Any]]] = None
    timer: Optional[Dict[str, Any]] = None
    profile: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None

class DeleteDataConfirmation(BaseModel):
    confirm: bool

# ----------------- Analytics -----------------
class DayStudyMinutes(BaseModel):
    date: str
    label: str
    minutes: int

class AnalyticsSummaryResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    overdue_tasks: int
    completion_rate: float
    subject_distribution: Dict[str, int]
    study_minutes_last_7_days: List[DayStudyMinutes]
