"""
Mensabot MCP Server — tools_openmensa
Author: Tobias Veselsky
Description: Provides OpenMensa-related tools for the MCP server.
"""

import datetime as dt
import anyio
from zoneinfo import ZoneInfo
from typing import Annotated, Optional
from pydantic import Field

from openmensa_sdk import OpenMensaAPIError, OpenMensaClient, CanteenIndexStore
from .concurrency import IO_SEMAPHORE
from .server import mcp, make_openmensa_client
from .settings import settings
from .cache import shared_cache
from .cache_keys import openmensa_canteen_key, openmensa_canteens_near_key, openmensa_menu_key, osm_opening_hours_key
from .schemas import (
    # OpenMensa DTOs
    CanteenDTO,
    PageInfoDTO,
    CanteenListResponseDTO,
    CanteenIndexInfoDTO,
    CanteenSearchResultDTO,
    CanteenSearchResponseDTO,
    MenuResponseDTO,
    MenuStatusDTO,
    MenuBatchRequestDTO,
    MenuBatchResponseDTO,
    MenuDietFilter,
    DietType,
    MealDTO,
    PriceCategory,
    _canteen_to_dto,
    _meal_to_dto,
    _canonicalize_allergen_label,
    DateEntryDTO,
    WeekRangeDTO,
    DateContextDTO,
    WeekdayName,

    # OSM opening-hours DTOs
    OSMResolveForCanteenResponseDTO,
    OpenMensaCanteenRefDTO,
)

from .osm_opening_hours import (
    resolve_opening_hours_osm,
    OSMRef,
    fetch_osm_element,
)

# ------------------------------ internal helpers ------------------------------

_WEEKDAY_BY_INDEX: tuple[WeekdayName, ...] = (
    WeekdayName.monday,
    WeekdayName.tuesday,
    WeekdayName.wednesday,
    WeekdayName.thursday,
    WeekdayName.friday,
    WeekdayName.saturday,
    WeekdayName.sunday,
)

CACHE_TTL_MENU_S = 60 * 60
CACHE_TTL_CANTEEN_INFO_S = 60 * 60 * 24
CACHE_TTL_CANTEEN_LIST_S = 60 * 60 * 24
CACHE_TTL_OPENING_HOURS_S = 60 * 60 * 24

def _local_now() -> dt.datetime:
    return dt.datetime.now(ZoneInfo(settings.timezone))

def _local_today() -> dt.date:
    return _local_now().date()

def _week_start(date: dt.date) -> dt.date:
    return date - dt.timedelta(days=date.weekday())

def _date_entry(date: dt.date) -> DateEntryDTO:
    weekday = _WEEKDAY_BY_INDEX[date.weekday()]
    return DateEntryDTO(
        date=date.isoformat(),
        weekday=weekday,
        is_weekend=date.weekday() >= 5,
    )

def _week_range(start_date: dt.date) -> WeekRangeDTO:
    days = [_date_entry(start_date + dt.timedelta(days=offset)) for offset in range(7)]
    return WeekRangeDTO(
        start_date=start_date.isoformat(),
        end_date=(start_date + dt.timedelta(days=6)).isoformat(),
        days=days,
        weekdays=days[:5],
    )

def _normalize_menu_date(
    canteen_id: int,
    date: Optional[str],
) -> tuple[str | None, MenuResponseDTO | None]:
    """
    Normalize/validate a menu date.

    Returns (normalized_date, error_response):
    - If the date is None, normalized_date is today's ISO date and error_response is None.
    - If the date is invalid, normalized_date is None and error_response is a MenuResponseDTO
      with status=invalid_date.
    - If the date is valid, normalized_date is the same string and error_response is None.
    """
    if date is None:
        return _local_today().isoformat(), None

    try:
        dt.date.fromisoformat(date)
    except ValueError:
        # keep the original invalid input in the response
        return None, MenuResponseDTO(
            canteen_id=canteen_id,
            date=date,
            status=MenuStatusDTO.invalid_date,
            meals=[],
            total_meals=0,
            returned_meals=0,
        )

    return date, None


