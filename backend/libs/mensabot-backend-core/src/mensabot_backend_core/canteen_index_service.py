from threading import Lock
from typing import Literal

from openmensa_sdk import CanteenIndexStore, OpenMensaAPIError

from .metrics import metrics
from .openmensa_client import make_openmensa_client
from .settings import settings


_INDEX_STORE: CanteenIndexStore | None = None
_INDEX_REFRESH_LOCK = Lock()


def get_index_store() -> CanteenIndexStore:
    global _INDEX_STORE
    if _INDEX_STORE is None:
        path = settings.canteen_index_path
        _INDEX_STORE = CanteenIndexStore(path=path) if path else CanteenIndexStore()
    return _INDEX_STORE


def load_canteen_index(*, caller: Literal["api", "mcp"]) -> object:
    store = get_index_store()
    ttl_hours = settings.canteen_index_ttl_hours

    metrics.inc("canteen_index.load.calls_total")
    metrics.inc_labeled("canteen_index.load.calls_by_caller_total", caller)

    cached = store.load()
    if cached is not None and not cached.is_stale(ttl_hours):
        metrics.inc("canteen_index.load.hit_total")
        return cached

    # Avoid concurrent refreshes/writes
    with _INDEX_REFRESH_LOCK:
        cached = store.load()
        if cached is not None and not cached.is_stale(ttl_hours):
            metrics.inc("canteen_index.load.hit_total")
            return cached

        if cached is None:
            metrics.inc("canteen_index.load.miss_total")
        else:
            metrics.inc("canteen_index.load.stale_total")

        with make_openmensa_client() as client:
            metrics.inc("canteen_index.refresh.attempt_total")
            metrics.inc_labeled("canteen_index.refresh.attempt_by_caller_total", caller)
            try:
                idx = store.refresh(client)
            except OpenMensaAPIError:
                metrics.inc("canteen_index.refresh.error_total")
                if cached is not None:
                    metrics.inc("canteen_index.refresh.used_stale_total")
                    return cached
                raise

            metrics.inc("canteen_index.refresh.success_total")
            return idx
