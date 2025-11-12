"""
Mensabot MCP Server — tools_openmensa
Author: Tobias Veselsky
Description: Provides OpenMensa-related tools for the MCP server.
"""

import datetime as dt
from typing import Any, Dict

from .server import mcp, make_openmensa_client
from openmensa_sdk import OpenMensaAPIError

@mcp.tool()
def list_canteens_near(lat: float, lng: float, radius_km: float, limit: int = 20) -> Dict[str, Any]:
    """
    list_canteens_near(lat, lng, radius_km, limit=20) -> {canteens: [...], next_page: ...}
    Return OpenMensa canteens near a given coordinate.

    Parameters:
        lat (float):
            Latitude in decimal degrees (WGS84).
        lng (float):
            Longitude in decimal degrees (WGS84).
        radius_km (float):
            Search radius in kilometers (e.g. 2.0).
        limit (int, default=20):
            Max canteens per page (OpenMensa per_page).
    """
    with make_openmensa_client() as client:
        canteens, next_page = client.list_canteens(
            near_lat=lat,
            near_lng=lng,
            near_dist=radius_km,
            per_page=limit,
        )

    return {
        "canteens": [c.to_dict() for c in canteens],
        "next_page": next_page,
    }


@mcp.tool()
def get_canteen_info(canteen_id: int) -> Dict[str, Any]:
    """
    get_canteen_info(canteen_id) -> {canteen: {...}}
    Get metadata for a single canteen by its OpenMensa ID.

    Parameters:
        canteen_id (int):
            OpenMensa canteen ID (e.g. 2019 for TU Hardenbergstraße Berlin).
    """
    with make_openmensa_client() as client:
        canteen = client.get_canteen(canteen_id)

    return {
        "canteen": canteen.to_dict()
    }


@mcp.tool()
def get_menu_for_date(canteen_id: int, date: str) -> Dict[str, Any]:
    """
    get_menu_for_date(canteen_id, date) -> {status, meals, ...}
    Get all meals for a given canteen on a given date.

    Parameters:
        canteen_id (int):
            OpenMensa canteen ID, e.g. 2019.
        date (str, format "YYYY-MM-DD"):
            Target date. Usually today.
    """

    # basic sanity check for the date string
    try:
        dt.date.fromisoformat(date)
    except ValueError:
        return {
            "canteen_id": canteen_id,
            "date": date,
            "status": "invalid_date",
            "meals": [],
        }

    with make_openmensa_client() as client:
        try:
            meals = client.list_meals(canteen_id, date)
        except OpenMensaAPIError as e:
            # OpenMensa uses 404 to mean "no plan published yet"
            if e.status_code == 404:
                return {
                    "canteen_id": canteen_id,
                    "date": date,
                    "status": "no_menu_published",
                    "meals": [],
                }

            return {
                "canteen_id": canteen_id,
                "date": date,
                "status": "api_error",
                "http_status": e.status_code,
                "message": e.message,
            }

    return {
        "canteen_id": canteen_id,
        "date": date,
        "status": "ok",
        "meals": [m.to_dict() for m in meals],
    }