def _filter_meals(
    meals: list[MealDTO],
    diet_filter: MenuDietFilter,
    exclude_allergens: list[str],
) -> list[MealDTO]:
    """Apply diet and allergen filters to meal DTOs."""

    excluded: set[str] = set()
    for label in exclude_allergens:
        canon = _canonicalize_allergen_label(label)
        if canon:
            excluded.add(canon)

    filtered: list[MealDTO] = []
    for meal in meals:
        if diet_filter == MenuDietFilter.vegan and meal.diet_type != DietType.vegan:
            continue
        if diet_filter == MenuDietFilter.vegetarian and meal.diet_type not in {DietType.vegan, DietType.vegetarian}:
            continue
        if diet_filter == MenuDietFilter.meat_only and meal.diet_type != DietType.meat:
            continue

        if excluded and set(meal.allergens) & excluded:
            continue

        filtered.append(meal)

    return filtered


def _fetch_single_menu(
    client: OpenMensaClient,
    canteen_id: int,
    normalized_date: str,
    diet_filter: MenuDietFilter,
    exclude_allergens: list[str],
    price_category: PriceCategory | None = None,
) -> MenuResponseDTO:
    """Fetch a single menu and map OpenMensa errors to MenuResponseDTO statuses."""

    cache_key = openmensa_menu_key(canteen_id=canteen_id, date=normalized_date, diet_filter=diet_filter, price_category=price_category, exclude_allergens=exclude_allergens)
    cached = shared_cache.get(cache_key)
    if cached is not None:
        return MenuResponseDTO.model_validate(cached)

    try:
        meals = client.list_meals(canteen_id, normalized_date)
    except OpenMensaAPIError as e:
        # OpenMensa uses 404 to indicate "no plan published yet"
        if e.status_code == 404:
            response = MenuResponseDTO(
                canteen_id=canteen_id,
                date=normalized_date,
                status=MenuStatusDTO.no_menu_published,
                meals=[],
                total_meals=0,
                returned_meals=0,
            )
            shared_cache.set(cache_key, response.model_dump(exclude_none=True), ttl_s=CACHE_TTL_MENU_S)
            return response

        return MenuResponseDTO(
            canteen_id=canteen_id,
            date=normalized_date,
            status=MenuStatusDTO.api_error,
            meals=[],
            total_meals=0,
            returned_meals=0,
        )
    
    if not meals:
        response = MenuResponseDTO(
            canteen_id=canteen_id,
            date=normalized_date,
            status=MenuStatusDTO.empty_menu,
            meals=[],
            total_meals=0,
            returned_meals=0,
        )
        shared_cache.set(cache_key, response.model_dump(exclude_none=True), ttl_s=CACHE_TTL_MENU_S)
        return response
    total_meals = len(meals)
    filtered_meals = _filter_meals(
        [_meal_to_dto(m, price_category) for m in meals],
        diet_filter,
        exclude_allergens,
    )

    status = MenuStatusDTO.ok if filtered_meals else MenuStatusDTO.filtered_out

    response = MenuResponseDTO(
        canteen_id=canteen_id,
        date=normalized_date,
        status=status,
        meals=filtered_meals,
        total_meals=total_meals,
        returned_meals=len(filtered_meals),
    )
    shared_cache.set(cache_key, response.model_dump(exclude_none=True), ttl_s=CACHE_TTL_MENU_S)
    return response


_INDEX_STORE: CanteenIndexStore | None = None


def _get_index_store() -> CanteenIndexStore:
    global _INDEX_STORE
    if _INDEX_STORE is None:
        path = settings.canteen_index_path
        _INDEX_STORE = CanteenIndexStore(path=path) if path else CanteenIndexStore()
    return _INDEX_STORE


def _load_canteen_index():
    store = _get_index_store()
    with make_openmensa_client() as client:
        return store.refresh_if_stale_or_cached(client, ttl_hours=settings.canteen_index_ttl_hours)

# ------------------------------ OpenMensa tools ------------------------------


