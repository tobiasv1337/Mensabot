from __future__ import annotations

import anyio
from openmensa_sdk import OpenMensaAPIError

from ..cache import shared_cache
from ..cache_keys import osm_opening_hours_key
from ..concurrency import get_io_semaphore
from ..osm_opening_hours import resolve_opening_hours_osm
from ..schemas import OSMResolveForCanteenResponseDTO, OpenMensaCanteenRefDTO, _canteen_to_dto
from ..server import make_openmensa_client


CACHE_TTL_OPENING_HOURS_S = 60 * 60 * 24


async def fetch_opening_hours_osm_for_canteen(
    *,
    canteen_id: int,
    radius_m: int = 80,
    max_radius_m: int = 1000,
    max_candidates: int = 10,
) -> OSMResolveForCanteenResponseDTO:
    """Resolve opening hours for a canteen id via OSM/Overpass.

    This is the shared implementation used by both:
    - the MCP tool `get_opening_hours_osm_for_canteen`
    - the FastAPI route `/api/canteens/{id}/opening-hours`
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
        res = await resolve_opening_hours_osm(
            lat=dto.lat,
            lon=dto.lng,
            name_hint=dto.name,
            radius_m=radius_m,
            max_radius_m=max_radius_m,
            max_candidates=max_candidates,
        )

    res["openmensa"] = OpenMensaCanteenRefDTO(
        canteen_id=canteen_id,
        name=dto.name,
        lat=dto.lat,
        lng=dto.lng,
    ).model_dump(exclude_none=True)

    out = OSMResolveForCanteenResponseDTO.model_validate(res)
    shared_cache.set(cache_key, out.model_dump(exclude_none=True), ttl_s=CACHE_TTL_OPENING_HOURS_S)
    return out
