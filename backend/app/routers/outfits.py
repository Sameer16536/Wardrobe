from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import User, Outfit, OutfitItem, ClothingItem
from app.schemas.schemas import OutfitCreate, OutfitUpdate, OutfitOut
from app.services.auth import get_current_user

router = APIRouter(prefix="/outfits", tags=["outfits"])


@router.get("/", response_model=List[OutfitOut])
async def get_outfits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all outfit playlists for the current user."""
    outfits = (
        db.query(Outfit)
        .filter(Outfit.user_id == current_user.id)
        .order_by(Outfit.updated_at.desc(), Outfit.created_at.desc())
        .all()
    )
    return outfits


@router.post("/", response_model=OutfitOut)
async def create_outfit(
    outfit_data: OutfitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new outfit playlist."""
    outfit = Outfit(
        user_id=current_user.id,
        name=outfit_data.name,
        description=outfit_data.description,
        occasion=outfit_data.occasion,
        season=outfit_data.season,
    )
    db.add(outfit)
    db.flush()  # get outfit.id before committing

    # Add outfit items
    for item_data in outfit_data.items:
        # Verify item belongs to user
        clothing_item = db.query(ClothingItem).filter(
            ClothingItem.id == item_data.clothing_item_id,
            ClothingItem.user_id == current_user.id,
        ).first()
        if not clothing_item:
            raise HTTPException(status_code=404, detail=f"Item {item_data.clothing_item_id} not found")

        outfit_item = OutfitItem(
            outfit_id=outfit.id,
            clothing_item_id=item_data.clothing_item_id,
            position=item_data.position,
        )
        db.add(outfit_item)

    db.commit()
    db.refresh(outfit)
    return outfit


@router.get("/{outfit_id}", response_model=OutfitOut)
async def get_outfit(
    outfit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    return outfit


@router.patch("/{outfit_id}", response_model=OutfitOut)
async def update_outfit(
    outfit_id: str,
    updates: OutfitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update outfit metadata and/or items list."""
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    # Update simple fields
    for field in ["name", "description", "occasion", "season"]:
        value = getattr(updates, field, None)
        if value is not None:
            setattr(outfit, field, value)

    # Replace items if provided
    if updates.items is not None:
        # Delete existing outfit items
        db.query(OutfitItem).filter(OutfitItem.outfit_id == outfit.id).delete()

        for item_data in updates.items:
            clothing_item = db.query(ClothingItem).filter(
                ClothingItem.id == item_data.clothing_item_id,
                ClothingItem.user_id == current_user.id,
            ).first()
            if not clothing_item:
                raise HTTPException(status_code=404, detail=f"Item {item_data.clothing_item_id} not found")

            outfit_item = OutfitItem(
                outfit_id=outfit.id,
                clothing_item_id=item_data.clothing_item_id,
                position=item_data.position,
            )
            db.add(outfit_item)

    db.commit()
    db.refresh(outfit)
    return outfit


@router.delete("/{outfit_id}")
async def delete_outfit(
    outfit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    db.delete(outfit)
    db.commit()
    return {"message": "Outfit deleted successfully"}
