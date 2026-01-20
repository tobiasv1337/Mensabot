"""
Mensabot MCP Server — tools_openmensa
Author: Tobias Veselsky
Description: Provides OpenMensa-related tools for the MCP server.
"""

import datetime as dt
from typing import Annotated, Optional
from pydantic import Field

from openmensa_sdk import OpenMensaAPIError, OpenMensaClient
from .server import mcp, make_openmensa_client
from .schemas import (
    CanteenDTO,
    PageInfoDTO,
    CanteenListResponseDTO,
    MenuResponseDTO,
    MenuStatusDTO,
    MenuBatchRequestDTO,
    MenuBatchResponseDTO,
    MenuDietFilter,
    DietType,
    MealDTO,
    _canteen_to_dto,
    _meal_to_dto,
    _canonicalize_allergen_label,
)

# ------------------------------ internal helpers ------------------------------

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
        return dt.date.today().isoformat(), None

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
        if diet_filter == MenuDietFilter.meat_only and meal.diet_type not in {DietType.meat}:
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
) -> MenuResponseDTO:
    """Fetch a single menu and map OpenMensa errors to MenuResponseDTO statuses."""

    try:
        meals = client.list_meals(canteen_id, normalized_date)
    except OpenMensaAPIError as e:
        # OpenMensa uses 404 to indicate "no plan published yet"
        if e.status_code == 404:
            return MenuResponseDTO(
                canteen_id=canteen_id,
                date=normalized_date,
                status=MenuStatusDTO.no_menu_published,
                meals=[],
                total_meals=0,
                returned_meals=0,
            )

        return MenuResponseDTO(
            canteen_id=canteen_id,
            date=normalized_date,
            status=MenuStatusDTO.api_error,
            meals=[],
            total_meals=0,
            returned_meals=0,
        )
    
    if not meals:
        return MenuResponseDTO(
            canteen_id=canteen_id,
            date=normalized_date,
            status=MenuStatusDTO.empty_menu,
            meals=[],
            total_meals=0,
            returned_meals=0,
        )
    total_meals = len(meals)
    filtered_meals = _filter_meals(
        [_meal_to_dto(m) for m in meals],
        diet_filter,
        exclude_allergens,
    )

    status = MenuStatusDTO.ok if filtered_meals else MenuStatusDTO.filtered_out

    return MenuResponseDTO(
        canteen_id=canteen_id,
        date=normalized_date,
        status=status,
        meals=filtered_meals,
        total_meals=total_meals,
        returned_meals=len(filtered_meals),
    )

# ------------------------------ MCP tools ------------------------------

@mcp.tool()
def list_canteens_near(
    lat: Annotated[float, Field(ge=-90.0, le=90.0, description="Latitude in decimal degrees (WGS84)")],
    lng: Annotated[float, Field(ge=-180.0, le=180.0, description="Longitude in decimal degrees (WGS84)")],
    radius_km: Annotated[float, Field(gt=0.0, description="Search radius in kilometers")],
    page: Annotated[int, Field(ge=1, description="1-based page number")] = 1,
    per_page: Annotated[int, Field(ge=1, description="Number of results per page")] = 20,
) -> CanteenListResponseDTO:
    """
    List canteens near a geographic location (paginated).
    
    Use this when you need nearby canteens around a latitude/longitude. Call again with
    `page = page_info.next_page` while `page_info.has_next` is true to fetch more results.
    """
    with make_openmensa_client() as client:
        canteens, next_page = client.list_canteens(
            near_lat=lat,
            near_lng=lng,
            near_dist=radius_km,
            per_page=per_page,
            page=page,
        )

    return CanteenListResponseDTO(
        canteens=[_canteen_to_dto(c) for c in canteens],
        page_info=PageInfoDTO(
            current_page=page,
            per_page=per_page,
            next_page=next_page,
            has_next=next_page is not None,
        ),
    )


