from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Profile
from app.schemas import UserRegister, UserLogin, Token, UserResponse
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    is_login_throttled,
    record_failed_login,
    clear_failed_logins,
)
from app.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    email = user_in.email.lower().strip()
    
    # Check if email is already registered
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )
    
    # Create User and Profile
    new_user = User(
        email=email,
        password_hash=hash_password(user_in.password)
    )
    db.add(new_user)
    db.flush() # Populate new_user.id

    new_profile = Profile(
        user_id=new_user.id,
        display_name=user_in.display_name.strip() or "Student",
        college="",
        course="",
        year="",
        avatar=None,
        theme="system"
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_user)

    # Issue JWT token
    access_token = create_access_token(data={"sub": new_user.id, "email": new_user.email})
    return Token(access_token=access_token, token_type="bearer")

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, request: Request, db: Session = Depends(get_db)):
    email = user_in.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"
    throttle_key = f"{email}:{client_ip}"

    if is_login_throttled(throttle_key, max_attempts=5, lockout_seconds=300):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 5 minutes and try again."
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        record_failed_login(throttle_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    clear_failed_logins(throttle_key)
    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    return Token(access_token=access_token, token_type="bearer")

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
