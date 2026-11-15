import time
from collections import deque
from threading import Lock

from fastapi import Request

from app.core.exceptions import TooManyRequestsError

MAX_REQUESTS = 10
WINDOW_SECONDS = 60.0


class SlidingWindowLimiter:
    """In-memory limit per client, so one visitor cannot burn the shared free AI quota.

    The API runs as a single process in this MVP; several workers would need a shared store.
    """

    def __init__(self, max_requests: int, window_seconds: float) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = Lock()

    def check(self, client_key: str) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(client_key, deque())
            while hits and now - hits[0] > self.window_seconds:
                hits.popleft()
            if len(hits) >= self.max_requests:
                raise TooManyRequestsError(
                    "Too many assistant requests. Please wait a minute and try again."
                )
            hits.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = SlidingWindowLimiter(MAX_REQUESTS, WINDOW_SECONDS)


def limit_assistant_calls(request: Request) -> None:
    # nginx sets X-Real-IP; direct calls to the API fall back to the socket address.
    client_key = request.headers.get("x-real-ip") or (
        request.client.host if request.client else "unknown"
    )
    limiter.check(client_key)