@mcp.tool()
async def search_canteens(
    query: Annotated[Optional[str], Field(default=None, description="Fuzzy name query (e.g. 'TU Berlin', 'mensa hardenberg'). If omitted, only location filters apply.")] = None,
    city: Annotated[Optional[str], Field(default=None, description="Base city. All canteens in this city are always included.")] = None,
    near_lat: Annotated[Optional[float], Field(default=None, ge=-90.0, le=90.0, description="Latitude of the expansion center (used with radius_km).")] = None,
    near_lng: Annotated[Optional[float], Field(default=None, ge=-180.0, le=180.0, description="Longitude of the expansion center (used with radius_km).")] = None,
    radius_km: Annotated[Optional[float], Field(default=None, gt=0.0, description="Radius in kilometers to include nearby canteens outside the base city.")] = None,
    limit: Annotated[int, Field(ge=1, le=100, description="Max number of results to return.")] = 20,
    min_score: Annotated[float, Field(ge=0.0, le=100.0, description="Minimum text score (0-100). Set to 0 for broad results.")] = 60.0,
) -> CanteenSearchResponseDTO:
    """
    Search canteens by name and/or location.
    If you provide the exact user location (near_lat + near_lng), it also gives approximate distances to each canteen.
    If you only provide a city, the distances are only to the approximated city center, not to the user location.

    How it works:
    - If `city` is set: all canteens in that city are always included.
    - `radius_km` expands beyond the city:
      - if `near_lat` + `near_lng` are set, they define the center
      - otherwise the city centroid is used (if available)
    - If no center can be determined, `radius_km` is ignored.
    - If `near_lat/lng` are set without `radius_km`, a default radius of 10 km is used.
    - If both `city` and `near_lat/lng` are set, the city is the base set and the radius uses the coordinates.
    - If `query` is omitted, score is 0 and results are ordered by distance (if available).
    """
    if (near_lat is None) != (near_lng is None):
        raise ValueError("near_lat and near_lng must be provided together.")

    async with IO_SEMAPHORE:
        index = await anyio.to_thread.run_sync(_load_canteen_index)
    results, total = index.search(
        query,
        city=city,
        near_lat=near_lat,
        near_lng=near_lng,
        radius_km=radius_km,
        per_page=limit, # Map limit -> per_page
        page=1,         # Default to first page
        min_score=min_score,
        has_coordinates=None, # Don't expose this filter to the LLM
    )

    return CanteenSearchResponseDTO(
        results=[
            CanteenSearchResultDTO(
                canteen=_canteen_to_dto(r.canteen),
                score=r.score,
                distance_km=r.distance_km,
            )
            for r in results
        ],
        total_results=total,
        index=CanteenIndexInfoDTO(
            updated_at=index.updated_at.isoformat(),
            total_canteens=len(index.canteens),
        ),
    )


@mcp.tool()
async def list_canteens_near(
    lat: Annotated[float, Field(ge=-90.0, le=90.0, description="Latitude in decimal degrees (WGS84)")],
    lng: Annotated[float, Field(ge=-180.0, le=180.0, description="Longitude in decimal degrees (WGS84)")],
    radius_km: Annotated[float, Field(gt=0.0, description="Search radius in kilometers")],
    page: Annotated[int, Field(ge=1, description="1-based page number")] = 1,
    per_page: Annotated[int, Field(ge=1, description="Number of results per page")] = 20,
) -> CanteenListResponseDTO:
    """
    Find canteens by geographic coordinates with pagination.
    
    Returns paginated list of nearby canteens. For more results, call again with
    `page = page_info.next_page` while `page_info.has_next` is true.
    """
    cache_key = openmensa_canteens_near_key(lat=lat, lng=lng, radius_km=radius_km, page=page, per_page=per_page)
    cached = shared_cache.get(cache_key)
    if cached is not None:
        return CanteenListResponseDTO.model_validate(cached)

    def _fetch_list():
        with make_openmensa_client() as client:
            return client.list_canteens(
                near_lat=lat,
                near_lng=lng,
                near_dist=radius_km,
                per_page=per_page,
                page=page,
            )

    async with IO_SEMAPHORE:
        canteens, next_page = await anyio.to_thread.run_sync(_fetch_list)

    response = CanteenListResponseDTO(
        canteens=[_canteen_to_dto(c) for c in canteens],
        page_info=PageInfoDTO(
            current_page=page,
            per_page=per_page,
            next_page=next_page,
            has_next=next_page is not None,
        ),
    )
    shared_cache.set(cache_key, response.model_dump(exclude_none=True), ttl_s=CACHE_TTL_CANTEEN_LIST_S)
    return response


