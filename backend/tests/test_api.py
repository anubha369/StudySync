import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database import Base, get_db

# Use an in-memory SQLite database with StaticPool for test isolation
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def register_user(client, email="user@test.com", password="password123", display_name="Test Student"):
    return client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "display_name": display_name}
    )

def login_user(client, email="user@test.com", password="password123"):
    return client.post(
        "/api/auth/login",
        json={"email": email, "password": password}
    )

def get_auth_headers(client, email="user@test.com", password="password123", display_name="Test Student"):
    res = register_user(client, email, password, display_name)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# ----------------- 1. Health Check Tests -----------------
def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

# ----------------- 2. Auth Tests -----------------
def test_register_and_login(client):
    # Register
    reg_res = register_user(client, "alice@univ.edu", "secretpass123", "Alice")
    assert reg_res.status_code == 201
    assert "access_token" in reg_res.json()

    # Login
    login_res = login_user(client, "alice@univ.edu", "secretpass123")
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    # Me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "alice@univ.edu"
    assert me_data["profile"]["display_name"] == "Alice"

def test_register_duplicate_email(client):
    res1 = register_user(client, "bob@univ.edu", "password123", "Bob")
    assert res1.status_code == 201

    res2 = register_user(client, "bob@univ.edu", "differentpass", "Bob 2")
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()

def test_login_invalid_credentials(client):
    register_user(client, "clara@univ.edu", "mypassword1", "Clara")
    wrong_pass = login_user(client, "clara@univ.edu", "wrongpassword")
    assert wrong_pass.status_code == 401
    assert "invalid email or password" in wrong_pass.json()["detail"].lower()

