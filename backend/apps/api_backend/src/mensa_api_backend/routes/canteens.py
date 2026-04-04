import anyio
from fastapi import APIRouter, HTTPException, Query, Request

from mensabot_backend_core.canteen_service import CanteenLookupError, CanteenNotFoundError, fetch_canteen_info
from mensabot_backend_core.dto import MenuDietFilter, MenuResponseDTO, OSMResolveForCanteenResponseDTO, PriceCategory
from mensabot_backend_core.menu_service import fetch_single_menu, normalize_menu_date
from mensabot_backend_core.opening_hours_service import fetch_opening_hours_osm_for_canteen
from mensabot_backend_core.openmensa_client import make_openmensa_client

from ..analytics import (
    CHAT_ID_HEADER,
    INTERACTION_KIND_HEADER,
    MESSAGE_ORIGIN_HEADER,
    REQUEST_ID_HEADER,
    USER_ID_HEADER,
    analytics_store,
)
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


def _analytics_context_from_headers(request: Request):
    interaction_kind = request.headers.get(INTERACTION_KIND_HEADER)
    if interaction_kind != "quick_lookup":
        return None
    return analytics_store.prepare_request_context(
        user_id=request.headers.get(USER_ID_HEADER),
        chat_id=request.headers.get(CHAT_ID_HEADER),
        request_id=request.headers.get(REQUEST_ID_HEADER),
        message_origin=request.headers.get(MESSAGE_ORIGIN_HEADER),
        interaction_kind="quick_lookup",
    )


@router.get("/api/canteens", response_model=CanteenListResponse)
async def list_canteens(page: int = Query(1, ge=1), per_page: int = Query(50, ge=1, le=500), city: str | None = None, has_coordinates: bool | None = None):
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
async def search_canteens(query: str | None = None, city: str | None = None, near_lat: float | None = Query(None, ge=-90.0, le=90.0), near_lng: float | None = Query(None, ge=-180.0, le=180.0), radius_km: float | None = Query(None, gt=0.0), page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), min_score: float = Query(60.0, ge=0.0, le=100.0), has_coordinates: bool | None = None, sort_by: str = Query("auto", pattern="^(auto|distance|name|city)$")):
    if (near_lat is None) != (near_lng is None):
        raise HTTPException(status_code=400, detail="near_lat and near_lng must be provided together.")

    async with get_io_semaphore():
        index = await anyio.to_thread.run_sync(load_canteen_index)

    def _search():
        return index.search(
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

    # Can be a bit CPU-intensive, so run in thread to avoid blocking the event loop.
    results, total = await anyio.to_thread.run_sync(_search)

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
async def get_canteen_info_api(canteen_id: int, request: Request):
    try:
        async with get_io_semaphore():
            dto = await anyio.to_thread.run_sync(fetch_canteen_info, canteen_id)
    except CanteenNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Canteen not found") from exc
    except CanteenLookupError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc

    analytics_store.record_quick_lookup(_analytics_context_from_headers(request), canteen_id=canteen_id)
    return CanteenOut.model_validate(dto.model_dump(exclude_none=True))


@router.get("/api/canteens/{canteen_id}/opening-hours", response_model=OSMResolveForCanteenResponseDTO)
async def get_canteen_opening_hours_api(canteen_id: int, request: Request):
    try:
        response = await fetch_opening_hours_osm_for_canteen(canteen_id=canteen_id)
    except CanteenNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CanteenLookupError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to resolve opening hours.") from exc
    analytics_store.record_quick_lookup(_analytics_context_from_headers(request), canteen_id=canteen_id)
    return response


@router.get("/api/canteens/{canteen_id}/menu", response_model=MenuResponseDTO)
async def get_canteen_menu_api(request: Request, canteen_id: int, date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"), diet_filter: MenuDietFilter | None = Query(None), exclude_allergens: list[str] | None = Query(None), price_category: PriceCategory | None = Query(None)):
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
        response = await anyio.to_thread.run_sync(_fetch_menu)
    analytics_store.record_quick_lookup(
        _analytics_context_from_headers(request),
        canteen_id=canteen_id,
        diet_filter=diet_filter.value if diet_filter is not None else None,
        exclude_allergens=exclude_allergens,
        price_category=price_category.value if price_category is not None else None,
    )
    return response
