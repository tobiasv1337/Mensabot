from __future__ import annotations

import time
from collections import OrderedDict
from threading import Lock
from typing import Any


class TTLCache:
    """Small in-memory TTL cache with FIFO eviction."""

    def __init__(self, *, default_ttl_s: float = 300.0, max_items: int = 4096) -> None:
        self.default_ttl_s = default_ttl_s
        self.max_items = max_items
        self._store: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = Lock()
        self._stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "expired": 0,
            "evicted": 0,
        }
        self._stats_by_prefix: dict[str, dict[str, int]] = {}

    @staticmethod
    def _key_prefix(key: str) -> str:
        if not key:
            return "<empty>"
        return key.split(":", 1)[0]

    def _inc(self, name: str, *, key: str | None = None) -> None:
        self._stats[name] = int(self._stats.get(name, 0)) + 1
        if key is None:
            return
        prefix = self._key_prefix(key)
        bucket = self._stats_by_prefix.get(prefix)
        if bucket is None:
            bucket = {"hits": 0, "misses": 0, "sets": 0, "expired": 0, "evicted": 0}
            self._stats_by_prefix[prefix] = bucket
        bucket[name] = int(bucket.get(name, 0)) + 1

    def get(self, key: str) -> Any | None:
        now = time.monotonic()
        with self._lock:
            item = self._store.get(key)
            if item is None:
                self._inc("misses", key=key)
                return None
            expires_at, value = item
            if expires_at <= now:
                self._store.pop(key, None)
                self._inc("expired", key=key)
                self._inc("misses", key=key)
                return None
            self._inc("hits", key=key)
            return value

    def set(self, key: str, value: Any, *, ttl_s: float | None = None) -> None:
        if value is None:
            return
        ttl = self.default_ttl_s if ttl_s is None else ttl_s
        expires_at = time.monotonic() + ttl
        with self._lock:
            if key not in self._store and len(self._store) >= self.max_items:
                evicted_key, _ = self._store.popitem(last=False)
                self._inc("evicted", key=evicted_key)
            self._store[key] = (expires_at, value)
            self._inc("sets", key=key)

    def stats(self, *, reset: bool = False) -> dict[str, Any]:
        """Return cache stats for debugging/observability.

        Notes:
        - This cache is in-memory only; stats reset on process restart.
        - `expired` counts only when an expired entry is encountered during `get()`.
        """
        with self._lock:
            total_items = len(self._store)
            # Current items by prefix (not lifetime counts).
            items_by_prefix: dict[str, int] = {}
            for k in self._store.keys():
                p = self._key_prefix(k)
                items_by_prefix[p] = items_by_prefix.get(p, 0) + 1

            out = {
                "max_items": self.max_items,
                "items": total_items,
                "items_by_prefix": dict(sorted(items_by_prefix.items(), key=lambda kv: kv[0])),
                "stats": dict(self._stats),
                "stats_by_prefix": {k: dict(v) for k, v in sorted(self._stats_by_prefix.items(), key=lambda kv: kv[0])},
            }

            if reset:
                for k in list(self._stats.keys()):
                    self._stats[k] = 0
                self._stats_by_prefix.clear()

            return out


shared_cache = TTLCache()
