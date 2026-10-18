import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    func
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="user", cascade="all, delete-orphan")
    focus_sessions = relationship("FocusSession", back_populates="user", cascade="all, delete-orphan")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    display_name = Column(String(100), default="Student", nullable=False)
    college = Column(String(120), default="", nullable=False)
    course = Column(String(120), default="", nullable=False)
    year = Column(String(50), default="", nullable=False)
    avatar = Column(Text, nullable=True) # Base64 text up to ~300KB
    theme = Column(String(20), default="system", nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="profile")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(120), nullable=False)
    subject = Column(String(60), nullable=False)
    description = Column(Text, nullable=True, default="")
    due_date = Column(String(10), index=True, nullable=False) # Format: YYYY-MM-DD
    priority = Column(String(20), default="medium", nullable=False) # low, medium, high
    status = Column(String(20), default="pending", index=True, nullable=False) # pending, completed
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="tasks")

class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(120), nullable=False)
    subject = Column(String(60), nullable=False)
    date = Column(String(10), index=True, nullable=False) # Format: YYYY-MM-DD
    start_time = Column(String(10), nullable=False) # Format: HH:MM
    duration_minutes = Column(Integer, default=45, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="study_sessions")

class FocusSession(Base):
    __tablename__ = "focus_sessions"

    # Client-generated UUID string as ID
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    mode = Column(String(30), default="focus", nullable=False) # focus, short_break, long_break
    duration_minutes = Column(Integer, default=25, nullable=False)
    completed_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    local_date = Column(String(10), index=True, nullable=False) # Format: YYYY-MM-DD
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="focus_sessions")
