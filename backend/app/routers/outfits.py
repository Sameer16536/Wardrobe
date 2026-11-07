"""
Wardrobe AI — Outfits Router
============================
Manages curated outfit playlists (collections of clothing items).

Security Architecture:
- Strict multi-tenant isolation on all endpoints.
- Ownership verification: When assembling an outfit, every referenced garment
  must belong to the authenticated user (`ClothingItem.user_id == current_user.id`).
"""

from fastapi import APIRouter, Depends, HTTPException, status
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
    """
    Fetch all outfit playlists created by the authenticated user.
    Ordered by last updated first.
    """
    outfits = (
        db.query(Outfit)
        .filter(Outfit.user_id == current_user.id)
        .order_by(Outfit.updated_at.desc(), Outfit.created_at.desc())
        .all()
    )
    return outfits


@router.post("/", response_model=OutfitOut, status_code=status.HTTP_201_CREATED)
async def create_outfit(
    outfit_data: OutfitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new outfit playlist.

    Security Controls:
    - Verifies that every included clothing_item_id is owned by `current_user.id`.
    - Prevents cross-tenant item referencing.
    """
    # 1. Instantiate outfit parent record
    outfit = Outfit(
        user_id=current_user.id,
        name=outfit_data.name.strip()[:100],
        description=outfit_data.description.strip()[:300] if outfit_data.description else None,
        occasion=outfit_data.occasion.strip()[:60] if outfit_data.occasion else None,
        season=outfit_data.season.strip()[:60] if outfit_data.season else None,
    )
    db.add(outfit)
    db.flush()

    # 2. Validate garment ownership before associating
    for item_data in outfit_data.items:
        clothing_item = db.query(ClothingItem).filter(
            ClothingItem.id == str(item_data.clothing_item_id),
            ClothingItem.user_id == current_user.id,
        ).first()

        if not clothing_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Garment {item_data.clothing_item_id} not found or unauthorized."
            )

        outfit_item = OutfitItem(
            outfit_id=outfit.id,
            clothing_item_id=str(item_data.clothing_item_id),
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
    """
    Fetch a single outfit playlist by ID.
    Enforces authorization check against current_user.id.
    """
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()

    if not outfit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit playlist not found")
    return outfit


@router.patch("/{outfit_id}", response_model=OutfitOut)
async def update_outfit(
    outfit_id: str,
    updates: OutfitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update outfit metadata or rearrange/replace clothing items.
    """
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()

    if not outfit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit playlist not found")

    # Update metadata fields
    for field in ["name", "description", "occasion", "season"]:
        value = getattr(updates, field, None)
        if value is not None:
            setattr(outfit, field, value)

    # Atomically replace items if updated list provided
    if updates.items is not None:
        db.query(OutfitItem).filter(OutfitItem.outfit_id == outfit.id).delete()

        for item_data in updates.items:
            clothing_item = db.query(ClothingItem).filter(
                ClothingItem.id == str(item_data.clothing_item_id),
                ClothingItem.user_id == current_user.id,
            ).first()

            if not clothing_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Garment {item_data.clothing_item_id} not found or unauthorized."
                )

            outfit_item = OutfitItem(
                outfit_id=outfit.id,
                clothing_item_id=str(item_data.clothing_item_id),
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
    """
    Permanently delete an outfit playlist.
    """
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()

    if not outfit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit playlist not found")

    db.delete(outfit)
    db.commit()
    return {"message": "Outfit playlist deleted successfully"}
