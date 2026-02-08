from __future__ import annotations

from threading import Lock
from typing import Any


class Metrics:
    """Tiny in-process metrics store (counters only).

    Intended for debugging and development observability, not as a full metrics stack.
    """

    def __init__(self) -> None:
        self._lock = Lock()
        self._counters: dict[str, int] = {}
        self._labeled: dict[str, dict[str, int]] = {}

    def inc(self, name: str, amount: int = 1) -> None:
        if not name:
            return
        if amount == 0:
            return
        with self._lock:
            self._counters[name] = int(self._counters.get(name, 0)) + int(amount)

    def inc_labeled(self, name: str, label: str, amount: int = 1) -> None:
        if not name:
            return
        if not label:
            label = "<empty>"
        if amount == 0:
            return
        with self._lock:
            bucket = self._labeled.get(name)
            if bucket is None:
                bucket = {}
                self._labeled[name] = bucket
            bucket[label] = int(bucket.get(label, 0)) + int(amount)

    def snapshot(self, *, reset: bool = False) -> dict[str, Any]:
        with self._lock:
            out = {
                "counters": dict(self._counters),
                "labeled": {k: dict(v) for k, v in self._labeled.items()},
            }
            if reset:
                self._counters.clear()
                self._labeled.clear()
            return out


metrics = Metrics()