# ----------------- 3. Tasks & User Isolation Tests -----------------
def test_task_crud_and_toggle(client):
    headers = get_auth_headers(client, "david@univ.edu", "password123", "David")

    # Create task
    task_payload = {
        "title": "Study Discrete Mathematics",
        "subject": "Mathematics",
        "description": "Graph theory notes and proofs",
        "due_date": "2026-10-25",
        "priority": "high"
    }
    create_res = client.post("/api/tasks", json=task_payload, headers=headers)
    assert create_res.status_code == 201
    task_data = create_res.json()
    task_id = task_data["id"]
    assert task_data["title"] == "Study Discrete Mathematics"
    assert task_data["status"] == "pending"

    # Toggle task to completed
    toggle_res = client.patch(f"/api/tasks/{task_id}/toggle", headers=headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["status"] == "completed"
    assert toggle_res.json()["completed_at"] is not None

    # Toggle back to pending
    toggle_back = client.patch(f"/api/tasks/{task_id}/toggle", headers=headers)
    assert toggle_back.status_code == 200
    assert toggle_back.json()["status"] == "pending"
    assert toggle_back.json()["completed_at"] is None

    # Delete task
    del_res = client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert del_res.status_code == 204

    # Get deleted task -> 404
    get_res = client.get(f"/api/tasks/{task_id}", headers=headers)
    assert get_res.status_code == 404

def test_user_data_isolation(client):
    """User A must never be able to access or mutate User B's tasks."""
    headers_a = get_auth_headers(client, "user_a@univ.edu", "password123", "User A")
    headers_b = get_auth_headers(client, "user_b@univ.edu", "password123", "User B")

    # User A creates a task
    res = client.post("/api/tasks", json={
        "title": "Private Research Paper",
        "subject": "AI",
        "description": "Confidential",
        "due_date": "2026-10-30",
        "priority": "high"
    }, headers=headers_a)
    task_id_a = res.json()["id"]

    # User B attempts to read User A's task -> 404 Not Found
    res_b_read = client.get(f"/api/tasks/{task_id_a}", headers=headers_b)
    assert res_b_read.status_code == 404

    # User B attempts to edit User A's task -> 404 Not Found
    res_b_edit = client.put(f"/api/tasks/{task_id_a}", json={"title": "Hacked Title"}, headers=headers_b)
    assert res_b_edit.status_code == 404

    # User B attempts to toggle User A's task -> 404 Not Found
    res_b_toggle = client.patch(f"/api/tasks/{task_id_a}/toggle", headers=headers_b)
    assert res_b_toggle.status_code == 404

    # User B attempts to delete User A's task -> 404 Not Found
    res_b_del = client.delete(f"/api/tasks/{task_id_a}", headers=headers_b)
    assert res_b_del.status_code == 404

# ----------------- 4. Study Sessions Tests -----------------
def test_study_sessions(client):
    headers = get_auth_headers(client, "emma@univ.edu", "password123", "Emma")

    sess_payload = {
        "title": "Calculus Review Session",
        "subject": "Mathematics",
        "date": "2026-10-22",
        "start_time": "14:00",
        "duration_minutes": 60,
        "completed": False
    }
    create_res = client.post("/api/sessions", json=sess_payload, headers=headers)
    assert create_res.status_code == 201
    sess_id = create_res.json()["id"]

    # Toggle complete
    toggle_res = client.patch(f"/api/sessions/{sess_id}/toggle-complete", headers=headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["completed"] is True

    # Filter by date range
    list_res = client.get("/api/sessions?from=2026-10-20&to=2026-10-25", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

# ----------------- 5. Focus Session Idempotency -----------------
def test_focus_session_idempotent(client):
    headers = get_auth_headers(client, "frank@univ.edu", "password123", "Frank")
    client_uuid = "client-uuid-123456789"

    focus_payload = {
        "id": client_uuid,
        "mode": "focus",
        "duration_minutes": 25,
        "local_date": "2026-10-18"
    }

    # First POST
    res1 = client.post("/api/focus", json=focus_payload, headers=headers)
    assert res1.status_code == 201

    # Second POST with the exact same ID (e.g. client retry after network glitch)
    res2 = client.post("/api/focus", json=focus_payload, headers=headers)
    assert res2.status_code in [200, 201]
    assert res2.json()["id"] == client_uuid

    # Check history contains exactly 1 item
    history_res = client.get("/api/focus", headers=headers)
    assert history_res.status_code == 200
    assert len(history_res.json()) == 1

# ----------------- 6. Data Export & Reset -----------------
def test_data_export_and_reset(client):
    headers = get_auth_headers(client, "grace@univ.edu", "password123", "Grace")

    # Add a task
    client.post("/api/tasks", json={
        "title": "Grace's task",
        "subject": "Physics",
        "due_date": "2026-10-28",
        "priority": "low"
    }, headers=headers)

    # Export
    export_res = client.get("/api/export", headers=headers)
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert len(export_data["tasks"]) == 1

    # Delete without confirm -> 400
    del_fail = client.request("DELETE", "/api/data", json={"confirm": False}, headers=headers)
    assert del_fail.status_code == 400

    # Delete with confirm -> 200
    del_ok = client.request("DELETE", "/api/data", json={"confirm": True}, headers=headers)
    assert del_ok.status_code == 200

    # Verify tasks are empty
    tasks_res = client.get("/api/tasks", headers=headers)
    assert tasks_res.status_code == 200
    assert len(tasks_res.json()) == 0

# ----------------- 7. Analytics Summary Test -----------------
def test_analytics_summary(client):
    headers = get_auth_headers(client, "helen@univ.edu", "password123", "Helen")

    # Add a task
    client.post("/api/tasks", json={
        "title": "Discrete Math Quiz",
        "subject": "Mathematics",
        "due_date": "2026-10-18",
        "priority": "high"
    }, headers=headers)

    res = client.get("/api/analytics/summary?today=2026-10-18", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_tasks"] == 1
    assert data["pending_tasks"] == 1
    assert data["completed_tasks"] == 0
    assert "Mathematics" in data["subject_distribution"]
    assert len(data["study_minutes_last_7_days"]) == 7

