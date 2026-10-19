import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List
import bcrypt
import jwt
from app.config import settings

# ----------------- Password Hashing (Direct bcrypt) -----------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

# ----------------- JWT Token Creation & Verification -----------------
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        return payload
    except jwt.PyJWTError:
        return None

# ----------------- In-Memory Failed Login Throttling -----------------
# Simple memory store tracking recent failed login attempts per email/IP.
# Note: In-memory store resets on server restart and is not shared across multi-worker clusters.
_failed_login_attempts: Dict[str, List[float]] = {}

def is_login_throttled(identifier: str, max_attempts: int = 5, lockout_seconds: int = 300) -> bool:
    now = time.time()
    attempts = _failed_login_attempts.get(identifier, [])
    # Filter attempts within lockout window
    recent_attempts = [ts for ts in attempts if now - ts < lockout_seconds]
    _failed_login_attempts[identifier] = recent_attempts
    return len(recent_attempts) >= max_attempts

def record_failed_login(identifier: str):
    now = time.time()
    if identifier not in _failed_login_attempts:
        _failed_login_attempts[identifier] = []
    _failed_login_attempts[identifier].append(now)

def clear_failed_logins(identifier: str):
    if identifier in _failed_login_attempts:
        del _failed_login_attempts[identifier]
