from __future__ import annotations

import logging
from typing import Any

import httpx

from ..settings import settings
from .client import OverpassClient
from .queries import overpass_query_near
from .scoring import OSMCandidate, OSMRef, score_candidate

logger = logging.getLogger("mensabot_backend_core.osm")

DEFAULT_ATTRIBUTION = "© OpenStreetMap contributors"
DEFAULT_ATTRIBUTION_URL = "https://www.openstreetmap.org/copyright"
DEFAULT_LICENSE = "ODbL 1.0"


def _attribution_payload() -> dict[str, str]:
    return {"attribution": DEFAULT_ATTRIBUTION, "attribution_url": DEFAULT_ATTRIBUTION_URL, "license": DEFAULT_LICENSE}


def _tag_subset(tags: dict[str, Any]) -> dict[str, Any]:
    return {"amenity": tags.get("amenity"), "fast_food": tags.get("fast_food"), "cuisine": tags.get("cuisine"), "operator": tags.get("operator"), "website": tags.get("website")}


def _candidate_payload(candidate: OSMCandidate) -> dict[str, Any]:
    tags = candidate.tags or {}
    return {
        "osm_type": candidate.ref.osm_type,
        "osm_id": candidate.ref.osm_id,
        "url": candidate.ref.url(),
        "name": candidate.name or tags.get("name"),
        "distance_m": round(candidate.distance_m, 1),
        "score": round(candidate.score, 2),
        "opening_hours": tags.get("opening_hours"),
        "kitchen_hours": tags.get("opening_hours:kitchen"),
        "tags": _tag_subset(tags),
    }


class OSMOpeningHoursResolver:
    def __init__(self, *, overpass_url: str, overpass_status_url: str | None, user_agent: str, timeout_s: float, status_timeout_s: float, cache_ttl_s: int, max_concurrency: int) -> None:
        self._client = OverpassClient(
            overpass_url=overpass_url,
            overpass_status_url=overpass_status_url,
            user_agent=user_agent,
            timeout_s=timeout_s,
            status_timeout_s=status_timeout_s,
            cache_ttl_s=cache_ttl_s,
            max_concurrency=max_concurrency,
        )

    async def fetch_element(self, ref: OSMRef) -> dict[str, object] | None:
        return await self._client.fetch_element(ref)

    async def resolve(self, lat: float, lon: float, name_hint: str | None, radius_m: int, max_radius_m: int, max_candidates: int, accept_score: float = 70.0, accept_margin: float = 12.0) -> dict[str, Any]:
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            return {"status": "error", "opening_hours": None, "kitchen_hours": None, "source": None, "confidence": 0.0, "candidates": [], "note": f"Invalid coordinates: lat={lat}, lon={lon}", "attribution": _attribution_payload()}
        try:
            candidates: list[OSMCandidate] = []
            for radius in (radius_m, max_radius_m):
                data = await self._client.post(overpass_query_near(lat, lon, radius))
                elements = data.get("elements") or []
                scored = [candidate for element in elements if (candidate := score_candidate(name_hint, lat, lon, element)) is not None]
                scored.sort(key=lambda candidate: candidate.score, reverse=True)
                candidates = scored
                if candidates:
                    break
            if not candidates:
                return {"status": "not_found", "opening_hours": None, "kitchen_hours": None, "source": None, "confidence": 0.0, "candidates": [], "note": "No canteen-like OSM objects found near this coordinate.", "attribution": _attribution_payload()}
            best = candidates[0]
            second = candidates[1] if len(candidates) > 1 else None
            accepted = best.score >= accept_score and (second is None or (best.score - second.score) >= accept_margin)
            top_candidates = [_candidate_payload(candidate) for candidate in candidates[:max_candidates]]
            if not accepted:
                return {"status": "ambiguous", "opening_hours": None, "kitchen_hours": None, "source": None, "confidence": 0.3, "candidates": top_candidates, "note": "Multiple plausible OSM objects found.", "attribution": _attribution_payload()}
            tags = best.tags or {}
            opening_hours = tags.get("opening_hours")
            kitchen_hours = tags.get("opening_hours:kitchen")
            confidence = min(0.95, max(0.4, best.score / 100.0))
            return {
                "status": "ok",
                "opening_hours": opening_hours,
                "kitchen_hours": kitchen_hours,
                "source": {"type": "osm", "osm_type": best.ref.osm_type, "osm_id": best.ref.osm_id, "url": best.ref.url(), "name": best.name or tags.get("name"), "distance_m": round(best.distance_m, 1)},
                "confidence": round(confidence, 3),
                "candidates": top_candidates,
                "note": None if opening_hours else "Matched an OSM object, but it does not have opening_hours set.",
                "attribution": _attribution_payload(),
            }
        except httpx.RequestError as exc:
            error_msg = f"Overpass request failed: {type(exc).__name__}"
            if isinstance(exc, httpx.TimeoutException):
                error_msg = "Overpass API did not respond in time (timeout)"
            elif isinstance(exc, httpx.ConnectError):
                error_msg = "Could not connect to Overpass API"
            logger.error(error_msg)
            return {"status": "error", "opening_hours": None, "kitchen_hours": None, "source": None, "confidence": 0.0, "candidates": [], "note": error_msg, "attribution": _attribution_payload()}
        except RuntimeError as exc:
            logger.error(f"Overpass error: {exc}")
            return {"status": "error", "opening_hours": None, "kitchen_hours": None, "source": None, "confidence": 0.0, "candidates": [], "note": str(exc), "attribution": _attribution_payload()}
        except Exception as exc:
            error_msg = f"Unexpected error: {type(exc).__name__}: {exc}"
            logger.exception(error_msg)
            return {"status": "error", "opening_hours": None, "kitchen_hours": None, "source": None, "confidence": 0.0, "candidates": [], "note": error_msg, "attribution": _attribution_payload()}


_default_resolver = OSMOpeningHoursResolver(
    overpass_url=settings.overpass_url,
    overpass_status_url=settings.overpass_status_url,
    user_agent=settings.overpass_user_agent,
    timeout_s=settings.overpass_timeout,
    status_timeout_s=settings.overpass_status_timeout,
    cache_ttl_s=settings.overpass_cache_ttl_s,
    max_concurrency=settings.overpass_max_concurrency,
)


async def resolve_opening_hours_osm(lat: float, lon: float, name_hint: str | None = None, radius_m: int = 80, max_radius_m: int = 200, max_candidates: int = 10, accept_score: float = 70.0, accept_margin: float = 12.0) -> dict[str, Any]:
    return await _default_resolver.resolve(lat=lat, lon=lon, name_hint=name_hint, radius_m=radius_m, max_radius_m=max_radius_m, max_candidates=max_candidates, accept_score=accept_score, accept_margin=accept_margin)


async def fetch_osm_element(ref: OSMRef) -> dict[str, object] | None:
    return await _default_resolver.fetch_element(ref)
