import os

from fastapi import APIRouter, HTTPException, Query

from mensabot_backend_core.cache import shared_cache
from mensabot_backend_core.metrics import metrics
from mensabot_backend_core.settings import settings as core_settings

from ..config import settings
from ..services.canteen_index import get_canteen_index_store


router = APIRouter()


@router.get("/api/debug/metrics")
async def get_debug_metrics(
    reset: bool = Query(False, description="If true, reset counters after reading."),
):
    if not settings.enable_debug_endpoints:
        # 404 so the endpoint is effectively hidden unless explicitly enabled.
        raise HTTPException(status_code=404, detail="Not found")

    store = get_canteen_index_store()
    index = store.load()
    path = getattr(store, "path", None)
    file_exists = bool(path) and os.path.exists(path)
    file_size = os.path.getsize(path) if file_exists else None
    file_mtime = os.path.getmtime(path) if file_exists else None

    return {
        "cache": shared_cache.stats(reset=reset),
        "cache_storage": shared_cache.storage_stats(),
        "external": metrics.snapshot(reset=reset),
        "canteen_index": {
            "path": path,
            "ttl_hours": core_settings.canteen_index_ttl_hours,
            "file_exists": file_exists,
            "file_size": file_size,
            "file_mtime": file_mtime,
            "store_has_in_memory": getattr(store, "_index", None) is not None,
            "store_file_mtime": getattr(store, "_file_mtime", None),
            "updated_at": index.updated_at.isoformat() if index is not None else None,
            "is_stale": index.is_stale(core_settings.canteen_index_ttl_hours) if index is not None else None,
            "total_canteens": len(index.canteens) if index is not None else None,
            "total_cities": index.city_count if index is not None else None,
        },
    }
