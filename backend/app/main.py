import os
from pathlib import Path
from datetime import datetime, date, timedelta, timezone
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, SessionLocal, Base
from app.models import User, Profile, Task, StudySession, FocusSession
from app.security import hash_password
from app.routers import auth, tasks, planner, focus, profile, data, analytics

# Resolve Frontend path
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"

def seed_demo_data(db):
    """Seed demo account if it doesn't already exist."""
    demo_email = "demo@studysync.app"
    existing = db.query(User).filter(User.email == demo_email).first()
    if existing:
        return

    # Create demo user
    demo_user = User(
        email=demo_email,
        password_hash=hash_password("demo123456")
    )
    db.add(demo_user)
    db.flush()

    # Profile
    demo_profile = Profile(
        user_id=demo_user.id,
        display_name="Alex Chen",
        college="Tech Institute",
        course="Computer Science",
        year="3rd Year",
        avatar=None,
        theme="system"
    )
    db.add(demo_profile)

    # Relative dates
    today = date.today()
    d_minus_2 = (today - timedelta(days=2)).strftime("%Y-%m-%d")
    yesterday = (today - timedelta(days=1)).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")
    tomorrow = (today + timedelta(days=1)).strftime("%Y-%m-%d")
    next_week = (today + timedelta(days=5)).strftime("%Y-%m-%d")

    # Sample tasks
    demo_tasks = [
        Task(
            user_id=demo_user.id,
            title="Complete CS106B Binary Trees Assignment",
            subject="Data Structures",
            description="Implement AVL tree balancing and traversal algorithms with test cases.",
            due_date=today_str,
            priority="high",
            status="pending"
        ),
        Task(
            user_id=demo_user.id,
            title="Prepare Linear Algebra Problem Set 4",
            subject="Mathematics",
            description="Eigenvalues, eigenvectors, and singular value decomposition exercises.",
            due_date=tomorrow,
            priority="medium",
            status="pending"
        ),
        Task(
            user_id=demo_user.id,
            title="Review OS Memory Management Slides",
            subject="Operating Systems",
            description="Virtual memory, paging, page replacement algorithms (LRU, FIFO).",
            due_date=yesterday,
            priority="high",
            status="pending"
        ),
        Task(
            user_id=demo_user.id,
            title="Read Web Architecture Chapter 5",
            subject="Web Development",
            description="RESTful API design and database caching strategies.",
            due_date=d_minus_2,
            priority="low",
            status="completed",
            completed_at=datetime.now(timezone.utc) - timedelta(days=2)
        ),
        Task(
            user_id=demo_user.id,
            title="Revise Database Normalization (3NF & BCNF)",
            subject="Databases",
            description="Study functional dependencies and lossless join decomposition.",
            due_date=next_week,
            priority="medium",
            status="pending"
        )
    ]
    db.add_all(demo_tasks)

    # Sample study sessions
    demo_sessions = [
        StudySession(
            user_id=demo_user.id,
            title="Tree Traversal Algorithm Practice",
            subject="Data Structures",
            date=today_str,
            start_time="14:00",
            duration_minutes=60,
            completed=False
        ),
        StudySession(
            user_id=demo_user.id,
            title="Matrix Decomposition Review",
            subject="Mathematics",
            date=yesterday,
            start_time="10:00",
            duration_minutes=90,
            completed=True
        ),
        StudySession(
            user_id=demo_user.id,
            title="Deadlock Detection & Prevention",
            subject="Operating Systems",
            date=tomorrow,
            start_time="15:30",
            duration_minutes=45,
            completed=False
        )
    ]
    db.add_all(demo_sessions)

    # Sample focus sessions
    demo_focus = [
        FocusSession(
            id=str(uuid.uuid4()),
            user_id=demo_user.id,
            mode="focus",
            duration_minutes=25,
            completed_at=datetime.now(timezone.utc) - timedelta(hours=2),
            local_date=today_str
        ),
        FocusSession(
            id=str(uuid.uuid4()),
            user_id=demo_user.id,
            mode="focus",
            duration_minutes=25,
            completed_at=datetime.now(timezone.utc) - timedelta(days=1, hours=3),
            local_date=yesterday
        ),
        FocusSession(
            id=str(uuid.uuid4()),
            user_id=demo_user.id,
            mode="focus",
            duration_minutes=25,
            completed_at=datetime.now(timezone.utc) - timedelta(days=1, hours=1),
            local_date=yesterday
        ),
        FocusSession(
            id=str(uuid.uuid4()),
            user_id=demo_user.id,
            mode="focus",
            duration_minutes=25,
            completed_at=datetime.now(timezone.utc) - timedelta(days=2, hours=4),
            local_date=d_minus_2
        )
    ]
    db.add_all(demo_focus)

    db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Seed demo account
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="StudySync API",
    description="Backend API for StudySync Student Productivity Application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
origins = settings.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/api/health", tags=["system"])
def health_check():
    db_status = "connected"
    try:
        db = SessionLocal()
        # Test query
        db.execute(Base.metadata.tables["users"].select().limit(1))
        db.close()
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status
    }

# Register Routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(planner.router)
app.include_router(focus.router)
app.include_router(profile.router)
app.include_router(data.router)
app.include_router(analytics.router)

# Mount Frontend static files
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
