from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import httpx

from app.config import get_settings
from app.database import get_db
from app.models.models import User

settings = get_settings()
bearer_scheme = HTTPBearer()

GOOGLE_TOKEN_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_google_user_info(access_token: str) -> dict:
    """Fetch user profile from Google using access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GOOGLE_TOKEN_INFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user info")
        return resp.json()


def get_or_create_user(db: Session, google_user: dict) -> User:
    """Get existing user or create new one from Google profile data."""
    google_id = google_user.get("sub")
    email = google_user.get("email")

    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        # Update name/avatar in case they changed
        user.name = google_user.get("name", user.name)
        user.avatar_url = google_user.get("picture", user.avatar_url)
        db.commit()
        db.refresh(user)
        return user

    # Create new user
    user = User(
        email=email,
        name=google_user.get("name", email),
        avatar_url=google_user.get("picture"),
        google_id=google_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency — extracts and validates current user from JWT."""
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