@mcp.tool()
async def get_canteen_info(
    canteen_id: Annotated[int, Field(ge=1, description="OpenMensa canteen ID (e.g. 2019 for TU Hardenbergstraße Berlin)")],
) -> CanteenDTO:
    """
    Get canteen metadata: name, address, city, and GPS coordinates.
    
    Use after discovering a canteen ID from list_canteens_near to get full details.
    """
    cache_key = openmensa_canteen_key(canteen_id)
    cached = shared_cache.get(cache_key)
    if cached is not None:
        return CanteenDTO.model_validate(cached)

    def _fetch_canteen():
        with make_openmensa_client() as client:
            try:
                return client.get_canteen(canteen_id)
            except OpenMensaAPIError as e:
                if e.status_code == 404:
                    raise ValueError(f"Canteen with ID {canteen_id} not found.") from e
                raise

    async with IO_SEMAPHORE:
        canteen = await anyio.to_thread.run_sync(_fetch_canteen)

    dto = _canteen_to_dto(canteen)
    shared_cache.set(cache_key, dto.model_dump(exclude_none=True), ttl_s=CACHE_TTL_CANTEEN_INFO_S)
    return dto


@mcp.tool()
async def get_menu_for_date(
    canteen_id: Annotated[int, Field(ge=1, description="OpenMensa canteen ID (e.g. 2019 for TU Hardenbergstraße Berlin)")],
    date: Annotated[Optional[str], Field(pattern=r"^\d{4}-\d{2}-\d{2}$", description="Target date in YYYY-MM-DD format. If omitted or null, uses today's date.")] = None,
    diet_filter: Annotated[Optional[MenuDietFilter], Field(description="Filter meals by diet type (all, meat_only, vegetarian, vegan). Null or 'all' = no filter.")] = None,
    exclude_allergens: Annotated[Optional[list[str]], Field(default=None, description="Exclude meals containing any of these allergens (e.g. 'sesame', 'soja', 'peanut'). Null = no filter.")] = None,
    price_category: Annotated[Optional[PriceCategory], Field(default=None, description="Filter to one price category (students/employees/pupils/others) if known. Null = no filter.")] = None,
) -> MenuResponseDTO:
    """
    Get menu for a canteen on a specific date with optional diet/allergen filtering.
    
    Response status:
    - `ok`: Menu exists
    - `no_menu_published`: No menu available yet
    - `empty_menu`: Published but no meals (canteen closed)
    - `filtered_out`: Menu exists but all meals filtered out
    - `invalid_date`: Bad date format
    - `api_error`: API failure
    
    Uses `diet_type` (vegan/vegetarian/meat/unknown) and canonical `allergens` list.
    The diet_type and allergens are inferred from meal data and can't be guaranteed to be always correct. Don't fully rely on them. Always treat them with caution and inform users accordingly.
    `total_meals` = source count, `returned_meals` = after filtering.
    Prices may be null per group if unpublished.
    """

    # Normalize parameters: None = no filter
    if diet_filter is None:
        diet_filter = MenuDietFilter.all
    if exclude_allergens is None:
        exclude_allergens = []
    # price_category remains None if not set

    normalized_date, error_response = _normalize_menu_date(canteen_id, date)
    if error_response is not None:
        return error_response

    def _fetch_menu():
        with make_openmensa_client() as client:
            return _fetch_single_menu(
                client,
                canteen_id,
                normalized_date,
                diet_filter,
                exclude_allergens,
                price_category,
            )

    async with IO_SEMAPHORE:
        return await anyio.to_thread.run_sync(_fetch_menu)


