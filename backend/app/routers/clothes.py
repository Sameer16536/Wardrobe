import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.database import get_db
from app.models.models import User, ClothingItem
from app.schemas.schemas import ClothingItemOut, ClothingItemUpdate
from app.services.auth import get_current_user
from app.services.storage import upload_image, delete_image
from app.services.gemini import analyze_clothing_image

router = APIRouter(prefix="/clothes", tags=["clothes"])


@router.get("/", response_model=List[ClothingItemOut])
async def get_wardrobe(
    category: Optional[str] = None,
    season: Optional[str] = None,
    occasion: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all clothing items for the current user, with optional filters."""
    query = db.query(ClothingItem).filter(ClothingItem.user_id == current_user.id)

    if category:
        query = query.filter(ClothingItem.category == category)
    if season:
        query = query.filter(ClothingItem.seasons.any(season))
    if occasion:
        query = query.filter(ClothingItem.occasions.any(occasion))

    items = query.order_by(ClothingItem.created_at.desc()).all()
    return items


@router.post("/", response_model=ClothingItemOut)
async def add_clothing_item(
    image: UploadFile = File(...),
    name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    colors: Optional[str] = Form("[]"),         # JSON string
    seasons: Optional[str] = Form("[]"),
    occasions: Optional[str] = Form("[]"),
    tags: Optional[str] = Form("[]"),
    brand: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    use_ai_tags: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a clothing photo → optionally run AI tagging → save to wardrobe.
    """
    image_bytes = await image.read()

    # Run Gemini Vision analysis if requested
    ai_tags = {}
    if use_ai_tags:
        ai_tags = await analyze_clothing_image(image_bytes)

    # Merge user input with AI tags (user input takes priority)
    final_name = name or ai_tags.get("name", "Clothing Item")
    final_category = category or ai_tags.get("category", "other")
    final_colors = json.loads(colors) or ai_tags.get("colors", [])
    final_seasons = json.loads(seasons) or ai_tags.get("seasons", [])
    final_occasions = json.loads(occasions) or ai_tags.get("occasions", [])
    final_tags = json.loads(tags) + ai_tags.get("tags", [])

    # Upload image to Supabase Storage
    filename = f"{uuid.uuid4()}.jpg"
    image_url = await upload_image(image_bytes, filename, str(current_user.id))

    # Save to database
    item = ClothingItem(
        user_id=current_user.id,
        name=final_name,
        category=final_category,
        colors=final_colors,
        seasons=final_seasons,
        occasions=final_occasions,
        tags=list(set(final_tags)),  # deduplicate
        image_url=image_url,
        brand=brand,
        notes=notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=ClothingItemOut)
async def get_clothing_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.patch("/{item_id}", response_model=ClothingItemOut)
async def update_clothing_item(
    item_id: str,
    updates: ClothingItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
async def delete_clothing_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Delete from storage too
    await delete_image(item.image_url, str(current_user.id))

    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}


@router.post("/{item_id}/retag", response_model=ClothingItemOut)
async def retag_item_with_ai(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-run Gemini AI tagging on an existing item's image."""
    import httpx

    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Fetch image from storage
    async with httpx.AsyncClient() as client:
        resp = await client.get(item.image_url)
        image_bytes = resp.content

    ai_tags = await analyze_clothing_image(image_bytes)
    item.category = ai_tags.get("category", item.category)
    item.colors = ai_tags.get("colors", item.colors)
    item.seasons = ai_tags.get("seasons", item.seasons)
    item.occasions = ai_tags.get("occasions", item.occasions)
    item.tags = ai_tags.get("tags", item.tags)

    db.commit()
    db.refresh(item)
    return item
