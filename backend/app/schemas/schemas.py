from pydantic import BaseModel, EmailStr
from typing import Optional, List, Union
from datetime import datetime
from uuid import UUID


# ─── User Schemas ────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None


class UserOut(UserBase):
    id: Union[UUID, str]
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Clothing Item Schemas ────────────────────────────────────────────────────

class ClothingItemCreate(BaseModel):
    name: str
    category: str
    colors: List[str] = []
    seasons: List[str] = []
    occasions: List[str] = []
    tags: List[str] = []
    brand: Optional[str] = None
    notes: Optional[str] = None


class ClothingItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    colors: Optional[List[str]] = None
    seasons: Optional[List[str]] = None
    occasions: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    brand: Optional[str] = None
    notes: Optional[str] = None


class ClothingItemOut(BaseModel):
    id: Union[UUID, str]
    name: str
    category: str
    colors: List[str]
    seasons: List[str]
    occasions: List[str]
    tags: List[str]
    image_url: str
    thumbnail_url: Optional[str]
    brand: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Outfit Schemas ───────────────────────────────────────────────────────────

class OutfitItemIn(BaseModel):
    clothing_item_id: Union[UUID, str]
    position: int = 0


class OutfitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    occasion: Optional[str] = None
    season: Optional[str] = None
    items: List[OutfitItemIn] = []


class OutfitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    occasion: Optional[str] = None
    season: Optional[str] = None
    items: Optional[List[OutfitItemIn]] = None


class OutfitItemOut(BaseModel):
    clothing_item_id: Union[UUID, str]
    position: int
    clothing_item: ClothingItemOut

    class Config:
        from_attributes = True


class OutfitOut(BaseModel):
    id: Union[UUID, str]
    name: str
    description: Optional[str]
    occasion: Optional[str]
    season: Optional[str]
    collage_url: Optional[str]
    outfit_items: List[OutfitItemOut] = []
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── AI Schemas ───────────────────────────────────────────────────────────────

class AITagResponse(BaseModel):
    name: str
    category: str
    colors: List[str]
    seasons: List[str]
    occasions: List[str]
    tags: List[str]
    confidence: float


class AISuggestRequest(BaseModel):
    occasion: Optional[str] = None
    weather: Optional[str] = None
    mood: Optional[str] = None
    exclude_item_ids: List[Union[UUID, str]] = []


class AISuggestion(BaseModel):
    item_ids: List[Union[UUID, str]]
    outfit_name: str
    explanation: str
    occasion: str


class AIChatMessage(BaseModel):
    message: str
    context: Optional[str] = None


class AIChatResponse(BaseModel):
    reply: str
    suggested_item_ids: List[Union[UUID, str]] = []
