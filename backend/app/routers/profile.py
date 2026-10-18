from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Profile
from app.schemas import ProfileUpdate, ProfileResponse
from app.deps import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])

@router.get("", response_model=ProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        # Create default profile if none exists
        profile = Profile(
            user_id=current_user.id,
            display_name="Student",
            college="",
            course="",
            year="",
            avatar=None,
            theme="system"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("", response_model=ProfileResponse)
def update_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.flush()

    update_data = profile_in.model_dump(exclude_unset=True)

    # Avatar base64 size check (~300KB file = ~400KB base64)
    if "avatar" in update_data and update_data["avatar"]:
        if len(update_data["avatar"]) > 450000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Avatar image is too large. Please select an image under 300KB."
            )

    for field, value in update_data.items():
        if isinstance(value, str):
            setattr(profile, field, value.strip())
        else:
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile
