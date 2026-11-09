"""
Wardrobe AI — Security & Rate Limiting Middleware
==================================================
Protects the API against:
1. Brute-force authentication attacks (strict limits on /auth/login).
2. AI API quota exhaustion & CPU starvation (limits on /ai/ and image uploads).
3. Denial of Service (DoS) and scraping.
4. Clickjacking, MIME confusion, and XSS via hardened HTTP response headers.
"""

import time
import collections
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class SlidingWindowRateLimiter:
    """
    In-memory sliding window rate limiter.
    Automatically purges expired buckets to prevent memory accumulation.
    """
    def __init__(self):
        # Maps key -> collections.deque of timestamps
        self.windows = collections.defaultdict(collections.deque)
        self.last_cleanup = time.time()

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        now = time.time()

        # Periodic cleanup of completely stale keys every 5 minutes
        if now - self.last_cleanup > 300:
            self._purge_stale(now)
            self.last_cleanup = now

        timestamps = self.windows[key]

        # Slide the window: remove timestamps older than window_seconds
        cutoff = now - window_seconds
        while timestamps and timestamps[0] < cutoff:
            timestamps.popleft()

        if len(timestamps) >= max_requests:
            retry_after = int(timestamps[0] + window_seconds - now) + 1
            return False, max(1, retry_after)

        timestamps.append(now)
        return True, 0

    def _purge_stale(self, now: float):
        keys_to_delete = []
        for key, dq in self.windows.items():
            while dq and dq[0] < now - 300:
                dq.popleft()
            if not dq:
                keys_to_delete.append(key)
        for k in keys_to_delete:
            del self.windows[k]


limiter = SlidingWindowRateLimiter()


class SecurityAndRateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Skip preflight CORS requests and static documentation/uploads
        if request.method == "OPTIONS":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # 2. Define endpoint tiers
        # Auth: 10 attempts per minute (prevents credential stuffing)
        # AI / Vision: 25 requests per minute (prevents API cost & CPU drain)
        # General API: 120 requests per minute
        if path.startswith("/auth/login") or path.startswith("/auth/register"):
            allowed, retry_after = limiter.is_allowed(f"auth:{client_ip}", max_requests=10, window_seconds=60)
        elif path.startswith("/ai/") or (path.startswith("/clothes") and request.method == "POST"):
            allowed, retry_after = limiter.is_allowed(f"ai:{client_ip}", max_requests=25, window_seconds=60)
        elif path.startswith("/clothes") or path.startswith("/outfits"):
            allowed, retry_after = limiter.is_allowed(f"api:{client_ip}", max_requests=120, window_seconds=60)
        else:
            allowed, retry_after = True, 0

        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Rate limit exceeded. Too many requests. Please wait {retry_after} seconds.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        # 3. Process Request
        response = await call_next(request)

        # 4. Attach Modern Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 5. Caching headers for static uploads
        if path.startswith("/uploads/"):
            response.headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=604800"

        return response

