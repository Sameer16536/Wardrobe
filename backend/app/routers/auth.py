from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.services.auth import create_access_token, get_google_user_info, get_or_create_user, get_current_user
from app.schemas.schemas import TokenOut, UserOut
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


@router.get("/login")
async def google_login():
    """Redirect user to Google OAuth consent screen."""
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{query_string}")


@router.get("/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """
    Google redirects here with auth code.
    Exchange code for token → fetch user info → create JWT → redirect to frontend.
    """
    # Exchange authorization code for access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get Google token")
        token_data = token_resp.json()

    # Get user profile from Google
    google_user = await get_google_user_info(token_data["access_token"])

    # Get or create user in DB
    user = get_or_create_user(db, google_user)

    # Issue our own JWT
    access_token = create_access_token(data={"sub": str(user.id)})

    # Redirect to frontend with token in URL fragment
    frontend_url = f"{settings.FRONTEND_URL}/auth/callback?token={access_token}"
    return RedirectResponse(url=frontend_url)


@router.get("/dev-login")
async def dev_login(db: Session = Depends(get_db)):
    """Development shortcut — log in directly as a demo user without Google OAuth."""
    mock_google_user = {
        "sub": "dev-user-001",
        "email": "demo@wardrobe.ai",
        "name": "Sameer (Demo)",
        "picture": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop",
    }
    user = get_or_create_user(db, mock_google_user)
    access_token = create_access_token(data={"sub": str(user.id)})
    frontend_url = f"{settings.FRONTEND_URL}/auth/callback?token={access_token}"
    return RedirectResponse(url=frontend_url)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return current user profile."""
    return current_user
