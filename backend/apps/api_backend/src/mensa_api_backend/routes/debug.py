from fastapi import APIRouter, HTTPException, Query

from mensa_mcp_server.cache import shared_cache
from mensa_mcp_server.metrics import metrics

from ..config import settings


router = APIRouter()


@router.get("/api/debug/metrics")
async def get_debug_metrics(
    reset: bool = Query(False, description="If true, reset counters after reading."),
):
    if not settings.enable_debug_endpoints:
        # 404 so the endpoint is effectively hidden unless explicitly enabled.
        raise HTTPException(status_code=404, detail="Not found")

    return {
        "cache": shared_cache.stats(reset=reset),
        "external": metrics.snapshot(reset=reset),
    }

