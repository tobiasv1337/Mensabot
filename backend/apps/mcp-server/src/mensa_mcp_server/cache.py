from __future__ import annotations

import json
import logging
import os
import tempfile
import time
from collections import OrderedDict
from pathlib import Path
from threading import Lock
from typing import Any

from .settings import settings

logger = logging.getLogger(__name__)

CACHE_VERSION = 1
DEFAULT_SHARED_CACHE_PATH = str(
    Path(os.getenv("XDG_CACHE_HOME") or Path.home() / ".cache")
    / "mensabot"
    / "shared_cache.json"
)


class TTLCache:
    """Small in-memory TTL cache with FIFO eviction."""

    def __init__(self, *, default_ttl_s: float = 300.0, max_items: int = 4096, path: str | None = None) -> None:
        self.default_ttl_s = default_ttl_s
        self.max_items = max_items
        self.path = path or DEFAULT_SHARED_CACHE_PATH
        self._store: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = Lock()
        self._loaded = False
        self._file_mtime: float | None = None
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

    def _ensure_loaded_locked(self) -> None:
        if self._loaded:
            return
        self._load_from_disk_locked()

    def _get_file_mtime_locked(self) -> float | None:
        if not self.path or not os.path.exists(self.path):
            return None
        try:
            return os.path.getmtime(self.path)
        except OSError:
            logger.exception("Failed to stat shared cache file: %s", self.path)
            return None

    def _load_from_disk_locked(self, *, mtime: float | None = None) -> None:
        self._loaded = True

        if mtime is None:
            mtime = self._get_file_mtime_locked()
        if mtime is None:
            self._store = OrderedDict()
            self._file_mtime = None
            return

        try:
            with open(self.path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except Exception:
            logger.exception("Failed to load shared cache from %s", self.path)
            self._store = OrderedDict()
            self._file_mtime = mtime
            return

        if not isinstance(payload, dict):
            logger.warning("Ignoring shared cache at %s because the payload is not a JSON object.", self.path)
            self._store = OrderedDict()
            self._file_mtime = mtime
            return

        version = payload.get("version")
        if version != CACHE_VERSION:
            logger.warning(
                "Ignoring shared cache at %s because version %r is incompatible with expected version %d.",
                self.path,
                version,
                CACHE_VERSION,
            )
            self._store = OrderedDict()
            self._file_mtime = mtime
            return

        raw_entries = payload.get("entries")
        entries = raw_entries if isinstance(raw_entries, list) else []
        now = time.time()
        loaded_store: OrderedDict[str, tuple[float, Any]] = OrderedDict()

        for entry in entries:
            if not isinstance(entry, dict):
                continue
            key = entry.get("key")
            expires_at = entry.get("expires_at")
            value = entry.get("value")

            if not isinstance(key, str):
                continue

            try:
                expires_at_ts = float(expires_at)
            except (TypeError, ValueError):
                continue

            if expires_at_ts <= now:
                continue

            loaded_store[key] = (expires_at_ts, value)

        while len(loaded_store) > self.max_items:
            loaded_store.popitem(last=False)

        self._store = loaded_store
        self._file_mtime = mtime

    def _persist_locked(self) -> None:
        if not self.path:
            return

        dir_path = os.path.dirname(self.path) or "."
        os.makedirs(dir_path, exist_ok=True)

        payload = {
            "version": CACHE_VERSION,
            "updated_at": int(time.time()),
            "total_items": len(self._store),
            "entries": [
                {
                    "key": key,
                    "expires_at": expires_at,
                    "value": value,
                }
                for key, (expires_at, value) in self._store.items()
            ],
        }

        fd, tmp_path = tempfile.mkstemp(
            prefix=f".{os.path.basename(self.path)}.",
            suffix=".tmp",
            dir=dir_path,
            text=True,
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, ensure_ascii=True, indent=2, sort_keys=True)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(tmp_path, self.path)
        finally:
            try:
                os.remove(tmp_path)
            except FileNotFoundError:
                pass

        self._file_mtime = self._get_file_mtime_locked()

    def _prune_expired_locked(self, *, now: float | None = None) -> bool:
        current = time.time() if now is None else now
        expired_keys = [key for key, (expires_at, _) in self._store.items() if expires_at <= current]
        if not expired_keys:
            return False

        for key in expired_keys:
            self._store.pop(key, None)
        return True

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

    def load(self) -> None:
        with self._lock:
            current_mtime = self._get_file_mtime_locked()
            if not self._loaded or current_mtime != self._file_mtime:
                self._load_from_disk_locked(mtime=current_mtime)

    def get(self, key: str) -> Any | None:
        now = time.time()
        with self._lock:
            self._ensure_loaded_locked()
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
        now = time.time()
        ttl = self.default_ttl_s if ttl_s is None else ttl_s
        expires_at = now + ttl
        with self._lock:
            self._ensure_loaded_locked()
            if key not in self._store and len(self._store) >= self.max_items:
                self._prune_expired_locked(now=now)
            if key not in self._store and len(self._store) >= self.max_items:
                evicted_key, _ = self._store.popitem(last=False)
                self._inc("evicted", key=evicted_key)
            self._store[key] = (expires_at, value)
            self._inc("sets", key=key)

    def flush(self) -> bool:
        with self._lock:
            self._ensure_loaded_locked()
            if not self.path:
                return False
            self._prune_expired_locked()
            self._persist_locked()
            return True

    def storage_stats(self) -> dict[str, Any]:
        with self._lock:
            self._ensure_loaded_locked()

            file_exists = bool(self.path) and os.path.exists(self.path)
            file_size = os.path.getsize(self.path) if file_exists else None
            file_mtime = os.path.getmtime(self.path) if file_exists else None
            return {
                "path": self.path,
                "file_exists": file_exists,
                "file_size": file_size,
                "file_mtime": file_mtime,
                "store_file_mtime": self._file_mtime,
                "store_has_in_memory": self._loaded,
                "items": len(self._store),
            }

    def stats(self, *, reset: bool = False) -> dict[str, Any]:
        """Return cache stats for debugging/observability.

        Notes:
        - Cache values can survive process restarts when persisted to disk.
        - Stats are in-memory only and reset on process restart.
        - `expired` counts only when an expired entry is encountered during `get()`.
        """
        with self._lock:
            self._ensure_loaded_locked()

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


shared_cache = TTLCache(default_ttl_s=settings.shared_cache_default_ttl_s, max_items=settings.shared_cache_max_items, path=settings.shared_cache_path or None)
