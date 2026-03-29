from __future__ import annotations

import math
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def _norm(text: str) -> str:
    normalized = (text or "").lower().strip()
    normalized = re.sub(r"[\(\)\[\]\-_,./]", " ", normalized)
    return re.sub(r"\s+", " ", normalized)


def _name_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, _norm(a), _norm(b)).ratio()


def _element_center(element: dict[str, Any]) -> tuple[float, float] | None:
    if "lat" in element and "lon" in element:
        return float(element["lat"]), float(element["lon"])
    center = element.get("center")
    if isinstance(center, dict) and "lat" in center and "lon" in center:
        return float(center["lat"]), float(center["lon"])
    return None


@dataclass(frozen=True)
class OSMRef:
    osm_type: str
    osm_id: int

    def url(self) -> str:
        return f"https://www.openstreetmap.org/{self.osm_type}/{self.osm_id}"


@dataclass
class OSMCandidate:
    ref: OSMRef
    name: str
    lat: float
    lon: float
    distance_m: float
    tags: dict[str, Any]
    score: float


def _type_score(tags: dict[str, Any]) -> float:
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
    return max(0.0, 40.0 - (distance_m / 4.0))


def score_candidate(name_hint: str | None, origin_lat: float, origin_lon: float, element: dict[str, Any]) -> OSMCandidate | None:
    center = _element_center(element)
    if not center:
        return None
    lat, lon = center
    tags: dict[str, Any] = element.get("tags", {}) or {}
    name = tags.get("name", "") or ""
    distance_m = _haversine_m(origin_lat, origin_lon, lat, lon)
    score = 0.0
    score += _type_score(tags)
    score += _dist_score(distance_m)
    score += 25.0 * _name_similarity(name_hint or "", name)
    score += 12.0 if "opening_hours" in tags else 0.0
    return OSMCandidate(ref=OSMRef(osm_type=str(element["type"]), osm_id=int(element["id"])), name=name, lat=float(lat), lon=float(lon), distance_m=float(distance_m), tags=tags, score=float(score))
