"""
Mensabot MCP Server — tools_openmensa
Author: Tobias Veselsky
Description: Provides OpenMensa-related tools for the MCP server.
"""

import anyio
from typing import Annotated, Optional
from pydantic import Field

from .concurrency import get_io_semaphore
from .server import mcp, make_openmensa_client
from .settings import settings
from .cache import shared_cache
from .cache_keys import openmensa_canteen_key, osm_opening_hours_key
from .schemas import (
    # OpenMensa DTOs
    CanteenDTO,
    CanteenIndexInfoDTO,
    CanteenSearchResultDTO,
    CanteenSearchResponseDTO,
    MenuResponseDTO,
    MenuResponsePublicDTO,
    MenuBatchRequestDTO,
    MenuBatchResponsePublicDTO,
    MenuDietFilter,
    PriceCategory,
    _canteen_to_dto,
    MealPublicDTO,

    # OSM opening-hours DTOs
    OSMResolveForCanteenResponseDTO,
    OpenMensaCanteenRefDTO,
)

from .osm_opening_hours import resolve_opening_hours_osm
from .services.canteen_index import load_canteen_index
from .services.openmensa import fetch_single_menu, normalize_menu_date

# ------------------------------ internal helpers ------------------------------

CACHE_TTL_CANTEEN_INFO_S = 60 * 60 * 24
CACHE_TTL_OPENING_HOURS_S = 60 * 60 * 24


def _to_public_menu(menu: MenuResponseDTO) -> MenuResponsePublicDTO:
    return MenuResponsePublicDTO(
        canteen_id=menu.canteen_id,
        date=menu.date,
        status=menu.status,
        meals=[
            MealPublicDTO(
                name=meal.name,
                category=meal.category,
                prices=meal.prices,
                diet_type=meal.diet_type,
                allergens=meal.allergens,
            )
            for meal in menu.meals
        ],
        total_meals=menu.total_meals,
        returned_meals=menu.returned_meals,
    )


# ------------------------------ OpenMensa tools ------------------------------


@mcp.tool()
async def search_canteens(
    query: Annotated[Optional[str], Field(default=None, description="Fuzzy name query (e.g. 'TU Berlin', 'mensa hardenberg'). If omitted, only location filters apply.")] = None,
    city: Annotated[Optional[str], Field(default=None, description="Base city. All canteens in this city are always included.")] = None,
    near_lat: Annotated[Optional[float], Field(default=None, ge=-90.0, le=90.0, description="Latitude of the expansion center (used with radius_km).")] = None,
    near_lng: Annotated[Optional[float], Field(default=None, ge=-180.0, le=180.0, description="Longitude of the expansion center (used with radius_km).")] = None,
    radius_km: Annotated[Optional[float], Field(default=None, gt=0.0, description="Radius in kilometers to include nearby canteens outside the base city. If near_lat/near_lng are provided and radius_km is omitted, no distance limit is applied.")] = None,
    limit: Annotated[int, Field(ge=1, le=100, description="Max number of results to return.")] = 20,
    min_score: Annotated[float, Field(ge=0.0, le=100.0, description="Minimum text score (0-100). Set to 0 for broad results.")] = 60.0,
) -> CanteenSearchResponseDTO:
    """
    Search canteens by name and/or location.

    **Location Logic:**
    - **Sort by Distance:** Provide `near_lat` and `near_lng`. Results will be sorted closest-first.
    - **Filter by Distance:** Add `radius_km` to restricts results to a specific range.
    - **Filter by City:** Provide `city`. Returns all canteens in that city (strict match).

    **How parameters interact:**
    - `near_lat`/`near_lng` WITHOUT `radius_km`: Returns the closest canteens (up to `limit`). No distance cutoff.
    - `city` combined with `radius_km`: Returns canteens in the city PLUS any others within the radius of the center.

    **Examples:**
    - "Find canteens near me":
      `{"near_lat": 52.5, "near_lng": 13.4}` (Returns closest 20 canteens)
    - "Find canteens in Berlin":
      `{"city": "Berlin"}`
    - "Find canteens within 5km of me":
      `{"near_lat": 52.5, "near_lng": 13.4, "radius_km": 5}`
    - "Complex search (All in Munich + everything within 20km of the provided coordinates, max 50 results)":
      `{"city": "Munich", "near_lat": 48.13, "near_lng": 11.58, "radius_km": 20, "limit": 50}`
    """
    if (near_lat is None) != (near_lng is None):
        raise ValueError("near_lat and near_lng must be provided together.")


    async with get_io_semaphore():
        index = await anyio.to_thread.run_sync(load_canteen_index)
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
async def get_canteen_info(
    canteen_id: Annotated[int, Field(ge=1, description="OpenMensa canteen ID (e.g. 2019 for TU Hardenbergstraße Berlin)")],
) -> CanteenDTO:
    """
    Get canteen metadata: name, address, city, and GPS coordinates.
    
    Use after discovering a canteen ID from search_canteens to get full details.
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

    async with get_io_semaphore():
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
) -> MenuResponsePublicDTO:
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

    normalized_date, error_response = normalize_menu_date(canteen_id, date)
    if error_response is not None:
        return _to_public_menu(error_response)

    def _fetch_menu():
        with make_openmensa_client() as client:
            return fetch_single_menu(
                client,
                canteen_id,
                normalized_date,
                diet_filter,
                exclude_allergens,
                price_category,
            )

    async with get_io_semaphore():
        menu = await anyio.to_thread.run_sync(_fetch_menu)
        return _to_public_menu(menu)


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
) -> MenuBatchResponsePublicDTO:
    """
    Fetch menus for multiple canteens/dates in one efficient call.

    Preferred over repeated get_menu_for_date calls when fetching more than one menu.
    Each request can have its own diet_filter and allergen exclusions as in get_menu_for_date.
    The diet_type and allergens are inferred from meal data and can't be guaranteed to be always correct. Don't fully rely on them. Always treat them with caution and inform users accordingly.
    Responses preserve input order with same statuses as get_menu_for_date.

            Example (all parameters used):
            ```json
            {
                "tool": "get_menus_batch",
                "parameters": {
                    "requests": [
                        {"canteen_id": 2019, "date": "2024-06-01", "diet_filter": "vegetarian", "exclude_allergens": ["gluten", "soy"], "price_category": "employees"},
                        {"canteen_id": 42, "date": "2024-06-02", "diet_filter": "meat_only", "exclude_allergens": [], "price_category": "students"}
                    ]
                }
            }
            ```
    """

    def _fetch_batch() -> list[MenuResponsePublicDTO]:
        _results: list[MenuResponsePublicDTO] = []
        with make_openmensa_client() as client:
            for req in requests:
                normalized_date, error_response = normalize_menu_date(canteen_id=req.canteen_id, date=req.date)

                if error_response is not None:
                    _results.append(_to_public_menu(error_response))
                    continue

                normalized_diet_filter = req.diet_filter or MenuDietFilter.all
                normalized_exclude_allergens = req.exclude_allergens or []

                _results.append(
                    _to_public_menu(
                        fetch_single_menu(
                            client,
                            req.canteen_id,
                            normalized_date,
                            normalized_diet_filter,
                            normalized_exclude_allergens,
                            req.price_category,
                        )
                    )
                )
        return _results

    async with get_io_semaphore():
        results = await anyio.to_thread.run_sync(_fetch_batch)

    return MenuBatchResponsePublicDTO(results=results)


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

    async with get_io_semaphore():
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

        async with get_io_semaphore():
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
