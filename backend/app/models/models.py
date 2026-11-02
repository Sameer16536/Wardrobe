import uuid
from sqlalchemy import Column, String, DateTime, Text, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    clothing_items = relationship("ClothingItem", back_populates="owner", cascade="all, delete-orphan")
    outfits = relationship("Outfit", back_populates="owner", cascade="all, delete-orphan")


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)          # shirt, pants, shoes, dress, etc.
    colors = Column(JSON, default=list)                # ["blue", "white"]
    seasons = Column(JSON, default=list)               # ["summer", "spring"]
    occasions = Column(JSON, default=list)             # ["casual", "formal"]
    tags = Column(JSON, default=list)                  # extra AI tags
    image_url = Column(String, nullable=False)         # image storage URL
    thumbnail_url = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="clothing_items")
    outfit_items = relationship("OutfitItem", back_populates="clothing_item", cascade="all, delete-orphan")


class Outfit(Base):
    __tablename__ = "outfits"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    occasion = Column(String, nullable=True)
    season = Column(String, nullable=True)
    collage_url = Column(String, nullable=True)        # auto-generated collage image
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="outfits")
    outfit_items = relationship("OutfitItem", back_populates="outfit", cascade="all, delete-orphan", order_by="OutfitItem.position")


class OutfitItem(Base):
    __tablename__ = "outfit_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    outfit_id = Column(String(36), ForeignKey("outfits.id"), nullable=False)
    clothing_item_id = Column(String(36), ForeignKey("clothing_items.id"), nullable=False)
    position = Column(Integer, default=0)   # ordering in the outfit

    # Relationships
    outfit = relationship("Outfit", back_populates="outfit_items")
    clothing_item = relationship("ClothingItem", back_populates="outfit_items")
