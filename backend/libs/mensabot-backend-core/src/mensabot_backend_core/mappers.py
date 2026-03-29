from __future__ import annotations

from openmensa_sdk import Canteen, Meal

from .dto import CanteenDTO, MealDTO, PriceCategory, PriceInfoDTO
from .meal_enrichment import _extract_allergens, _infer_diet_type


def _canteen_to_dto(canteen: Canteen) -> CanteenDTO:
    data = canteen.to_dict()
    return CanteenDTO(id=data["id"], name=data["name"], city=data.get("city"), address=data.get("address"), lat=data.get("latitude"), lng=data.get("longitude"))


def _meal_to_dto(meal: Meal, price_category: PriceCategory | None = None) -> MealDTO:
    data = meal.to_dict()
    raw_notes: list[str] = data.get("notes") or []
    prices = PriceInfoDTO.model_validate(data["prices"])
    if price_category is not None:
        prices = _filter_prices(prices, price_category)
    return MealDTO(
        id=data["id"],
        name=data["name"],
        category=data.get("category"),
        prices=prices,
        diet_type=_infer_diet_type(data.get("name") or "", raw_notes),
        allergens=_extract_allergens(raw_notes),
        raw_notes=raw_notes,
    )


def _filter_prices(prices: PriceInfoDTO, category: PriceCategory) -> PriceInfoDTO:
    return PriceInfoDTO(
        students=prices.students if category == PriceCategory.students else None,
        employees=prices.employees if category == PriceCategory.employees else None,
        pupils=prices.pupils if category == PriceCategory.pupils else None,
        others=prices.others if category == PriceCategory.others else None,
    )
