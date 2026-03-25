"""
Mensabot MCP Server — schemas
Author: Tobias Veselsky
Description: Pydantic schemas for Mensabot MCP Server tools.
"""
from __future__ import annotations

from pydantic import BaseModel, Field, ConfigDict
from enum import StrEnum
from typing import Iterable, Optional
import unicodedata
import re

from openmensa_sdk import Canteen, Meal

# ------------------------------ mapping helpers SDK dataclasses -> DTOs ------------------------------

def _canteen_to_dto(canteen: Canteen) -> CanteenDTO:
    d = canteen.to_dict()
    return CanteenDTO(
        id=d["id"],
        name=d["name"],
        city=d.get("city"),
        address=d.get("address"),
        lat=d.get("latitude"),
        lng=d.get("longitude"),
    )

def _meal_to_dto(meal: Meal, price_category: PriceCategory | None = None) -> MealDTO:
    d = meal.to_dict()
    raw_notes: list[str] = d.get("notes") or []
    prices = PriceInfoDTO.model_validate(d["prices"])
    if price_category is not None:
        prices = _filter_prices(prices, price_category)
    return MealDTO(
        id=d["id"],
        name=d["name"],
        category=d.get("category"),
        prices=prices,
        diet_type=_infer_diet_type(d.get("name") or "", raw_notes),
        allergens=_extract_allergens(raw_notes),
        raw_notes=raw_notes,
    )

def _filter_prices(prices: PriceInfoDTO, category: PriceCategory) -> PriceInfoDTO:
    """Filter prices to only include the requested category."""
    return PriceInfoDTO(
        students=prices.students if category == PriceCategory.students else None,
        employees=prices.employees if category == PriceCategory.employees else None,
        pupils=prices.pupils if category == PriceCategory.pupils else None,
        others=prices.others if category == PriceCategory.others else None,
    )

# ------------------------------ Pydantic DTOs for MCP tools ------------------------------

class DTO(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        exclude_none=True,
        use_enum_values=True,
    )


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
    """Price category for filtering meal prices."""
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
    date: str = Field(
        description=(
            "Date (YYYY-MM-DD). For status 'ok' / 'no_menu_published' / 'empty_menu' / 'api_error' "
            "this is a valid ISO date. For 'invalid_date' it contains the original invalid input."
        ),
    )
    status: MenuStatusDTO
    meals: list[MealDTO] = Field(default_factory=list, description="List of meals for the given date.")
    total_meals: int = Field(
        ge=0,
        description="Number of meals the source menu contained before filtering.",
    )
    returned_meals: int = Field(
        ge=0,
        description="Number of meals returned after applying diet/allergen filters.",
    )


class MenuResponsePublicDTO(DTO):
    canteen_id: int = Field(ge=1, description="Unique identifier of the canteen.")
    date: str = Field(
        description=(
            "Date (YYYY-MM-DD). For status 'ok' / 'no_menu_published' / 'empty_menu' / 'api_error' "
            "this is a valid ISO date. For 'invalid_date' it contains the original invalid input."
        ),
    )
    status: MenuStatusDTO
    meals: list[MealPublicDTO] = Field(default_factory=list, description="List of meals for the given date.")
    total_meals: int = Field(
        ge=0,
        description="Number of meals the source menu contained before filtering.",
    )
    returned_meals: int = Field(
        ge=0,
        description="Number of meals returned after applying diet/allergen filters.",
    )

class MenuBatchRequestDTO(DTO):
    canteen_id: int = Field(ge=1, description="OpenMensa canteen ID.")
    date: str | None = Field(default=None, description="Target date in YYYY-MM-DD format. If omitted or null, uses today's date.")
    diet_filter: Optional[MenuDietFilter] = Field(
        default=None,
        description="Filter meals by diet type (all, meat_only, vegetarian, vegan). Null or 'all' = no filter.",
    )
    exclude_allergens: Optional[list[str]] = Field(
        default=None,
        description="Exclude meals containing any of these allergens (e.g. 'sesame', 'soja', 'peanut'). Null = no filter.",
    )
    price_category: PriceCategory | None = Field(
        default=None,
        description="Filter to one price category (students/employees/pupils/others) if known. Reduces output size. Null = no filter.",
    )

