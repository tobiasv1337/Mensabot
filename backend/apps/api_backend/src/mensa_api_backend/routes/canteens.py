import anyio
from fastapi import APIRouter, HTTPException, Query

from mensa_mcp_server.cache import shared_cache
from mensa_mcp_server.cache_keys import openmensa_canteen_key
from mensa_mcp_server.schemas import MenuDietFilter, MenuResponseDTO, PriceCategory
from mensa_mcp_server.services.openmensa import fetch_single_menu, normalize_menu_date
from mensa_mcp_server.server import make_openmensa_client
from openmensa_sdk import OpenMensaAPIError

from ..concurrency import get_io_semaphore
from ..models import (
    CanteenIndexInfo,
    CanteenListResponse,
    CanteenOut,
    CanteenSearchResponse,
    CanteenSearchResultOut,
    PageInfo,
)
from ..services.canteen_index import canteen_to_out, load_canteen_index


router = APIRouter()

CACHE_TTL_CANTEEN_INFO_S = 60 * 60 * 24

@router.get("/api/canteens", response_model=CanteenListResponse)
async def list_canteens(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=500),
    city: str | None = None,
    has_coordinates: bool | None = None,
):
    async with get_io_semaphore():
        index = await anyio.to_thread.run_sync(load_canteen_index)
    canteens, total = index.list(page=page, per_page=per_page, city=city, has_coordinates=has_coordinates)
    next_page = page + 1 if page * per_page < total else None
    return CanteenListResponse(
        canteens=[canteen_to_out(c) for c in canteens],
        page_info=PageInfo(
            current_page=page,
            per_page=per_page,
            next_page=next_page,
            has_next=next_page is not None,
        ),
        index=CanteenIndexInfo(
            updated_at=index.updated_at.isoformat(),
            total_canteens=len(index.canteens),
            total_cities=index.city_count,
        ),
        total_results=total,
    )


@router.get("/api/canteens/search", response_model=CanteenSearchResponse)
async def search_canteens(
    query: str | None = None,
    city: str | None = None,
    near_lat: float | None = Query(None, ge=-90.0, le=90.0),
    near_lng: float | None = Query(None, ge=-180.0, le=180.0),
    radius_km: float | None = Query(None, gt=0.0),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    min_score: float = Query(60.0, ge=0.0, le=100.0),
    has_coordinates: bool | None = None,
    sort_by: str = Query("auto", pattern="^(auto|distance|name|city)$"),
):
    if (near_lat is None) != (near_lng is None):
        raise HTTPException(status_code=400, detail="near_lat and near_lng must be provided together.")

    async with get_io_semaphore():
        index = await anyio.to_thread.run_sync(load_canteen_index)
    results, total = index.search(
        query,
        city=city,
        near_lat=near_lat,
        near_lng=near_lng,
        radius_km=radius_km,
        page=page,
        per_page=per_page,
        min_score=min_score,
        has_coordinates=has_coordinates,
        sort_by=sort_by,
    )

    next_page = page + 1 if page * per_page < total else None

    return CanteenSearchResponse(
        results=[
            CanteenSearchResultOut(
                canteen=canteen_to_out(r.canteen),
                score=r.score,
                distance_km=r.distance_km,
            )
            for r in results
        ],
        total_results=total,
        page_info=PageInfo(
            current_page=page,
            per_page=per_page,
            next_page=next_page,
            has_next=next_page is not None,
        ),
        index=CanteenIndexInfo(
            updated_at=index.updated_at.isoformat(),
            total_canteens=len(index.canteens),
            total_cities=index.city_count,
        ),
    )


@router.get("/api/canteens/{canteen_id}", response_model=CanteenOut)
async def get_canteen_info_api(canteen_id: int):
    cache_key = openmensa_canteen_key(canteen_id)
    cached = shared_cache.get(cache_key)
    if cached is not None:
        return CanteenOut.model_validate(cached)

    def _fetch_canteen():
        with make_openmensa_client() as client:
            return client.get_canteen(canteen_id)

    try:
        async with get_io_semaphore():
            canteen = await anyio.to_thread.run_sync(_fetch_canteen)
    except OpenMensaAPIError as exc:
        if getattr(exc, "status_code", None) == 404:
            raise HTTPException(status_code=404, detail="Canteen not found") from exc
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    response = canteen_to_out(canteen)
    shared_cache.set(cache_key, response.model_dump(exclude_none=True), ttl_s=CACHE_TTL_CANTEEN_INFO_S)
    return response


@router.get("/api/canteens/{canteen_id}/menu", response_model=MenuResponseDTO)
async def get_canteen_menu_api(
    canteen_id: int,
    date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    diet_filter: MenuDietFilter | None = Query(None),
    exclude_allergens: list[str] | None = Query(None),
    price_category: PriceCategory | None = Query(None),
):
    if diet_filter is None:
        diet_filter = MenuDietFilter.all
    if exclude_allergens is None:
        exclude_allergens = []

    normalized_date, error_response = normalize_menu_date(canteen_id=canteen_id, date=date)
    if error_response is not None:
        return error_response

    def _fetch_menu():
        with make_openmensa_client() as client:
            return fetch_single_menu(
                client=client,
                canteen_id=canteen_id,
                normalized_date=normalized_date,
                diet_filter=diet_filter,
                exclude_allergens=exclude_allergens,
                price_category=price_category,
            )

    async with get_io_semaphore():
        return await anyio.to_thread.run_sync(_fetch_menu)
