from __future__ import annotations

import re
import unicodedata
from typing import Iterable

from .dto import DietType

_DIET_KEYWORDS = {
    DietType.vegan: {
        "vegan", "vegane", "veganer", "veganes", "vegano", "vegana", "veganos", "vegansk", "veganske",
        "vegetalien", "vegetalienne", "vegan friendly", "vegan-friendly", "veganfreundlich", "plant based",
        "plant-based", "pflanzlich", "pflanzenbasiert",
    },
    DietType.vegetarian: {
        "vegetarisch", "vegetarian", "vegetar", "vegetarier", "vegetarien", "vegetariano", "vegetariana",
        "vegetarienne", "vegetarismo", "vegetarisk", "vegetariske", "wegetarianski", "wegetarianskie",
        "ovo-lacto", "ovo lacto", "ovo-lakto", "fleischlos", "meatless", "meat-free", "meat free", "veggie", "vegetal",
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
        "krebstier", "krebstiere", "krustentiere", "crustacean", "crustaceans", "crustace", "crustacee", "crustaceo",
        "crustaceos", "crustaces", "shrimp", "prawn", "prawns", "garnelen", "krabbe", "krabben", "hummer", "lobster",
        "languste", "langoustine", "marisco", "mariscos", "shellfish",
    },
    "egg": {"ei", "eier", "egg", "eggs", "oeuf", "oeufs", "huevo", "huevos", "uovo", "uova"},
    "fish": {"fisch", "fish", "lachs", "salmon", "thunfisch", "tuna", "poisson", "pescado", "pesce", "pez", "thon"},
    "peanut": {"erdnuss", "erdnusse", "erdnusskerne", "peanut", "peanuts", "arachide", "arachides", "cacahuete", "cacahuetes", "cacahuate", "mani"},
    "soy": {"soja", "soya", "soy", "sojabohne", "sojabohnen"},
    "milk": {"milch", "milk", "lait", "leche", "latte"},
    "lactose": {"laktose", "lactose", "lactosa"},
    "nut": {
        "nuss", "nusse", "nusskerne", "nuts", "schalenfruchte", "schalenfruechte", "walnut", "walnuss", "walnusse",
        "noix", "hasselnott", "valnot", "orzech wloski", "haselnuss", "haselnusse", "hazelnut", "hazelnuts", "noisette",
        "hasselnot", "hasselnotter", "orzech laskowy", "mandel", "mandeln", "almond", "almonds", "amande", "mandler",
        "migdal", "cashew", "cashews", "kaschunuss", "cashewnuss", "cashewnusse", "noix de cajou", "cashewnot",
        "orzech nerkowca", "pistazie", "pistazien", "pistachio", "pistachios", "pistache", "pistasjnott",
        "orzech pistacjowy", "pecan", "pecans", "pecanuss", "pecannuss", "pecanno", "pecannott", "orzech pekan",
        "paranuss", "paranusse", "brazil nut", "brazil nuts", "noix du bresil", "paranott", "orzech para", "macadamia",
        "macadamianuss", "macadamia nut", "macadamianot", "orzech makadamia", "pinienkern", "pinienkerne", "pine nut",
        "pine nuts", "pignon", "pinjekjerner", "orzeszki piniowe",
    },
    "celery": {"sellerie", "celery", "celeri", "apio", "sedano"},
    "mustard": {"senf", "mustard", "moutarde", "mostaza", "mostarda", "senape"},
    "sesame": {"sesam", "sesame", "ajonjoli", "ajonjoli"},
    "sulfite": {"sulfit", "sulfite", "schwefel", "sulphite", "sulfur", "sulfur dioxide", "dioxide de soufre", "dioxido de azufre", "anhydride sulfureuse", "anhydride solforosa", "so2"},
    "lupin": {"lupine", "lupin", "altramuz", "altramuces", "lupini"},
    "mollusc": {
        "weichtier", "weichtiere", "mollusc", "mollusk", "muschel", "muscheln", "mollusque", "molluschi", "molusco",
        "moluscos", "clams", "clam", "mussel", "oyster", "oesters", "huitre", "cozze", "vongole", "calamari", "squid",
        "sepia", "pulpo", "octopus",
    },
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
    return any(text.startswith(f"{keyword}:") for keyword in _DIET_KEYWORDS[diet_type])


def _first_diet_keyword_in_text(text: str) -> DietType | None:
    best_diet: DietType | None = None
    best_pos: int | None = None
    for diet_type in [DietType.vegan, DietType.vegetarian, DietType.meat]:
        for keyword in _DIET_KEYWORDS[diet_type]:
            match = re.search(r"\b" + re.escape(keyword) + r"\b", text)
            if not match:
                continue
            pos = match.start()
            if best_pos is None or pos < best_pos:
                best_pos = pos
                best_diet = diet_type
    return best_diet


def _infer_diet_type(name: str, notes: Iterable[str]) -> DietType:
    normalized_name = _normalize_text(name)
    normalized_notes = [_normalize_text(note) for note in notes]
    for note in normalized_notes:
        for diet_type in [DietType.vegan, DietType.vegetarian, DietType.meat]:
            if _matches_diet_prefix(note, diet_type):
                return diet_type
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
            if lowered == keyword or re.search(r"\b" + re.escape(keyword) + r"\b", lowered):
                return canonical
    return None


def _extract_allergens(notes: Iterable[str]) -> list[str]:
    found: set[str] = set()
    for note in notes:
        lowered = _normalize_text(note)
        for canonical, keywords in _ALLERGEN_KEYWORDS.items():
            for keyword in keywords:
                if re.search(r"\b" + re.escape(keyword) + r"\b", lowered):
                    found.add(canonical)
    return sorted(found)
