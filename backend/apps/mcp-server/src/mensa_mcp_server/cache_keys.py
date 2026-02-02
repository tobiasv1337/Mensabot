from __future__ import annotations

import hashlib
from typing import Iterable


def mcp_tools_key() -> str:
    return "mcp:tools:openai"


def openmensa_canteen_key(canteen_id: int) -> str:
    return f"openmensa:canteen:{canteen_id}"


def openmensa_menu_key(
    *,
    canteen_id: int,
    date: str,
    diet_filter: object | None,
    price_category: object | None,
    exclude_allergens: Iterable[str] | None,
) -> str:
    diet_value = getattr(diet_filter, "value", None) if diet_filter is not None else None
    diet_key = diet_value if diet_value is not None else "all"
    price_value = getattr(price_category, "value", None) if price_category is not None else None
    price_key = price_value if price_value is not None else ""
    allergens = list(exclude_allergens or [])
    allergens_key = ",".join(sorted(allergens)) if allergens else ""
    return f"openmensa:menu:{canteen_id}:{date}:{diet_key}:{price_key}:{allergens_key}"


def osm_opening_hours_key(*, canteen_id: int) -> str:
    return f"osm:opening_hours:{canteen_id}"


def overpass_query_key(query: str) -> str:
    digest = hashlib.sha256(query.encode("utf-8")).hexdigest()
    return f"overpass:{digest}"
