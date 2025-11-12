"""
Mensabot MCP Server — schemas
Author: Tobias Veselsky
Description: Pydantic schemas for Mensabot MCP Server tools.
"""
from __future__ import annotations

from pydantic import BaseModel, Field, ConfigDict
from enum import StrEnum
from openmensa_sdk import Canteen, Meal

# ------------------------------ mapping helpers SDK dataclasses -> DTOs ------------------------------

def _canteen_to_dto(canteen: Canteen) -> CanteenDTO:
    d = canteen.to_dict()
    coord = None
    lat, lng = d.get("latitude"), d.get("longitude")
    if lat is not None and lng is not None:
        coord = CoordinateDTO(latitude=lat, longitude=lng)
    return CanteenDTO(
        id=d["id"],
        name=d["name"],
        city=d.get("city"),
        address=d.get("address"),
        coordinates=coord,
    )

def _meal_to_dto(meal: Meal) -> MealDTO:
    d = meal.to_dict()
    return MealDTO(
        id=d["id"],
        name=d["name"],
        category=d.get("category"),
        notes=d.get("notes") or [],
        prices=PriceInfoDTO.model_validate(d["prices"]),
    )

# ------------------------------ Pydantic DTOs for MCP tools ------------------------------

class DTO(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CoordinateDTO(DTO):
    latitude: float = Field(ge=-90, le=90, description="Latitude in decimal degrees (WGS84).")
    longitude: float = Field(ge=-180, le=180, description="Longitude in decimal degrees (WGS84).")


class PriceInfoDTO(DTO):
    students: float | None = Field(
        default=None,
        ge=0,
        description="Price for students. null if no price available for students.",
    )
    employees: float | None = Field(
        default=None,
        ge=0,
        description="Price for employees. null if no price available for employees.",
    )
    pupils: float | None = Field(
        default=None,
        ge=0,
        description="Price for pupils. null if no price available for pupils.",
    )
    others: float | None = Field(
        default=None,
        ge=0,
        description="Price for others. null if no price available for others.",
    )
    raw: dict[str, float] = Field(
        default_factory=dict,
        description="Raw price information as provided by the API.",
    )


class MealDTO(DTO):
    id: int = Field(description="Unique identifier of the meal.")
    name: str = Field(description="Name of the meal.")
    category: str | None = Field(default=None, description="Category of the meal.")
    notes: list[str] = Field(default_factory=list, description="List of notes associated with the meal.")
    prices: PriceInfoDTO


class CanteenDTO(DTO):
    id: int = Field(description="Unique identifier of the canteen.")
    name: str = Field(description="Name of the canteen.")
    city: str | None = Field(default=None, description="City where the canteen is located.")
    address: str | None = Field(default=None, description="Address of the canteen.")
    coordinates: CoordinateDTO | None = None


class PageInfoDTO(DTO):
    current_page: int = Field(ge=1, description="Current page number (1-based).")
    per_page: int = Field(ge=1, description="Number of items per page.")
    next_page: int | None = Field(default=None, ge=1, description="Next page number, if available.")
    has_next: bool = Field(description="Indicates if there is a next page.")


class CanteenListResponseDTO(DTO):
    canteens: list[CanteenDTO] = Field(description="List of canteens.")
    page_info: PageInfoDTO

class MenuStatusDTO(StrEnum):
    ok = "ok"
    no_menu_published = "no_menu_published"
    invalid_date = "invalid_date"
    api_error = "api_error"

class MenuResponseDTO(DTO):
    canteen_id: int = Field(ge=1, description="Unique identifier of the canteen.")
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date (YYYY-MM-DD).")
    status: MenuStatusDTO
    meals: list[MealDTO] = Field(default_factory=list, description="List of meals for the given date.")
