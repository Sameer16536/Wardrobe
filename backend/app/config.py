from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = ""

    # Supabase & S3 Storage
    SUPABASE_URL: str = "https://qkckgcrfkzvxwqydvews.supabase.co"
    SUPABASE_BUCKET: str = "Wardrobe"
    SUPABASE_S3_ENDPOINT: str = "https://qkckgcrfkzvxwqydvews.storage.supabase.co/storage/v1/s3"
    SUPABASE_S3_REGION: str = "eu-west-1"
    SUPABASE_S3_ACCESS_KEY: str = ""
    SUPABASE_S3_SECRET_KEY: str = ""

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/callback"

    # JWT
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Gemini AI
    GEMINI_API_KEY: str = ""

    # Weather (optional)
    WEATHER_API_KEY: str = ""

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    # Environment
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
