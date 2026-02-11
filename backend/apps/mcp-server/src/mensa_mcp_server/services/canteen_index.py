from openmensa_sdk import CanteenIndexStore

from ..settings import settings
from ..server import make_openmensa_client


_INDEX_STORE: CanteenIndexStore | None = None


def get_index_store() -> CanteenIndexStore:
    global _INDEX_STORE
    if _INDEX_STORE is None:
        path = settings.canteen_index_path
        _INDEX_STORE = CanteenIndexStore(path=path) if path else CanteenIndexStore()
    return _INDEX_STORE


def load_canteen_index():
    store = get_index_store()
    with make_openmensa_client() as client:
        return store.refresh_if_stale_or_cached(client, ttl_hours=settings.canteen_index_ttl_hours)
