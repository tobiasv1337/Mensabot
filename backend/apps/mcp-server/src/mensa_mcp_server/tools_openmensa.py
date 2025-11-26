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
from .schemas import CanteenDTO, PageInfoDTO, CanteenListResponseDTO, MenuResponseDTO, MenuStatusDTO, _canteen_to_dto, _meal_to_dto

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

    if date is None:
        # Use today's date if none is provided
        date = dt.date.today().isoformat()
    else:
        try:
            dt.date.fromisoformat(date)
        except ValueError:
            return MenuResponseDTO(
                canteen_id=canteen_id,
                date=date,  #invalid input
                status=MenuStatusDTO.invalid_date,
                meals=[],
            )

    with make_openmensa_client() as client:
        try:
            meals = client.list_meals(canteen_id, date)
        except OpenMensaAPIError as e:
            # OpenMensa uses 404 to mean "no plan published yet"
            if e.status_code == 404:
                return MenuResponseDTO(
                    canteen_id=canteen_id,
                    date=date,
                    status=MenuStatusDTO.no_menu_published,
                    meals=[],
                )

            return MenuResponseDTO(
                canteen_id=canteen_id,
                date=date,
                status=MenuStatusDTO.api_error,
                meals=[],
            )

    return MenuResponseDTO(
        canteen_id=canteen_id,
        date=date,
        status=MenuStatusDTO.ok,
        meals=[_meal_to_dto(m) for m in meals],
    )