@mcp.tool()
async def get_menus_batch(
    requests: Annotated[
        list[MenuBatchRequestDTO],
        Field(
            min_length=1,
            description=(
                "List of (canteen_id, date) pairs to fetch menus for. "
                "Dates may be null to use today's date."
            ),
        ),
    ],
) -> MenuBatchResponseDTO:
    """
    Fetch menus for multiple canteens/dates in one efficient call.

    Preferred over repeated get_menu_for_date calls when fetching more than one menu.
    Each request can have its own diet_filter and allergen exclusions as in get_menu_for_date.
    The diet_type and allergens are inferred from meal data and can't be guaranteed to be always correct. Don't fully rely on them. Always treat them with caution and inform users accordingly.
    Responses preserve input order with same statuses as get_menu_for_date.

            Example (OpenAI tool call):
            ```json
            {
                "tool": "get_menus_batch",
                "parameters": {
                    "requests": [
                        {"canteen_id": 2019, "date": "2024-06-01"},
                        {"canteen_id": 42, "date": null, "diet_filter": "vegan", "exclude_allergens": ["sesame", "peanut"], "price_category": "students"}
                    ]
                }
            }
            ```
    """

    results: list[MenuResponseDTO] = []

    def _fetch_batch():
        with make_openmensa_client() as client:
            for req in requests:
                normalized_date, error_response = _normalize_menu_date(canteen_id=req.canteen_id, date=req.date)

                if error_response is not None:
                    results.append(error_response)
                    continue

                normalized_diet_filter = req.diet_filter or MenuDietFilter.all
                normalized_exclude_allergens = req.exclude_allergens or []

                results.append(
                    _fetch_single_menu(
                        client,
                        req.canteen_id,
                        normalized_date,
                        normalized_diet_filter,
                        normalized_exclude_allergens,
                        req.price_category,
                    )
                )

    async with IO_SEMAPHORE:
        await anyio.to_thread.run_sync(_fetch_batch)

    return MenuBatchResponseDTO(results=results)


# ------------------------------ OSM opening hours tools ------------------------------


@mcp.tool()
async def get_opening_hours_osm_for_canteen(
    canteen_id: Annotated[int, Field(ge=1, description="OpenMensa canteen ID")],
    radius_m: Annotated[int, Field(ge=10, le=500, description="Initial search radius in meters")]=80,
    max_radius_m: Annotated[int, Field(ge=10, le=2000, description="Fallback search radius in meters")]=1000,
    max_candidates: Annotated[int, Field(ge=1, le=30, description="Max candidates returned")]=10,
) -> OSMResolveForCanteenResponseDTO:
    """Get opening hours from OpenStreetMap for an OpenMensa canteen ID.

    This uses the canteen's OpenMensa coordinates and name as a hint, then performs
    a deterministic Overpass lookup.

    Returns either a confident match (status=ok) or a ranked candidate list (status=ambiguous).
    If you get a ranked candidate list, you have to pick the best match yourself.

    If you use opening hours returned by this tool in a user-facing response,
    include the provided attribution (usually: "© OpenStreetMap contributors").
    """
    cache_key = osm_opening_hours_key(canteen_id=canteen_id)
    cached = shared_cache.get(cache_key)
    if cached is not None:
        return OSMResolveForCanteenResponseDTO.model_validate(cached)

    def _fetch_canteen():
        with make_openmensa_client() as client:
            try:
                return client.get_canteen(canteen_id)
            except OpenMensaAPIError as e:
                if e.status_code == 404:
                    raise ValueError(f"Canteen with ID {canteen_id} not found.") from e
                raise

    async with IO_SEMAPHORE:
        canteen = await anyio.to_thread.run_sync(_fetch_canteen)

    dto = _canteen_to_dto(canteen)

    # If OpenMensa has no coordinates, we can't do deterministic OSM matching.
    if dto.lat is None or dto.lng is None:
        res = {
            "status": "error",
            "opening_hours": None,
            "kitchen_hours": None,
            "source": None,
            "confidence": 0.0,
            "candidates": [],
            "note": "Canteen has no coordinates in OpenMensa data; cannot resolve via OSM.",
            "attribution": {
                "attribution": "© OpenStreetMap contributors",
                "attribution_url": "https://www.openstreetmap.org/copyright",
                "license": "ODbL 1.0",
            },
        }
    else:
        def _resolve():
            return resolve_opening_hours_osm(
                lat=dto.lat,
                lon=dto.lng,
                name_hint=dto.name,
                radius_m=radius_m,
                max_radius_m=max_radius_m,
                max_candidates=max_candidates,
            )

        async with IO_SEMAPHORE:
            res = await anyio.to_thread.run_sync(_resolve)

    res["openmensa"] = OpenMensaCanteenRefDTO(
        canteen_id=canteen_id,
        name=dto.name,
        lat=dto.lat,
        lng=dto.lng,
    ).model_dump(exclude_none=True)

    dto = OSMResolveForCanteenResponseDTO.model_validate(res)
    shared_cache.set(cache_key, dto.model_dump(exclude_none=True), ttl_s=CACHE_TTL_OPENING_HOURS_S)
    return dto