@mcp.tool()
def get_canteen_info(
    canteen_id: Annotated[int, Field(ge=1, description="OpenMensa canteen ID (e.g. 2019 for TU Hardenbergstraße Berlin)")],
) -> CanteenDTO:
    """
    Get detailed metadata for a single canteen by its OpenMensa ID.
    
    Use this to retrieve name, address, city and coordinates for a specific canteen.
    """
    with make_openmensa_client() as client:
        canteen = client.get_canteen(canteen_id)

    return _canteen_to_dto(canteen)


@mcp.tool()
def get_menu_for_date(
    canteen_id: Annotated[int, Field(ge=1, description="OpenMensa canteen ID (e.g. 2019 for TU Hardenbergstraße Berlin)")],
    date: Annotated[Optional[str], Field(pattern=r"^\d{4}-\d{2}-\d{2}$", description="Target date in YYYY-MM-DD format. If omitted or null, uses today's date.")] = None,
    diet_filter: Annotated[MenuDietFilter, Field(description="Filter meals by diet type (all, meat_only, vegetarian, vegan)")] = MenuDietFilter.all,
    exclude_allergens: Annotated[Optional[list[str]], Field(default=None, description="Exclude meals containing any of these allergens (e.g. 'sesame', 'soja', 'peanut').")]=None,
) -> MenuResponseDTO:
    """
    Get all meals for a single canteen on a specific date.
    
    The response `status` field is:
    - `ok` if a menu exists,
    - `no_menu_published` if no plan is published yet,
    - `empty_menu` if the menu is published but contains no meals - likely indicating that the canteen is just closed on that day,
    - `filtered_out` if the menu exists but all meals were removed by `diet_filter` / `exclude_allergens`,
    - `invalid_date` if the date string is not a valid ISO date,
    - `api_error` for other upstream OpenMensa errors.
    
    To save tokens we omit OpenMensa notes from the response and instead expose
    `diet_type` (vegan / vegetarian / meat / unknown) and a canonical `allergens`
    list. Use `diet_filter` and `exclude_allergens` to reduce the result set
    before it is returned to the LLM. `total_meals` reports how many meals the
    source menu contained, `returned_meals` how many are left after filtering.

    Meal prices may be null for individual groups (e.g. pupils) when no price was published.
    """

    # normalize mutable default
    exclude_allergens = exclude_allergens or []

    normalized_date, error_response = _normalize_menu_date(canteen_id, date)
    if error_response is not None:
        return error_response

    with make_openmensa_client() as client:
        return _fetch_single_menu(
            client,
            canteen_id,
            normalized_date,
            diet_filter,
            exclude_allergens,
        )


@mcp.tool()
def get_menus_batch(
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
    Get menus for multiple canteen/date pairs in one call.

    Use this when you want to fetch menus across multiple canteens or dates.
    Returns the same data as if calling get_menu_for_date repeatedly for each pair.
    Prefer this method for more than one (canteen_id, date) pair to get more data with fewer tool calls.

    Each request entry can also carry `diet_filter` and `exclude_allergens` to
    shrink responses per canteen/date before they reach the LLM. `total_meals`
    and `returned_meals` indicate how many items were present before/after
    filtering, and `filtered_out` signals when the menu existed but nothing
    survived the filters.

    The response contains one `MenuResponseDTO` per input entry in the same order:
    - `status = ok` if a menu exists,
    - `status = no_menu_published` if no plan is published yet,
    - `status = invalid_date` if the date is not a valid ISO date,
    - `status = api_error` for other upstream OpenMensa errors.
    """

    results: list[MenuResponseDTO] = []

    with make_openmensa_client() as client:
        for req in requests:
            normalized_date, error_response = _normalize_menu_date(canteen_id=req.canteen_id, date=req.date)

            if error_response is not None:
                results.append(error_response)
                continue

            results.append(
                _fetch_single_menu(
                    client,
                    req.canteen_id,
                    normalized_date,
                    req.diet_filter,
                    req.exclude_allergens,
                )
            )

    return MenuBatchResponseDTO(results=results)
