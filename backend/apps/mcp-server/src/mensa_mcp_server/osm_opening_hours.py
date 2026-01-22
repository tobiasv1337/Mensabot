"""
Mensabot MCP Server — osm_opening_hours
Author: Tobias Veselsky
Description: Deterministic resolver for canteen opening hours from OpenStreetMap (OSM) via Overpass.

Design goals:
- Deterministic backend logic to keep it simple for the LLM.
- Return either a confident match OR a ranked candidate list if ambiguous.
- Always include attribution metadata so the calling assistant can comply with OSM/ODbL.

This module contains the OSM/Overpass logic only. MCP tool functions live in tools_openmensa.py.
"""

from __future__ import annotations

import math
import re
import time
from collections import OrderedDict
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple

import requests

from .server import settings


# ------------------------------ constants ------------------------------

DEFAULT_ATTRIBUTION = "© OpenStreetMap contributors"
DEFAULT_ATTRIBUTION_URL = "https://www.openstreetmap.org/copyright"
DEFAULT_LICENSE = "ODbL 1.0"


# ------------------------------ small TTL cache ------------------------------

class _TTLCache:
    """Minimal TTL cache for Overpass responses (in-memory)."""

    def __init__(self, ttl_s: int, max_items: int = 2048) -> None:
        self.ttl_s = ttl_s
        self.max_items = max_items
        self._store: OrderedDict[str, Tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> Any | None:
        item = self._store.get(key)
        if item is None:
            return None
        ts, val = item
        if time.time() - ts > self.ttl_s:
            self._store.pop(key, None)
            return None
        return val

    def set(self, key: str, val: Any) -> None:
        if len(self._store) >= self.max_items:
            # FIFO eviction: remove oldest item
            self._store.popitem(last=False)
        self._store[key] = (time.time(), val)


# ------------------------------ geometry + string helpers ------------------------------

def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance between two WGS84 points in meters."""
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _norm(s: str) -> str:
    s = (s or "").lower().strip()
    s = re.sub(r"[\(\)\[\]\-_,./]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s


def _name_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, _norm(a), _norm(b)).ratio()


def _element_center(el: Dict[str, Any]) -> Optional[Tuple[float, float]]:
    # node
    if "lat" in el and "lon" in el:
        return float(el["lat"]), float(el["lon"])
    # way/relation center
    center = el.get("center")
    if isinstance(center, dict) and "lat" in center and "lon" in center:
        return float(center["lat"]), float(center["lon"])
    return None


# ------------------------------ OSM domain ------------------------------

@dataclass(frozen=True)
class OSMRef:
    osm_type: str  # "node" | "way" | "relation"
    osm_id: int

    def url(self) -> str:
        return f"https://www.openstreetmap.org/{self.osm_type}/{self.osm_id}"


@dataclass
class _OSMCandidate:
    ref: OSMRef
    name: str
    lat: float
    lon: float
    distance_m: float
    tags: Dict[str, Any]
    score: float


# ------------------------------ Overpass queries ------------------------------

def _overpass_query_near(lat: float, lon: float, radius_m: int) -> str:
    """Query canteen-like POIs around a coordinate."""
    return f"""
[out:json][timeout:25];
(
  nwr(around:{radius_m},{lat},{lon})["amenity"="canteen"];
  nwr(around:{radius_m},{lat},{lon})["amenity"="cafe"];
  nwr(around:{radius_m},{lat},{lon})["amenity"="food_court"];
  nwr(around:{radius_m},{lat},{lon})["amenity"="fast_food"];
  nwr(around:{radius_m},{lat},{lon})["amenity"="restaurant"]["cuisine"~"cafeteria|canteen",i];
  nwr(around:{radius_m},{lat},{lon})["name"~"\\bMensa\\b|Cafeteria|Canteen",i];
);
out center tags;
"""


def _overpass_query_element(ref: OSMRef) -> str:
    return f"""
[out:json][timeout:25];
{ref.osm_type}(id:{ref.osm_id});
out center tags;
"""


def _type_score(tags: Dict[str, Any]) -> float:
    """Prefer canteen-ish objects over generic restaurants."""
    amenity = tags.get("amenity", "")
    fast_food = tags.get("fast_food", "")
    cuisine = (tags.get("cuisine", "") or "").lower()

    if amenity == "canteen":
        return 55.0
    if amenity == "fast_food" and fast_food == "cafeteria":
        return 45.0
    if amenity == "cafe":
        return 40.0
    if amenity == "food_court":
        return 35.0
    if amenity in ("restaurant", "fast_food") and ("cafeteria" in cuisine or "canteen" in cuisine):
        return 30.0
    if amenity == "fast_food":
        return 15.0
    return 10.0


def _dist_score(distance_m: float) -> float:
    # 0m => 40, 80m => 20, 160m => 0
    return max(0.0, 40.0 - (distance_m / 4.0))


def _score_candidate(
    name_hint: str | None,
    origin_lat: float,
    origin_lon: float,
    el: Dict[str, Any],
) -> Optional[_OSMCandidate]:
    center = _element_center(el)
    if not center:
        return None
    lat, lon = center

    tags: Dict[str, Any] = el.get("tags", {}) or {}
    name = tags.get("name", "") or ""
    dist = _haversine_m(origin_lat, origin_lon, lat, lon)

    score = 0.0
    score += _type_score(tags)
    score += _dist_score(dist)
    score += 25.0 * _name_similarity(name_hint or "", name)
    score += 12.0 if "opening_hours" in tags else 0.0

    ref = OSMRef(osm_type=str(el["type"]), osm_id=int(el["id"]))
    return _OSMCandidate(
        ref=ref,
        name=name,
        lat=float(lat),
        lon=float(lon),
        distance_m=float(dist),
        tags=tags,
        score=float(score),
    )


# ------------------------------ resolver ------------------------------

class OSMOpeningHoursResolver:
    """Resolves opening hours from OSM deterministically using Overpass."""

    def __init__(
        self,
        overpass_url: str,
        user_agent: str,
        timeout_s: float,
        cache_ttl_s: int,
    ) -> None:
        self.overpass_url = overpass_url
        self.user_agent = user_agent
        self.timeout_s = timeout_s
        self.cache = _TTLCache(ttl_s=cache_ttl_s)

    def _post_overpass(self, query: str) -> Dict[str, Any]:
        cache_key = f"overpass:{hash(query)}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        resp = requests.post(
            self.overpass_url,
            data=query.encode("utf-8"),
            headers={"User-Agent": self.user_agent},
            timeout=self.timeout_s,
        )
        resp.raise_for_status()
        data = resp.json()
        self.cache.set(cache_key, data)
        return data

    def fetch_element(self, ref: OSMRef) -> Dict[str, Any] | None:
        data = self._post_overpass(_overpass_query_element(ref))
        elements = data.get("elements") or []
        return elements[0] if elements else None

    def resolve(
        self,
        lat: float,
        lon: float,
        name_hint: str | None,
        radius_m: int,
        max_radius_m: int,
        max_candidates: int,
        accept_score: float = 70.0,
        accept_margin: float = 12.0,
    ) -> Dict[str, Any]:
        """Resolve best match near (lat, lon)."""

        # Validate input coordinates
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            return {
                "status": "error",
                "opening_hours": None,
                "kitchen_hours": None,
                "source": None,
                "confidence": 0.0,
                "candidates": [],
                "note": f"Invalid coordinates: lat={lat}, lon={lon}",
                "attribution": {
                    "attribution": DEFAULT_ATTRIBUTION,
                    "attribution_url": DEFAULT_ATTRIBUTION_URL,
                    "license": DEFAULT_LICENSE,
                },
            }

        try:
            candidates: List[_OSMCandidate] = []
            for r in (radius_m, max_radius_m):
                data = self._post_overpass(_overpass_query_near(lat, lon, r))
                els = data.get("elements") or []

                tmp: List[_OSMCandidate] = []
                for el in els:
                    c = _score_candidate(name_hint, lat, lon, el)
                    if c is not None:
                        tmp.append(c)

                tmp.sort(key=lambda c: c.score, reverse=True)
                candidates = tmp
                if candidates:
                    break

            if not candidates:
                return {
                    "status": "not_found",
                    "opening_hours": None,
                    "kitchen_hours": None,
                    "source": None,
                    "confidence": 0.0,
                    "candidates": [],
                    "note": "No canteen-like OSM objects found near this coordinate.",
                    "attribution": {
                        "attribution": DEFAULT_ATTRIBUTION,
                        "attribution_url": DEFAULT_ATTRIBUTION_URL,
                        "license": DEFAULT_LICENSE,
                    },
                }

            best = candidates[0]
            second = candidates[1] if len(candidates) > 1 else None
            accepted = best.score >= accept_score and (second is None or (best.score - second.score) >= accept_margin)

            def tag_subset(tags: Dict[str, Any]) -> Dict[str, Any]:
                # Keep tags minimal to avoid large outputs.
                return {
                    "amenity": tags.get("amenity"),
                    "fast_food": tags.get("fast_food"),
                    "cuisine": tags.get("cuisine"),
                    "operator": tags.get("operator"),
                    "website": tags.get("website"),
                }

            def candidate_payload(c: _OSMCandidate) -> Dict[str, Any]:
                tags = c.tags or {}
                return {
                    "osm_type": c.ref.osm_type,
                    "osm_id": c.ref.osm_id,
                    "url": c.ref.url(),
                    "name": c.name or tags.get("name"),
                    "distance_m": round(c.distance_m, 1),
                    "score": round(c.score, 2),
                    "opening_hours": tags.get("opening_hours"),
                    "kitchen_hours": tags.get("opening_hours:kitchen"),
                    "tags": tag_subset(tags),
                }

            top_candidates = [candidate_payload(c) for c in candidates[:max_candidates]]

            if not accepted:
                return {
                    "status": "ambiguous",
                    "opening_hours": None,
                    "kitchen_hours": None,
                    "source": None,
                    "confidence": 0.3,
                    "candidates": top_candidates,
                    "note": "Multiple plausible OSM objects found.",
                    "attribution": {
                        "attribution": DEFAULT_ATTRIBUTION,
                        "attribution_url": DEFAULT_ATTRIBUTION_URL,
                        "license": DEFAULT_LICENSE,
                    },
                }

            tags = best.tags or {}
            opening_hours = tags.get("opening_hours")
            kitchen_hours = tags.get("opening_hours:kitchen")
            confidence = min(0.95, max(0.4, best.score / 100.0))

            return {
                "status": "ok",
                "opening_hours": opening_hours,
                "kitchen_hours": kitchen_hours,
                "source": {
                    "type": "osm",
                    "osm_type": best.ref.osm_type,
                    "osm_id": best.ref.osm_id,
                    "url": best.ref.url(),
                    "name": best.name or tags.get("name"),
                    "distance_m": round(best.distance_m, 1),
                },
                "confidence": round(confidence, 3),
                "candidates": top_candidates,
                "note": None if opening_hours else "Matched an OSM object, but it does not have opening_hours set.",
                "attribution": {
                    "attribution": DEFAULT_ATTRIBUTION,
                    "attribution_url": DEFAULT_ATTRIBUTION_URL,
                    "license": DEFAULT_LICENSE,
                },
            }

        except requests.RequestException as e:
            return {
                "status": "error",
                "opening_hours": None,
                "kitchen_hours": None,
                "source": None,
                "confidence": 0.0,
                "candidates": [],
                "note": f"Overpass request failed: {type(e).__name__}",
                "attribution": {
                    "attribution": DEFAULT_ATTRIBUTION,
                    "attribution_url": DEFAULT_ATTRIBUTION_URL,
                    "license": DEFAULT_LICENSE,
                },
            }


_default_resolver = OSMOpeningHoursResolver(
    overpass_url=settings.overpass_url,
    user_agent=settings.overpass_user_agent,
    timeout_s=settings.overpass_timeout,
    cache_ttl_s=settings.overpass_cache_ttl_s,
)


def resolve_opening_hours_osm(
    lat: float,
    lon: float,
    name_hint: str | None = None,
    radius_m: int = 80,
    max_radius_m: int = 200,
    max_candidates: int = 10,
    accept_score: float = 70.0,
    accept_margin: float = 12.0,
) -> Dict[str, Any]:
    return _default_resolver.resolve(
        lat=lat,
        lon=lon,
        name_hint=name_hint,
        radius_m=radius_m,
        max_radius_m=max_radius_m,
        max_candidates=max_candidates,
        accept_score=accept_score,
        accept_margin=accept_margin,
    )


def fetch_osm_element(ref: OSMRef) -> Dict[str, Any] | None:
    return _default_resolver.fetch_element(ref)
