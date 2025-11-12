"""
Mensabot MCP Server — schemas
Author: Tobias Veselsky
Description: Pydantic schemas for Mensabot MCP Server tools.
"""
from __future__ import annotations

from typing import Annotated, Optional
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
    latitude: Annotated[float, Field(ge=-90, le=90, description="Latitude in decimal degrees (WGS84)")]
    longitude: Annotated[float, Field(ge=-180, le=180, description="Longitude in decimal degrees (WGS84)")]

class PriceInfoDTO(DTO):
    students: Optional[Annotated[float, Field(ge=0, description="Price for students. null if no price available for students.")]] = None
    employees: Optional[Annotated[float, Field(ge=0, description="Price for employees. null if no price available for employees.")]] = None
    pupils: Optional[Annotated[float, Field(ge=0, description="Price for pupils. null if no price available for pupils.")]] = None
    others: Optional[Annotated[float, Field(ge=0, description="Price for others. null if no price available for others.")]] = None
    raw: Annotated[dict[str, float], Field(default_factory=dict, description="Raw price information as provided by the API")]

class MealDTO(DTO):
    id: Annotated[int, Field(description="Unique identifier of the meal")]
    name: Annotated[str, Field(description="Name of the meal")]
    category: Optional[Annotated[str, Field(description="Category of the meal")]] = None
    notes: Annotated[list[str], Field(default_factory=list, description="List of notes associated with the meal.")]
    prices: PriceInfoDTO

class CanteenDTO(DTO):
    id: Annotated[int, Field(description="Unique identifier of the canteen")]
    name: Annotated[str, Field(description="Name of the canteen")]
    city: Optional[Annotated[str, Field(description="City where the canteen is located")]] = None
    address: Optional[Annotated[str, Field(description="Address of the canteen")]] = None
    coordinates: Optional[CoordinateDTO] = None

class PageInfoDTO(DTO):
    current_page: Annotated[int, Field(ge=1, description="Current page number (1-based)")]
    per_page: Annotated[int, Field(ge=1, description="Number of items per page")]
    next_page: Optional[Annotated[int, Field(ge=1, description="Next page number, if available")]] = None
    has_next: Annotated[bool, Field(description="Indicates if there is a next page")]

class CanteenListResponseDTO(DTO):
    canteens: Annotated[list[CanteenDTO], Field(description="List of canteens")]
    page_info: PageInfoDTO

class MenuStatusDTO(StrEnum):
    ok = "ok"
    no_menu_published = "no_menu_published"
    invalid_date = "invalid_date"
    api_error = "api_error"

class MenuResponseDTO(DTO):
    canteen_id: Annotated[int, Field(ge=1, description="Unique identifier of the canteen")]
    date: Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date (YYYY-MM-DD)")]
    status: MenuStatusDTO
    meals: Annotated[list[MealDTO], Field(default_factory=list, description="List of meals for the given date")]
