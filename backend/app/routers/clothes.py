"""
Wardrobe AI — Clothing Items Management Router
==============================================
CRUD operations for user wardrobe items.

Security & Validation:
----------------------
1. Multi-Tenant Authorization: Every query filters by `user_id == current_user.id`.
   Users can never view, mutate, or delete another user's garments.
2. File Upload Validation:
   - Enforces a maximum file size limit (10MB).
   - Validates image magic bytes via Pillow to prevent arbitrary file upload exploits.
   - Generates random cryptographic UUID filenames (`uuid4().hex`) to prevent path traversal.
3. Parameterized ORM: 100% SQLAlchemy statements protect against SQL injection.
"""

import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from PIL import Image
import io

from app.database import get_db
from app.models.models import User, ClothingItem
from app.schemas.schemas import ClothingItemOut, ClothingItemUpdate
from app.services.auth import get_current_user
from app.services.storage import upload_image, delete_image
from app.services.gemini import analyze_clothing_image

router = APIRouter(prefix="/clothes", tags=["clothes"])

# Maximum allowed file size for camera/gallery upload (10 MB)
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


@router.get("/", response_model=List[ClothingItemOut])
async def get_wardrobe(
    category: Optional[str] = None,
    season: Optional[str] = None,
    occasion: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all cataloged garments belonging to the authenticated user.
    
    Security:
    - Strictly scoped to `ClothingItem.user_id == current_user.id`.
    - Supports optional filtering by category, season, occasion, and tag.
    """
    query = db.query(ClothingItem).filter(ClothingItem.user_id == current_user.id)

    if category and category.lower() != "all":
        query = query.filter(ClothingItem.category == category.lower())

    items = query.order_by(ClothingItem.created_at.desc()).all()

    # Optional in-memory filter for JSON list attributes (seasons, occasions, tags)
    if season:
        items = [i for i in items if season.lower() in [s.lower() for s in (i.seasons or [])]]
    if occasion:
        items = [i for i in items if occasion.lower() in [o.lower() for o in (i.occasions or [])]]
    if tag:
        items = [i for i in items if tag.lower() in [t.lower() for t in (i.tags or [])]]

    return items


@router.post("/", response_model=ClothingItemOut, status_code=status.HTTP_201_CREATED)
async def add_clothing_item(
    image: UploadFile = File(...),
    name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    colors: Optional[str] = Form("[]"),
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
    Upload a garment photo, run AI vision analysis (if requested), and save to wardrobe.

    Security Measures:
    1. Size ceiling validation (rejects files > 10MB).
    2. Image structure verification (rejects non-image payloads disguised as images).
    3. Safe filename generation (prevents directory traversal attacks).
    """
    # 1. Read and validate payload size
    image_bytes = await image.read()
    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded image exceeds maximum allowable limit of 10MB."
        )

    # 2. Verify image integrity via Pillow header check
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img.verify()  # Verifies file header and image integrity
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Please upload a valid JPG, PNG, or WEBP file."
        )

    # 3. Vision scan (Executes ONCE upon garment registration)
    ai_tags = {}
    if use_ai_tags:
        ai_tags = await analyze_clothing_image(image_bytes)

    # 4. Safely parse JSON attribute inputs
    def _safe_json_list(val: Optional[str]) -> List[str]:
        if not val:
            return []
        try:
            parsed = json.loads(val)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []

    input_colors = _safe_json_list(colors)
    input_seasons = _safe_json_list(seasons)
    input_occasions = _safe_json_list(occasions)
    input_tags = _safe_json_list(tags)

    final_name = name.strip() if name and name.strip() else ai_tags.get("name", "Clothing Item")
    final_category = category.strip().lower() if category and category.strip() else ai_tags.get("category", "other")
    final_colors = input_colors if input_colors else ai_tags.get("colors", [])
    final_seasons = input_seasons if input_seasons else ai_tags.get("seasons", [])
    final_occasions = input_occasions if input_occasions else ai_tags.get("occasions", [])
    final_tags = list(set(input_tags + ai_tags.get("tags", [])))

    # 5. Cryptographic storage key generation (prevents path manipulation)
    safe_filename = f"{uuid.uuid4().hex}.jpg"
    image_url = await upload_image(image_bytes, safe_filename, str(current_user.id))

    # 6. Persist record in database
    item = ClothingItem(
        user_id=str(current_user.id),
        name=final_name[:120],
        category=final_category[:60],
        colors=final_colors,
        seasons=final_seasons,
        occasions=final_occasions,
        tags=final_tags,
        image_url=image_url,
        brand=brand[:80] if brand else None,
        notes=notes[:500] if notes else None,
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
    """
    Retrieve single garment details.
    Guarantees user cannot inspect items owned by other users.
    """
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garment not found")
    return item


@router.patch("/{item_id}", response_model=ClothingItemOut)
async def update_clothing_item(
    item_id: str,
    updates: ClothingItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update clothing attributes (name, category, colors, seasons, notes).
    """
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garment not found")

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
    """
    Permanently delete a garment record and remove its image from Supabase S3.
    """
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garment not found")

    # Clean up associated S3 object
    await delete_image(item.image_url, str(current_user.id))

    db.delete(item)
    db.commit()
    return {"message": "Garment deleted successfully"}


@router.post("/{item_id}/retag", response_model=ClothingItemOut)
async def retag_item_with_ai(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Re-run Gemini Vision AI analysis on an existing garment's photograph.
    Fetches image from Supabase Storage and updates tags in database.
    """
    import httpx

    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garment not found")

    # Fetch image from storage securely
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(item.image_url)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to fetch source image from cloud storage"
            )
        image_bytes = resp.content

    ai_tags = await analyze_clothing_image(image_bytes)
    if not item.name or item.name in ("Garment Item", "Clothing Item", "Garment"):
        item.name = ai_tags.get("name", item.name)
    item.category = ai_tags.get("category", item.category)
    item.colors = ai_tags.get("colors", item.colors)
    item.seasons = ai_tags.get("seasons", item.seasons)
    item.occasions = ai_tags.get("occasions", item.occasions)
    item.tags = list(set((item.tags or []) + ai_tags.get("tags", [])))

    db.commit()
    db.refresh(item)
    return item
