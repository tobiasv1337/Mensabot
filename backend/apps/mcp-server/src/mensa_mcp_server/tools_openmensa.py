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
    PriceCategory,
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
        [_meal_to_dto(m, price_category) for m in meals],
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
    Find canteens by geographic coordinates with pagination.
    
    Returns paginated list of nearby canteens. For more results, call again with
    `page = page_info.next_page` while `page_info.has_next` is true.
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
    Get canteen metadata: name, address, city, and GPS coordinates.
    
    Use after discovering a canteen ID from list_canteens_near to get full details.
    """
    with make_openmensa_client() as client:
        canteen = client.get_canteen(canteen_id)

    return _canteen_to_dto(canteen)


@mcp.tool()
def get_menu_for_date(
    canteen_id: Annotated[int, Field(ge=1, description="OpenMensa canteen ID (e.g. 2019 for TU Hardenbergstraße Berlin)")],
    date: Annotated[Optional[str], Field(pattern=r"^\d{4}-\d{2}-\d{2}$", description="Target date in YYYY-MM-DD format. If omitted or null, uses today's date.")] = None,
    diet_filter: Annotated[Optional[MenuDietFilter], Field(description="Filter meals by diet type (all, meat_only, vegetarian, vegan). Null oder 'all' = kein Filter.")] = None,
    exclude_allergens: Annotated[Optional[list[str]], Field(default=None, description="Exclude meals containing any of these allergens (e.g. 'sesame', 'soja', 'peanut'). Null = kein Filter.")] = None,
    price_category: Annotated[Optional[PriceCategory], Field(default=None, description="Filter to one price category (students/employees/pupils/others) if known. Null = kein Filter.")] = None,
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
    The diet_type and allergens are inferred from meal data and can't be guaranteed to be always correct.
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

    with make_openmensa_client() as client:
        return _fetch_single_menu(
            client,
            canteen_id,
            normalized_date,
            diet_filter,
            exclude_allergens,
            price_category,
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
    Fetch menus for multiple canteens/dates in one efficient call.
    
    Preferred over repeated get_menu_for_date calls when fetching more than one menu.
    Each request can have its own diet_filter and allergen exclusions.
    The diet_type and allergens are inferred from meal data and can't be guaranteed to be always correct.
    Responses preserve input order with same statuses as get_menu_for_date.
    """

    results: list[MenuResponseDTO] = []

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

    return MenuBatchResponseDTO(results=results)
