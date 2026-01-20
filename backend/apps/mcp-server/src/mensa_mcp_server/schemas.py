"""
Mensabot MCP Server — schemas
Author: Tobias Veselsky
Description: Pydantic schemas for Mensabot MCP Server tools.
"""
from __future__ import annotations

from pydantic import BaseModel, Field, ConfigDict
from enum import StrEnum
from typing import Iterable
import unicodedata

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
    raw_notes: list[str] = d.get("notes") or []
    return MealDTO(
        id=d["id"],
        name=d["name"],
        category=d.get("category"),
        prices=PriceInfoDTO.model_validate(d["prices"]),
        diet_type=_infer_diet_type(d.get("name") or "", raw_notes),
        allergens=_extract_allergens(raw_notes),
        raw_notes=raw_notes,
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


class CoordinateDTO(DTO):
    latitude: float = Field(ge=-90, le=90, description="Latitude in decimal degrees (WGS84).")
    longitude: float = Field(ge=-180, le=180, description="Longitude in decimal degrees (WGS84).")


class PriceInfoDTO(DTO):
    model_config = ConfigDict(extra="ignore")

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
    raw_notes: list[str] = Field(
        default_factory=list,
        description="Raw notes from OpenMensa (kept for traceability, excluded from tool output).",
        exclude=True,
    )


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

class MenuBatchRequestDTO(DTO):
    canteen_id: int = Field(ge=1, description="OpenMensa canteen ID (e.g. 2019 for TU Hardenbergstraße Berlin).")
    date: str | None = Field(default=None, description="Target date in YYYY-MM-DD format. If omitted or null, uses today's date.")
    diet_filter: MenuDietFilter = Field(
        default=MenuDietFilter.all,
        description="Filter meals by diet type (all, meat_only, vegetarian, vegan).",
    )
    exclude_allergens: list[str] = Field(
        default_factory=list,
        description="Exclude meals containing any of these allergens (e.g. 'sesame', 'soja', 'peanut').",
    )

class MenuBatchResponseDTO(DTO):
    results: list[MenuResponseDTO] = Field(
        description=(
            "One entry per requested (canteen_id, date) pair. "
            "The order matches the input list."
        ),
    )


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
        "veganer",
        "vegansk",
        "vegansk",
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
        "vegetarisk",
        "vegetar",
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
        "veg",
        "vegetal",
    },
}

_MEAT_KEYWORDS = {
    "meat", "fleisch", "carne", "viande", "kott", "kjott", "kjoett", "koed", "mieso",
    "beef", "rind", "rindfleisch", "rinder", "rinderhack", "hackfleisch", "gehacktes", "okse", "not", "wolowina",
    "pork", "schwein", "schweine", "schweinefleisch", "schweins", "schweinegelatine", "schinken", "ham", "bacon", "speck", "gris", "svin", "wieprzowina",
    "chicken", "huhn", "hähnchen", "henderl", "poulet", "pollo", "kip", "kuiken", "hen", "kylling", "kyckling", "kurczak",
    "turkey", "pute", "puten", "truthahn", "dinde", "pavo", "kalkun", "indyk",
    "duck", "ente", "canard", "pato", "anatra", "and", "anka", "kaczka",
    "lamb", "lamm", "agneau", "cordero", "agnello", "lam", "faar", "faar", "baranek", "jagnięcina",
    "goat", "ziege", "chevre", "cabra", "capra", "gedde", "geit",
    "game", "wild", "hirsch", "reh", "venison", "boar", "wildschwein",
    "sausage", "wurst", "bratwurst", "currywurst", "salami", "chorizo",
    "fish", "fisch", "poisson", "pescado", "pesce", "thon", "tuna", "salmon", "lachs", "forelle", "trout", "fisk", "losos", "sledz", "sledzie", "dorsz",
    "seafood", "marisco", "mariscos", "frutti di mare", "skaldyr", "skaldjur",
    "shrimp", "prawn", "garnelen", "scampi", "krabbe", "krabben", "lobster", "hummer", "reje", "reker", "rak",
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
        "nuss", "nusse", "nusskerne", "nuts", "schalenfruchte", "schalenfrüchte",
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
    "nitrite": {"nitritpokelsalz", "nitritpökelsalz", "nitrite", "curing salt", "pokelsalz", "pökelsalz", "e250", "sodium nitrite"},
    "antioxidant": {"antioxidationsmittel", "antioxidant", "antioxydant", "antioksidant"},
    "colorant": {"farbstoff", "colorant", "coloring", "colorante", "fargestoff", "barwnik"},
    "phosphate": {"phosphat", "phosphate", "fosfat"},
    "sweetener": {"susungsmittel", "sussstoff", "sweetener", "edulcorant", "sotningsmedel", "slodzik"},
    "flavor_enhancer": {"geschmacksverstärker", "geschmacksverstarker", "flavor enhancer", "exhausteur de gout", "smakforsterker", "wzmacniacz smaku"},
    "gelatin": {"gelatine", "gelatin", "gelatina", "zelelatyna", "schwein", "schweinegelatine", "pork gelatin"},
    "yeast": {"hefe", "yeast", "levure", "gjær", "drozdy"},
    "phenylalanine": {"phenylalanin", "phenylalaninquelle", "phenylalanine", "fenyloalanina"},
    "laxative": {"abführend", "abfuhrend", "laxative", "laksativ", "srodek przeczyszczajacy"},
}


def _normalize_text(text: str) -> str:
    stripped = unicodedata.normalize("NFKD", text)
    ascii_only = "".join(ch for ch in stripped if not unicodedata.combining(ch))
    return ascii_only.strip().lower()


def _infer_diet_type(name: str, notes: Iterable[str]) -> DietType:
    text_blob = _normalize_text(" ".join([name] + list(notes)))
    if any(keyword in text_blob for keyword in _MEAT_KEYWORDS):
        return DietType.meat

    if any(keyword in text_blob for keyword in _DIET_KEYWORDS[DietType.vegan]):
        return DietType.vegan

    if any(keyword in text_blob for keyword in _DIET_KEYWORDS[DietType.vegetarian]):
        return DietType.vegetarian

    return DietType.unknown


def _canonicalize_allergen_label(label: str) -> str | None:
    lowered = _normalize_text(label)
    for canonical, keywords in _ALLERGEN_KEYWORDS.items():
        if lowered == canonical:
            return canonical
        if any(lowered == kw for kw in keywords):
            return canonical
        if any(kw in lowered for kw in keywords):
            return canonical
    return None


def _extract_allergens(notes: Iterable[str]) -> list[str]:
    found: set[str] = set()
    for note in notes:
        lowered = _normalize_text(note)
        for canonical, keywords in _ALLERGEN_KEYWORDS.items():
            if any(keyword in lowered for keyword in keywords):
                found.add(canonical)
    return sorted(found)
