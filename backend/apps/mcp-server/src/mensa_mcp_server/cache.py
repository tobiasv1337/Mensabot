from __future__ import annotations

import time
from collections import OrderedDict
from threading import Lock
from typing import Any, Callable, TypeVar


T = TypeVar("T")


class TTLCache:
    """Small in-memory TTL cache with FIFO eviction."""

    def __init__(self, *, default_ttl_s: float = 300.0, max_items: int = 4096) -> None:
        self.default_ttl_s = default_ttl_s
        self.max_items = max_items
        self._store: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = Lock()

    def get(self, key: str) -> Any | None:
        now = time.monotonic()
        with self._lock:
            item = self._store.get(key)
            if item is None:
                return None
            expires_at, value = item
            if expires_at <= now:
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any, *, ttl_s: float | None = None) -> None:
        if value is None:
            return
        ttl = self.default_ttl_s if ttl_s is None else ttl_s
        expires_at = time.monotonic() + ttl
        with self._lock:
            if len(self._store) >= self.max_items:
                self._store.popitem(last=False)
            self._store[key] = (expires_at, value)

    def get_or_set(self, key: str, factory: Callable[[], T], *, ttl_s: float | None = None) -> T:
        cached = self.get(key)
        if cached is not None:
            return cached
        value = factory()
        self.set(key, value, ttl_s=ttl_s)
        return value


shared_cache = TTLCache()
