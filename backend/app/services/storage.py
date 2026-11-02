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


async def upload_image(image_bytes: bytes, filename: str, user_id: str) -> str:
    """
    Compress and upload image to Supabase Storage via S3 API,
    or save locally if S3 credentials are not configured.
    """
    compressed = compress_image(image_bytes)
    s3 = get_s3_client()

    if s3 is None:
        # Local fallback
        upload_dir = os.path.join(os.getcwd(), "uploads", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        local_path = os.path.join(upload_dir, filename)
        with open(local_path, "wb") as f:
            f.write(compressed)
        return f"http://localhost:8000/uploads/{user_id}/{filename}"

    key = f"{user_id}/{filename}"
    s3.put_object(
        Bucket=settings.SUPABASE_BUCKET,
        Key=key,
        Body=compressed,
        ContentType="image/jpeg",
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
