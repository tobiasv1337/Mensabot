import anyio
from fastapi import APIRouter

from ..analytics import analytics_store
from ..concurrency import get_io_semaphore
from ..services.canteen_index import load_canteen_index


router = APIRouter()


@router.get("/api/project-stats")
async def get_project_stats():
    async with get_io_semaphore():
        index = await anyio.to_thread.run_sync(load_canteen_index)
    return analytics_store.get_public_stats(
        canteen_index_info={
            "total_canteens": len(index.canteens),
            "total_cities": index.city_count,
        }
    )