class MenuBatchResponseDTO(DTO):
    results: list[MenuResponseDTO] = Field(
        description=(
            "One entry per requested (canteen_id, date) pair. "
            "The order matches the input list."
        ),
    )


class MenuBatchResponsePublicDTO(DTO):
    results: list[MenuResponsePublicDTO] = Field(
        description=(
            "One entry per requested (canteen_id, date) pair. "
            "The order matches the input list."
        ),
    )

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


# ------------------------------ OpenStreetMap (OSM) opening hours DTOs ------------------------------

class OSMResolveStatus(StrEnum):
    """Status for OSM opening-hours resolution."""

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



# ------------------------------ normalization helpers ------------------------------

_DIET_KEYWORDS = {
    DietType.vegan: {
        "vegan",
        "vegane",
        "veganer",
        "veganes",
        "vegano",
        "vegana",
        "veganos",
        "vegansk",
        "veganske",
        "vegetalien",
        "vegetalienne",
        "vegan friendly",
        "vegan-friendly",
        "veganfreundlich",
        "plant based",
        "plant-based",
        "pflanzlich",
        "pflanzenbasiert",
    },
    DietType.vegetarian: {
        "vegetarisch",
        "vegetarian",
        "vegetar",
        "vegetarier",
        "vegetarien",
        "vegetariano",
        "vegetariana",
        "vegetarienne",
        "vegetarismo",
        "vegetarisk",
        "vegetariske",
        "wegetarianski",
        "wegetarianskie",
        "ovo-lacto",
        "ovo lacto",
        "ovo-lakto",
        "fleischlos",
        "meatless",
        "meat-free",
        "meat free",
        "veggie",
        "vegetal",
    },
    DietType.meat: {
        "meat", "fleisch", "carne", "viande", "kott", "kjott", "kjoett", "koed", "mieso",
        "beef", "rind", "rindfleisch", "rinder", "rinderhack", "hackfleisch", "gehacktes", "okse", "wolowina",
        "pork", "schwein", "schweine", "schweinefleisch", "schweins", "schweinegelatine", "schinken", "ham", "bacon", "speck", "gris", "svin", "wieprzowina",
        "chicken", "huhn", "hahnchen", "henderl", "poulet", "pollo", "kip", "kuiken", "hen", "kylling", "kyckling", "kurczak",
        "turkey", "pute", "puten", "truthahn", "dinde", "pavo", "kalkun", "indyk",
        "duck", "ente", "canard", "pato", "anatra", "and", "anka", "kaczka",
        "lamb", "lamm", "agneau", "cordero", "agnello", "lam", "faar", "baranek", "jagnięcina",
        "goat", "ziege", "chevre", "cabra", "capra", "gedde", "geit",
        "game", "wild", "hirsch", "reh", "venison", "boar", "wildschwein",
        "sausage", "wurst", "bratwurst", "currywurst", "salami", "chorizo",
        "fish", "fisch", "poisson", "pescado", "pesce", "thon", "tuna", "salmon", "lachs", "forelle", "trout", "fisk", "losos", "sledz", "sledzie", "dorsz",
        "seafood", "marisco", "mariscos", "frutti di mare", "skaldyr", "skaldjur",
        "shrimp", "prawn", "garnelen", "scampi", "krabbe", "krabben", "lobster", "hummer", "reje", "reker", "rak",
    },
}

