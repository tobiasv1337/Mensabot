"""
Mensabot API Backend — tools.canteen
Author: Tobias Veselsky
Description: Canteen-related tool implementations.
"""

from typing import Any, Dict


def list_canteens_near(
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    page: int = 1,
) -> Dict[str, Any]:
    """
    Stub: pretend we queried OpenMensa and found some canteens near TU Berlin.
    Just for testing purposes. :)
    """
    print(f"[STUB] list_canteens_near(lat={lat}, lng={lng}, radius_km={radius_km}, page={page})")

    return {
        "page_info": {
            "page": page,
            "has_next": False,
            "next_page": None,
        },
        "query": {
            "lat": lat,
            "lng": lng,
            "radius_km": radius_km,
            "page": page,
        },
        "canteens": [
            {
                "id": 1,
                "name": "Mensa TU Hardenbergstraße",
                "distance_km": 0.4,
                "address": "Hardenbergstr. 34, 10623 Berlin",
            },
            {
                "id": 2,
                "name": "Mensa TU Marchstraße",
                "distance_km": 0.9,
                "address": "Marchstr. 6, 10587 Berlin",
            },
        ],
    }
