from __future__ import annotations

import hashlib
from typing import Iterable


def mcp_tools_key() -> str:
    return "mcp:tools:openai"


def openmensa_canteen_key(canteen_id: int) -> str:
    return f"openmensa:canteen:{canteen_id}"


def _cache_filter_key(value: object | None, *, default: str) -> str:
    """Normalize enum-like and string filter values for stable cache keys."""
    if value is None:
        return default

    raw = getattr(value, "value", value)
    if raw is None:
        return default

    if isinstance(raw, str):
        normalized = raw.strip()
        return normalized or default

    return str(raw)


def openmensa_menu_key(
    *,
    canteen_id: int,
    date: str,
    diet_filter: object | None,
    price_category: object | None,
    exclude_allergens: Iterable[str] | None,
) -> str:
    diet_key = _cache_filter_key(diet_filter, default="all")
    price_key = _cache_filter_key(price_category, default="all")
    allergens = list(exclude_allergens or [])
    allergens_key = ",".join(sorted(allergens)) if allergens else "none"
    return f"openmensa:menu:{canteen_id}:{date}:{diet_key}:{price_key}:{allergens_key}"


def osm_opening_hours_key(*, canteen_id: int, radius_m: int, max_radius_m: int, max_candidates: int) -> str:
    return f"osm:opening_hours:{canteen_id}:{radius_m}:{max_radius_m}:{max_candidates}"


def overpass_query_key(query: str) -> str:
    digest = hashlib.sha256(query.encode("utf-8")).hexdigest()
    return f"overpass:{digest}"