_ALLERGEN_KEYWORDS: dict[str, set[str]] = {
    "gluten": {"gluten", "glutine", "glutenhaltig", "kamut"},
    "wheat": {"weizen", "wheat", "ble", "trigo", "frumento", "triticale", "kamut"},
    "rye": {"roggen", "rye", "seigle", "centeno", "segale"},
    "barley": {"gerste", "barley", "orge", "cebada", "orzo"},
    "oats": {"hafer", "oat", "oats", "avoine", "avena"},
    "spelt": {"dinkel", "spelt", "epeautre", "espelta", "farro"},
    "crustacean": {
        "krebstier", "krebstiere", "krustentiere", "crustacean", "crustaceans",
        "crustace", "crustacee", "crustaceo", "crustaceos", "crustaces",
        "shrimp", "prawn", "prawns", "garnelen", "krabbe", "krabben", "hummer",
        "lobster", "languste", "langoustine", "marisco", "mariscos", "shellfish",
    },
    "egg": {"ei", "eier", "egg", "eggs", "oeuf", "oeufs", "huevo", "huevos", "uovo", "uova"},
    "fish": {"fisch", "fish", "lachs", "salmon", "thunfisch", "tuna", "poisson", "pescado", "pesce", "pez", "thon"},
    "peanut": {"erdnuss", "erdnusse", "erdnusskerne", "peanut", "peanuts", "arachide", "arachides", "cacahuete", "cacahuetes", "cacahuate", "mani"},
    "soy": {"soja", "soya", "soy", "sojabohne", "sojabohnen"},
    "milk": {"milch", "milk", "lait", "leche", "latte"},
    "lactose": {"laktose", "lactose", "lactosa"},
    "nut": {
        "nuss", "nusse", "nusskerne", "nuts", "schalenfruchte", "schalenfruechte",
        "walnut", "walnuss", "walnusse", "noix", "hasselnott", "valnot", "orzech wloski",
        "haselnuss", "haselnusse", "hazelnut", "hazelnuts", "noisette", "hasselnot", "hasselnotter", "orzech laskowy",
        "mandel", "mandeln", "almond", "almonds", "amande", "mandler", "migdal",
        "cashew", "cashews", "kaschunuss", "cashewnuss", "cashewnusse", "noix de cajou", "cashewnot", "orzech nerkowca",
        "pistazie", "pistazien", "pistachio", "pistachios", "pistache", "pistasjnott", "orzech pistacjowy",
        "pecan", "pecans", "pecanuss", "pecannuss", "pecanno", "pecannott", "orzech pekan",
        "paranuss", "paranusse", "brazil nut", "brazil nuts", "noix du bresil", "paranott", "orzech para",
        "macadamia", "macadamianuss", "macadamia nut", "macadamianot", "orzech makadamia",
        "pinienkern", "pinienkerne", "pine nut", "pine nuts", "pignon", "pinjekjerner", "orzeszki piniowe",
    },
    "celery": {"sellerie", "celery", "celeri", "apio", "sedano"},
    "mustard": {"senf", "mustard", "moutarde", "mostaza", "mostarda", "senape"},
    "sesame": {"sesam", "sesame", "ajonjoli", "ajonjoli"},
    "sulfite": {"sulfit", "sulfite", "schwefel", "sulphite", "sulfur", "sulfur dioxide", "dioxide de soufre", "dioxido de azufre", "anhydride sulfureuse", "anhydride solforosa", "so2"},
    "lupin": {"lupine", "lupin", "altramuz", "altramuces", "lupini"},
    "mollusc": {
        "weichtier", "weichtiere", "mollusc", "mollusk", "muschel", "muscheln",
        "mollusque", "molluschi", "molusco", "moluscos", "clams", "clam", "mussel", "oyster", "oesters", "huitre",
        "cozze", "vongole", "calamari", "squid", "sepia", "pulpo", "octopus"},
    "alcohol": {"alkohol", "alcohol", "alcool", "alcoholico", "alcolico", "alkoholfritt", "alkoholfri"},
    "caffeine": {"koffein", "koffeinhaltig", "caffeine", "cafeine", "kofein", "kofeina"},
    "quinine": {"chinin", "chininhaltig", "quinine", "chinina", "kinin"},
    "preservative": {"konserviert", "konservierungsmittel", "preservative", "conservateur", "conservante", "konserveringsmiddel", "konserwant"},
    "nitrite": {"nitritpokelsalz", "nitrite", "curing salt", "pokelsalz", "e250", "sodium nitrite"},
    "antioxidant": {"antioxidationsmittel", "antioxidant", "antioxydant", "antioksidant"},
    "colorant": {"farbstoff", "colorant", "coloring", "colorante", "fargestoff", "barwnik"},
    "phosphate": {"phosphat", "phosphate", "fosfat"},
    "sweetener": {"sussungsmittel", "suesungsmittel", "sussstoff", "sweetener", "edulcorant", "sotningsmedel", "slodzik"},
    "flavor_enhancer": {"geschmacksverstarker", "flavor enhancer", "exhausteur de gout", "smakforsterker", "wzmacniacz smaku"},
    "gelatin": {"gelatine", "gelatin", "gelatina", "zelelatyna", "schweinegelatine", "pork gelatin"},
    "yeast": {"hefe", "yeast", "levure", "gjær", "drozdy"},
    "phenylalanine": {"phenylalanin", "phenylalaninquelle", "phenylalanine", "fenyloalanina"},
    "laxative": {"abfuhrend", "laxative", "laksativ", "srodek przeczyszczajacy"},
}


