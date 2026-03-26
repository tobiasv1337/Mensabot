from __future__ import annotations

import datetime as dt
from zoneinfo import ZoneInfo
from typing import Optional

from openmensa_sdk import OpenMensaAPIError, OpenMensaClient

from ..cache import shared_cache
from ..cache_keys import openmensa_menu_key
from ..schemas import (
    DietType,
    MealDTO,
    MenuDietFilter,
    MenuResponseDTO,
    MenuStatusDTO,
    PriceCategory,
    _canonicalize_allergen_label,
    _meal_to_dto,
)
from ..settings import settings


def _local_today() -> dt.date:
    return dt.datetime.now(ZoneInfo(settings.timezone)).date()


def normalize_menu_date(
    canteen_id: int,
    date: Optional[str],
) -> tuple[str | None, MenuResponseDTO | None]:
    """
    Normalize/validate a menu date.

    Returns (normalized_date, error_response):
    - If the date is None, normalized_date is today's ISO date and error_response is None.
    - If the date is invalid, normalized_date is None and error_response is a MenuResponseDTO
      with status=invalid_date.
    - If the date is valid, normalized_date is the same string and error_response is None.
    """
    if date is None:
        return _local_today().isoformat(), None

    try:
        dt.date.fromisoformat(date)
    except ValueError:
        # keep the original invalid input in the response
        return None, MenuResponseDTO(
            canteen_id=canteen_id,
            date=date,
            status=MenuStatusDTO.invalid_date,
            meals=[],
            total_meals=0,
            returned_meals=0,
        )

    return date, None


def _filter_meals(
    meals: list[MealDTO],
    diet_filter: MenuDietFilter,
    exclude_allergens: list[str],
) -> list[MealDTO]:
    """Apply diet and allergen filters to meal DTOs."""

    excluded: set[str] = set()
    for label in exclude_allergens:
        canon = _canonicalize_allergen_label(label)
        if canon:
            excluded.add(canon)

    filtered: list[MealDTO] = []
    for meal in meals:
        if diet_filter == MenuDietFilter.vegan and meal.diet_type != DietType.vegan:
            continue
        if diet_filter == MenuDietFilter.vegetarian and meal.diet_type not in {DietType.vegan, DietType.vegetarian}:
            continue
        if diet_filter == MenuDietFilter.meat_only and meal.diet_type != DietType.meat:
            continue

        if excluded and set(meal.allergens) & excluded:
            continue

        filtered.append(meal)

    return filtered


def fetch_single_menu(
    client: OpenMensaClient,
    canteen_id: int,
    normalized_date: str,
    diet_filter: MenuDietFilter,
    exclude_allergens: list[str],
    price_category: PriceCategory | None = None,
) -> MenuResponseDTO:
    """Fetch a single menu and map OpenMensa errors to MenuResponseDTO statuses."""

    cache_key = openmensa_menu_key(
        canteen_id=canteen_id,
        date=normalized_date,
        diet_filter=diet_filter,
        price_category=price_category,
        exclude_allergens=exclude_allergens,
    )
    cached = shared_cache.get(cache_key)
    if cached is not None:
        return MenuResponseDTO.model_validate(cached)

    try:
        meals = client.list_meals(canteen_id, normalized_date)


    except OpenMensaAPIError as e:
        # OpenMensa uses 404 to indicate "no plan published yet"
        if e.status_code == 404:
            response = MenuResponseDTO(
                canteen_id=canteen_id,
                date=normalized_date,
                status=MenuStatusDTO.no_menu_published,
                meals=[],
                total_meals=0,
                returned_meals=0,
            )
            shared_cache.set(cache_key, response.model_dump(exclude_none=True), ttl_s=settings.openmensa_menu_cache_ttl_s)
            return response

        response = MenuResponseDTO(
            canteen_id=canteen_id,
            date=normalized_date,
            status=MenuStatusDTO.api_error,
            meals=[],
            total_meals=0,
            returned_meals=0,
        )
        shared_cache.set(cache_key, response.model_dump(exclude_none=True), ttl_s=settings.openmensa_menu_error_cache_ttl_s)
        return response

    if not meals:
        response = MenuResponseDTO(
            canteen_id=canteen_id,
            date=normalized_date,
            status=MenuStatusDTO.empty_menu,
            meals=[],
            total_meals=0,
            returned_meals=0,
        )
        shared_cache.set(cache_key, response.model_dump(exclude_none=True), ttl_s=settings.openmensa_menu_cache_ttl_s)
        return response

    total_meals = len(meals)
    filtered_meals = _filter_meals(
        [_meal_to_dto(m, price_category) for m in meals],
        diet_filter,
        exclude_allergens,
    )

    status = MenuStatusDTO.ok if filtered_meals else MenuStatusDTO.filtered_out

    response = MenuResponseDTO(
        canteen_id=canteen_id,
        date=normalized_date,
        status=status,
        meals=filtered_meals,
        total_meals=total_meals,
        returned_meals=len(filtered_meals),
    )
    shared_cache.set(cache_key, response.model_dump(exclude_none=True), ttl_s=settings.openmensa_menu_cache_ttl_s)
    return response
