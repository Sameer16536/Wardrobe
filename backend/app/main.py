from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, clothes, outfits, ai
from app.security_middleware import SecurityAndRateLimitMiddleware

settings = get_settings()

# Create all tables (use Alembic migrations in production)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print("Database init notice (will retry on query):", e)

app = FastAPI(
    title="Wardrobe AI API",
    description="Backend for the AI-powered wardrobe & outfit management app",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── Security & Rate Limiting ──────────────────────────────────────────────────
app.add_middleware(SecurityAndRateLimitMiddleware)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from fastapi.staticfiles import StaticFiles

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(clothes.router)
app.include_router(outfits.router)
app.include_router(ai.router)


@app.get("/")
async def root():
    return {
        "name": "Wardrobe AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
