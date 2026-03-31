from __future__ import annotations

from enum import StrEnum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class DTO(BaseModel):
    model_config = ConfigDict(extra="forbid", exclude_none=True, use_enum_values=True)


class DietType(StrEnum):
    vegan = "vegan"
    vegetarian = "vegetarian"
    meat = "meat"
    unknown = "unknown"


class MenuDietFilter(StrEnum):
    all = "all"
    meat_only = "meat_only"
    vegetarian = "vegetarian"
    vegan = "vegan"


class PriceCategory(StrEnum):
    students = "students"
    employees = "employees"
    pupils = "pupils"
    others = "others"


class WeekdayName(StrEnum):
    monday = "Monday"
    tuesday = "Tuesday"
    wednesday = "Wednesday"
    thursday = "Thursday"
    friday = "Friday"
    saturday = "Saturday"
    sunday = "Sunday"


class PriceInfoDTO(DTO):
    model_config = ConfigDict(extra="ignore", exclude_none=True)

    students: float | None = Field(default=None, ge=0, description="Price for students. null if no price available for students.")
    employees: float | None = Field(default=None, ge=0, description="Price for employees. null if no price available for employees.")
    pupils: float | None = Field(default=None, ge=0, description="Price for pupils. null if no price available for pupils.")
    others: float | None = Field(default=None, ge=0, description="Price for others. null if no price available for others.")


class MealDTO(DTO):
    id: int = Field(description="Unique identifier of the meal.")
    name: str = Field(description="Name of the meal.")
    category: str | None = Field(default=None, description="Category of the meal.")
    prices: PriceInfoDTO
    diet_type: DietType = Field(description="Normalized diet type inferred from notes and title (unknown if no signal).")
    allergens: list[str] = Field(default_factory=list, description="Canonical allergens detected from notes.")
    raw_notes: list[str] = Field(default_factory=list, description="Raw notes from OpenMensa.")


class MealPublicDTO(DTO):
    name: str = Field(description="Name of the meal.")
    category: str | None = Field(default=None, description="Category of the meal.")
    prices: PriceInfoDTO
    diet_type: DietType = Field(description="Normalized diet type inferred from notes and title (unknown if no signal).")
    allergens: list[str] = Field(default_factory=list, description="Canonical allergens detected from notes.")


class CanteenDTO(DTO):
    id: int = Field(description="Unique identifier of the canteen.")
    name: str = Field(description="Name of the canteen.")
    city: str | None = Field(default=None, description="City where the canteen is located.")
    address: str | None = Field(default=None, description="Address of the canteen.")
    lat: float | None = Field(default=None, ge=-90, le=90, description="Latitude in decimal degrees (WGS84).")
    lng: float | None = Field(default=None, ge=-180, le=180, description="Longitude in decimal degrees (WGS84).")


class PageInfoDTO(DTO):
    current_page: int = Field(ge=1, description="Current page number (1-based).")
    per_page: int = Field(ge=1, description="Number of items per page.")
    next_page: int | None = Field(default=None, ge=1, description="Next page number, if available.")
    has_next: bool = Field(description="Indicates if there is a next page.")


class CanteenListResponseDTO(DTO):
    canteens: list[CanteenDTO] = Field(description="List of canteens.")
    page_info: PageInfoDTO


class CanteenIndexInfoDTO(DTO):
    updated_at: str = Field(description="ISO timestamp when the canteen index was last updated.")
    total_canteens: int = Field(ge=0, description="Total number of canteens in the index.")


class CanteenSearchResultDTO(DTO):
    canteen: CanteenDTO
    score: float = Field(ge=0.0, le=100.0, description="Text relevance score (higher is better). 0 if no query.")
    distance_km: float | None = Field(default=None, ge=0.0, description="Distance from query center, if computed.")


class CanteenSearchResponseDTO(DTO):
    results: list[CanteenSearchResultDTO]
    total_results: int = Field(ge=0, description="Total results before applying limit.")
    index: CanteenIndexInfoDTO


class MenuStatusDTO(StrEnum):
    ok = "ok"
    no_menu_published = "no_menu_published"
    empty_menu = "empty_menu"
    filtered_out = "filtered_out"
    invalid_date = "invalid_date"
    api_error = "api_error"


class MenuResponseDTO(DTO):
    canteen_id: int = Field(ge=1, description="Unique identifier of the canteen.")
    date: str = Field(description="Date (YYYY-MM-DD). For status 'ok' / 'no_menu_published' / 'empty_menu' / 'api_error' this is a valid ISO date. For 'invalid_date' it contains the original invalid input.")
    status: MenuStatusDTO
    meals: list[MealDTO] = Field(default_factory=list, description="List of meals for the given date.")
    total_meals: int = Field(ge=0, description="Number of meals the source menu contained before filtering.")
    returned_meals: int = Field(ge=0, description="Number of meals returned after applying diet/allergen filters.")


class MenuResponsePublicDTO(DTO):
    canteen_id: int = Field(ge=1, description="Unique identifier of the canteen.")
    date: str = Field(description="Date (YYYY-MM-DD). For status 'ok' / 'no_menu_published' / 'empty_menu' / 'api_error' this is a valid ISO date. For 'invalid_date' it contains the original invalid input.")
    status: MenuStatusDTO
    meals: list[MealPublicDTO] = Field(default_factory=list, description="List of meals for the given date.")
    total_meals: int = Field(ge=0, description="Number of meals the source menu contained before filtering.")
    returned_meals: int = Field(ge=0, description="Number of meals returned after applying diet/allergen filters.")


