from .models import UserFilters
from .i18n import get_string, DEFAULT_LANGUAGE

# Maps frontend diet preference values to the API's MenuDietFilter values
DIET_PREFERENCE_TO_FILTER = {
    "vegetarian": "vegetarian",
    "vegan": "vegan",
    "meat": "meat_only",
}


LOCATION_TOOL_NAME = "request_user_location"
DIRECTIONS_TOOL_NAME = "request_canteen_directions"


def build_user_filters_prompt(filters: UserFilters | None, lang: str = DEFAULT_LANGUAGE) -> str | None:
    """Build a system prompt section describing the user's active filters, or None if no filters are set."""
    if filters is None:
        return None

    parts: list[str] = []

    if filters.diet:
        diet_filter_value = DIET_PREFERENCE_TO_FILTER.get(filters.diet, filters.diet)
        parts.append(get_string("filter_diet", lang, diet=filters.diet, diet_filter_value=diet_filter_value))

    if filters.price_category:
        parts.append(get_string("filter_price_category", lang, price_category=filters.price_category))

    if filters.allergens:
        allergen_list = ", ".join(filters.allergens)
        parts.append(get_string("filter_allergens", lang, allergen_list=allergen_list, allergens=filters.allergens))

    if filters.canteens:
        canteen_lines = ", ".join(f"{c.name} (ID: {c.id})" for c in filters.canteens)
        parts.append(get_string("filter_canteens", lang, canteen_lines=canteen_lines))

    if not parts:
        return None

    return get_string("user_filters_header", lang) + "\n" + "\n".join(parts)
