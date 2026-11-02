from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.models import User, ClothingItem
from app.schemas.schemas import AISuggestRequest, AIChatMessage, AIChatResponse
from app.services.auth import get_current_user
from app.services.gemini import suggest_outfits, chat_with_stylist

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/suggest")
async def get_outfit_suggestions(
    request: AISuggestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI-powered outfit suggestions from user's wardrobe.
    Filters by occasion/weather/mood if provided.
    """
    # Build wardrobe list for Gemini
    query = db.query(ClothingItem).filter(ClothingItem.user_id == current_user.id)
    if request.exclude_item_ids:
        query = query.filter(ClothingItem.id.notin_(request.exclude_item_ids))

    items = query.all()

    if len(items) < 2:
        return {"suggestions": [], "message": "Add at least 2 items to your wardrobe to get suggestions!"}

    wardrobe_list = [
        {
            "id": str(item.id),
            "name": item.name,
            "category": item.category,
            "colors": item.colors,
            "occasions": item.occasions,
            "seasons": item.seasons,
        }
        for item in items
    ]

    suggestions = await suggest_outfits(
        wardrobe_items=wardrobe_list,
        occasion=request.occasion,
        weather=request.weather,
        mood=request.mood,
    )

    return {"suggestions": suggestions}


@router.post("/chat", response_model=AIChatResponse)
async def stylist_chat(
    message: AIChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chat with AI stylist. Gemini answers fashion questions using your wardrobe context."""
    # Build wardrobe summary for context
    items = db.query(ClothingItem).filter(ClothingItem.user_id == current_user.id).limit(30).all()
    wardrobe_summary = "\n".join([
        f"- {item.name} ({item.category}), Colors: {', '.join(item.colors)}, Occasions: {', '.join(item.occasions)}"
        for item in items
    ]) if items else "Wardrobe is empty."

    reply = await chat_with_stylist(
        message=message.message,
        wardrobe_summary=wardrobe_summary,
    )

    return AIChatResponse(reply=reply, suggested_item_ids=[])


@router.get("/surprise")
async def surprise_outfit(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """'Surprise Me' — AI picks a random stylish outfit from your wardrobe."""
    items = db.query(ClothingItem).filter(ClothingItem.user_id == current_user.id).all()

    if len(items) < 2:
        return {"suggestion": None, "message": "Add more items to get a surprise outfit!"}

    wardrobe_list = [
        {
            "id": str(item.id),
            "name": item.name,
            "category": item.category,
            "colors": item.colors,
            "occasions": item.occasions,
            "seasons": item.seasons,
        }
        for item in items
    ]

    # Ask for 1 surprise suggestion
    suggestions = await suggest_outfits(
        wardrobe_items=wardrobe_list,
        mood="fun and spontaneous",
    )

    suggestion = suggestions[0] if suggestions else None
    return {"suggestion": suggestion}