class MenuBatchRequestDTO(DTO):
    canteen_id: int = Field(ge=1, description="OpenMensa canteen ID.")
    date: str | None = Field(default=None, description="Target date in YYYY-MM-DD format. If omitted or null, uses today's date.")
    diet_filter: Optional[MenuDietFilter] = Field(default=None, description="Filter meals by diet type (all, meat_only, vegetarian, vegan). Null or 'all' = no filter.")
    exclude_allergens: Optional[list[str]] = Field(default=None, description="Exclude meals containing any of these allergens (e.g. 'sesame', 'soja', 'peanut'). Null = no filter.")
    price_category: PriceCategory | None = Field(default=None, description="Filter to one price category (students/employees/pupils/others) if known. Reduces output size. Null = no filter.")


class MenuBatchResponseDTO(DTO):
    results: list[MenuResponseDTO] = Field(description="One entry per requested (canteen_id, date) pair. The order matches the input list.")


class MenuBatchResponsePublicDTO(DTO):
    results: list[MenuResponsePublicDTO] = Field(description="One entry per requested (canteen_id, date) pair. The order matches the input list.")


class DateEntryDTO(DTO):
    date: str = Field(description="ISO date (YYYY-MM-DD).")
    weekday: WeekdayName = Field(description="Weekday name.")
    is_weekend: bool = Field(description="True if Saturday or Sunday.")


class WeekRangeDTO(DTO):
    start_date: str = Field(description="Week start date (Monday, YYYY-MM-DD).")
    end_date: str = Field(description="Week end date (Sunday, YYYY-MM-DD).")
    days: list[DateEntryDTO] = Field(description="All days in the week (Mon-Sun).")
    weekdays: list[DateEntryDTO] = Field(description="Weekdays only (Mon-Fri).")


class DateContextDTO(DTO):
    timezone: str = Field(description="IANA timezone used for all dates.")
    now_local: str = Field(description="Current local time in YYYY-MM-DD HH:MM.")
    today: DateEntryDTO
    tomorrow: DateEntryDTO
    this_week: WeekRangeDTO = Field(description="Days of this week starting from today (today..Sunday). Replaces previous full-week meaning.")
    next_week: WeekRangeDTO


class OSMResolveStatus(StrEnum):
    ok = "ok"
    ambiguous = "ambiguous"
    not_found = "not_found"
    error = "error"


class OSMAttributionDTO(DTO):
    attribution: str = Field(description="Attribution string to include when using OSM-derived data.")
    attribution_url: str = Field(description="Attribution URL.")
    license: str = Field(description="License identifier.")


class OSMSourceDTO(DTO):
    type: str = Field(description="Source type.")
    osm_type: str = Field(description='OSM element type: "node", "way", or "relation".')
    osm_id: int = Field(ge=1, description="OSM element id.")
    url: str = Field(description="OpenStreetMap URL for the element.")
    name: str | None = Field(default=None, description="Name tag of the element, if present.")
    distance_m: float | None = Field(default=None, ge=0, description="Distance from query coordinate in meters.")


class OSMCandidateDTO(DTO):
    osm_type: str = Field(description='OSM element type: "node", "way", or "relation".')
    osm_id: int = Field(ge=1, description="OSM element id.")
    url: str = Field(description="OpenStreetMap URL for the element.")
    name: str | None = Field(default=None, description="Name tag of the element, if present.")
    distance_m: float = Field(ge=0, description="Distance from query coordinate in meters.")
    score: float = Field(description="Internal matching score (higher is better).")
    opening_hours: str | None = Field(default=None, description="OSM opening_hours tag (if present).")
    kitchen_hours: str | None = Field(default=None, description="OSM opening_hours:kitchen tag (if present).")
    tags: dict[str, str | None] = Field(default_factory=dict, description="Small subset of OSM tags for debugging.")


class OSMResolveResponseDTO(DTO):
    status: OSMResolveStatus
    opening_hours: str | None = Field(default=None, description="Resolved OSM opening_hours (if found and unambiguous).")
    kitchen_hours: str | None = Field(default=None, description="Resolved OSM opening_hours:kitchen (if present).")
    source: OSMSourceDTO | None = Field(default=None, description="Chosen source element if status=ok.")
    confidence: float = Field(ge=0.0, le=1.0, description="Heuristic confidence for the match.")
    candidates: list[OSMCandidateDTO] = Field(default_factory=list, description="Ranked candidates if ambiguous or for debugging.")
    note: str | None = Field(default=None, description="Human-readable note (errors, missing tags, etc.).")
    attribution: OSMAttributionDTO = Field(description="Attribution metadata that must be included when using this data.")


class OpenMensaCanteenRefDTO(DTO):
    canteen_id: int = Field(ge=1, description="OpenMensa canteen id.")
    name: str | None = Field(default=None, description="OpenMensa canteen name.")
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class OSMResolveForCanteenResponseDTO(OSMResolveResponseDTO):
    openmensa: OpenMensaCanteenRefDTO
