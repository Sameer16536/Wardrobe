import io
import os
from PIL import Image
import boto3
from botocore.config import Config
from app.config import get_settings

settings = get_settings()


def get_s3_client():
    if not settings.SUPABASE_S3_ACCESS_KEY or not settings.SUPABASE_S3_SECRET_KEY:
        return None
    return boto3.client(
        "s3",
        endpoint_url=settings.SUPABASE_S3_ENDPOINT,
        region_name=settings.SUPABASE_S3_REGION,
        aws_access_key_id=settings.SUPABASE_S3_ACCESS_KEY,
        aws_secret_access_key=settings.SUPABASE_S3_SECRET_KEY,
        config=Config(signature_version="s3v4"),
    )


def compress_image(image_bytes: bytes, max_size_kb: int = 350, max_dim: int = 1200) -> bytes:
    """
    Compress image to optimize loading speed and stay well within storage limits.
    """
    img = Image.open(io.BytesIO(image_bytes))

    # Convert RGBA / P mode to RGB for clean JPEG output
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Resize if larger than max dimension
    w, h = img.size
    if w > max_dim or h > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)

    quality = 85
    while quality > 25:
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
        if buffer.tell() <= max_size_kb * 1024:
            break
        quality -= 10

    buffer.seek(0)
    return buffer.read()


import io
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
import boto3
from botocore.config import Config
from app.config import get_settings

settings = get_settings()

# Dedicated thread pool for CPU-bound image processing so FastAPI event loop never freezes
_image_executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="img_proc")


def get_s3_client():
    if not settings.SUPABASE_S3_ACCESS_KEY or not settings.SUPABASE_S3_SECRET_KEY:
        return None
    return boto3.client(
        "s3",
        endpoint_url=settings.SUPABASE_S3_ENDPOINT,
        region_name=settings.SUPABASE_S3_REGION,
        aws_access_key_id=settings.SUPABASE_S3_ACCESS_KEY,
        aws_secret_access_key=settings.SUPABASE_S3_SECRET_KEY,
        config=Config(signature_version="s3v4"),
    )


def compress_image(image_bytes: bytes, max_size_kb: int = 350, max_dim: int = 1200) -> bytes:
    """
    Compress image to optimize loading speed and stay well within storage limits.
    """
    img = Image.open(io.BytesIO(image_bytes))

    # Convert RGBA / P mode to RGB for clean JPEG output
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Resize if larger than max dimension
    w, h = img.size
    if w > max_dim or h > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)

    quality = 85
    while quality > 25:
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
        if buffer.tell() <= max_size_kb * 1024:
            break
        quality -= 10

    buffer.seek(0)
    return buffer.read()


def _sync_remove_background(image_bytes: bytes) -> bytes:
    """
    Synchronous helper to run rembg and studio composite in a worker thread.
    """
    import rembg
    cutout_bytes = rembg.remove(image_bytes)
    cutout_img = Image.open(io.BytesIO(cutout_bytes)).convert("RGBA")

    # Clean studio off-white backdrop (#F8F9FA)
    studio_bg = Image.new("RGBA", cutout_img.size, (248, 249, 250, 255))
    composite = Image.alpha_composite(studio_bg, cutout_img).convert("RGB")

    # Crop to isolated garment bounding box + 8% padding
    bbox = cutout_img.getbbox()
    if bbox:
        w, h = composite.size
        left, upper, right, lower = bbox
        pad_x = int((right - left) * 0.08)
        pad_y = int((lower - upper) * 0.08)
        crop_box = (
            max(0, left - pad_x),
            max(0, upper - pad_y),
            min(w, right + pad_x),
            min(h, lower + pad_y),
        )
        composite = composite.crop(crop_box)

    buf = io.BytesIO()
    composite.save(buf, format="JPEG", quality=90, optimize=True)
    return buf.getvalue()


async def process_garment_image_async(image_bytes: bytes, auto_remove_bg: bool = True) -> bytes:
    """
    Asynchronously pre-processes uploaded garment photo like Atricent & Acloset:
    - Runs CPU-heavy AI background removal in a separate thread so FastAPI stays 100% responsive.
    - Applies a 6-second timeout: if the model is still downloading or slow, safely falls back
      to standard compression without hanging or freezing any other user requests.
    """
    processed = image_bytes
    if auto_remove_bg:
        try:
            loop = asyncio.get_running_loop()
            # Run in worker thread with timeout protection
            processed = await asyncio.wait_for(
                loop.run_in_executor(_image_executor, _sync_remove_background, image_bytes),
                timeout=6.0,
            )
        except asyncio.TimeoutError:
            print("Background removal timed out (model downloading or busy). Using original image.")
            processed = image_bytes
        except Exception as e:
            # Safe fallback: if rembg model is offline or downloading, keep original image
            print("Auto background removal notice:", e)
            processed = image_bytes

    # Run compression in thread pool to prevent blocking
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_image_executor, compress_image, processed)


async def upload_image(image_bytes: bytes, filename: str, user_id: str) -> str:
    """
    Process, compress and upload image to Supabase Storage via S3 API,
    or save locally if S3 credentials are not configured.
    Guaranteed non-blocking for FastAPI event loop.
    """
    compressed = await process_garment_image_async(image_bytes)
    s3 = get_s3_client()

    if s3 is None:
        # Local fallback
        upload_dir = os.path.join(os.getcwd(), "uploads", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        local_path = os.path.join(upload_dir, filename)
        loop = asyncio.get_running_loop()
        def _write():
            with open(local_path, "wb") as f:
                f.write(compressed)
        await loop.run_in_executor(_image_executor, _write)
        return f"http://localhost:8000/uploads/{user_id}/{filename}"

    key = f"{user_id}/{filename}"
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(
        _image_executor,
        lambda: s3.put_object(
            Bucket=settings.SUPABASE_BUCKET,
            Key=key,
            Body=compressed,
            ContentType="image/jpeg",
        )
    )

    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.SUPABASE_BUCKET}/{key}"
    return public_url


async def delete_image(image_url: str, user_id: str) -> bool:
    """Delete image from Supabase Storage by URL."""
    try:
        s3 = get_s3_client()
        if s3 is None:
            filename = image_url.split("/")[-1]
            local_path = os.path.join(os.getcwd(), "uploads", str(user_id), filename)
            if os.path.exists(local_path):
                os.remove(local_path)
            return True

        if f"/{settings.SUPABASE_BUCKET}/" in image_url:
            key = image_url.split(f"/{settings.SUPABASE_BUCKET}/")[-1]
            s3.delete_object(Bucket=settings.SUPABASE_BUCKET, Key=key)
        return True
    except Exception:
        return False