def _normalize_text(text: str) -> str:
    stripped = unicodedata.normalize("NFKD", text)
    ascii_only = "".join(ch for ch in stripped if not unicodedata.combining(ch))
    ascii_only = ascii_only.replace("ß", "ss").replace("ẞ", "ss")
    return ascii_only.strip().lower()


def _matches_diet_prefix(text: str, diet_type: DietType) -> bool:
    """Return True if text starts with an explicit diet declaration like 'vegan:' or 'vegetarisch:'."""
    return any(text.startswith(f"{keyword}:") for keyword in _DIET_KEYWORDS[diet_type])


def _first_diet_keyword_in_text(text: str) -> DietType | None:
    """Find the diet of the earliest keyword occurrence in a text.

    This avoids order bias from hardcoded diet priority and prefers what appears first in the sentence.
    """
    best_diet: DietType | None = None
    best_pos: int | None = None

    for diet_type in [DietType.vegan, DietType.vegetarian, DietType.meat]:
        for keyword in _DIET_KEYWORDS[diet_type]:
            pattern = r"\b" + re.escape(keyword) + r"\b"
            match = re.search(pattern, text)
            if not match:
                continue
            pos = match.start()
            if best_pos is None or pos < best_pos:
                best_pos = pos
                best_diet = diet_type

    return best_diet


def _infer_diet_type(name: str, notes: Iterable[str]) -> DietType:
    note_list = list(notes)
    normalized_name = _normalize_text(name)
    normalized_notes = [_normalize_text(note) for note in note_list]

    # 1) Hard preference for explicit declaration prefixes in notes.
    #    Example: "Vegetarisch: ... ohne Fisch- und Fleischzutaten" must classify as vegetarian.
    for note in normalized_notes:
        for diet_type in [DietType.vegan, DietType.vegetarian, DietType.meat]:
            if _matches_diet_prefix(note, diet_type):
                return diet_type

    # 2) Fallback: first keyword wins (by position), evaluated in natural text order.
    #    This reduces bias from fixed diet ordering when multiple keywords are present.
    for text in [normalized_name, *normalized_notes]:
        inferred = _first_diet_keyword_in_text(text)
        if inferred is not None:
            return inferred

    return DietType.unknown


def _canonicalize_allergen_label(label: str) -> str | None:
    lowered = _normalize_text(label)
    for canonical, keywords in _ALLERGEN_KEYWORDS.items():
        if lowered == canonical:
            return canonical
        for keyword in keywords:
            if lowered == keyword:
                return canonical
            pattern = r"\b" + re.escape(keyword) + r"\b"
            if re.search(pattern, lowered):
                return canonical
    return None


def _extract_allergens(notes: Iterable[str]) -> list[str]:
    found: set[str] = set()
    for note in notes:
        lowered = _normalize_text(note)
        for canonical, keywords in _ALLERGEN_KEYWORDS.items():
            for keyword in keywords:
                pattern = r"\b" + re.escape(keyword) + r"\b"
                if re.search(pattern, lowered):
                    found.add(canonical)
    return sorted(found)
