"""
Mensabot MCP Server — tools_openmensa
Author: Tobias Veselsky
Description: Provides OpenMensa-related tools for the MCP server.
"""

import datetime as dt
from typing import Annotated, Optional
from pydantic import Field

from openmensa_sdk import OpenMensaAPIError
from .server import mcp, make_openmensa_client

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
        )

    return date, None

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
) -> MenuResponseDTO:
    """
    Get all meals for a single canteen on a specific date.
    
    The response `status` field is:
    - `ok` if a menu exists,
    - `no_menu_published` if no plan is published yet,
    - `invalid_date` if the date string is not a valid ISO date,
    - `api_error` for other upstream OpenMensa errors.
    
    Meal prices may be null for individual groups (e.g. pupils) when no price was published.
    """

    normalized_date, error_response = _normalize_menu_date(canteen_id, date)
    if error_response is not None:
        return error_response

    with make_openmensa_client() as client:
        try:
            meals = client.list_meals(canteen_id, normalized_date)
        except OpenMensaAPIError as e:
            # OpenMensa uses 404 to mean "no plan published yet"
            if e.status_code == 404:
                return MenuResponseDTO(
                    canteen_id=canteen_id,
                    date=normalized_date,
                    status=MenuStatusDTO.no_menu_published,
                    meals=[],
                )

            return MenuResponseDTO(
                canteen_id=canteen_id,
                date=normalized_date,
                status=MenuStatusDTO.api_error,
                meals=[],
            )

    return MenuResponseDTO(
        canteen_id=canteen_id,
        date=normalized_date,
        status=MenuStatusDTO.ok,
        meals=[_meal_to_dto(m) for m in meals],
    )
