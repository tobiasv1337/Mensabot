"""
Backend i18n module — locale loader and string resolver.

Usage:
    from .i18n import get_string, resolve_language

    lang = resolve_language(request.language)          # "de-DE" → "de", None → "en"
    prompt = get_string("system_prompt", lang)          # returns localized string
    msg = get_string("filter_diet", lang, diet="vegan", diet_filter_value="vegan")

Adding a new language:
    1. Create a new JSON file in locales/ (e.g. fr.json)
    2. Add the language code to SUPPORTED_LANGUAGES below
    Missing keys automatically fall back to en.json.
"""

import json
import importlib.resources
from functools import lru_cache


SUPPORTED_LANGUAGES: tuple[str, ...] = ("de", "en")
DEFAULT_LANGUAGE = "en"


@lru_cache(maxsize=None)
def _load_locale(lang: str) -> dict[str, str]:
    """Load and cache a locale JSON file. Returns empty dict if file doesn't exist."""
    try:
        content = importlib.resources.files("mensa_api_backend").joinpath("locales", f"{lang}.json").read_text(encoding="utf-8")
        return json.loads(content)
    except FileNotFoundError:
        return {}


def get_string(key: str, lang: str = DEFAULT_LANGUAGE, **kwargs: object) -> str:
    """Look up a localized string by key.

    Falls back to English if the key is missing from the requested locale.
    Supports Python str.format() interpolation via **kwargs.
    """
    locale = _load_locale(lang) if lang in SUPPORTED_LANGUAGES else {}
    fallback = _load_locale(DEFAULT_LANGUAGE)
    template = locale.get(key) or fallback.get(key, f"[MISSING: {key}]")
    return template.format(**kwargs) if kwargs else template


def resolve_language(lang: str | None) -> str:
    """Normalize a language code to a supported language, defaulting to English.

    Examples:
        resolve_language("de-DE") → "de"
        resolve_language("en")    → "en"
        resolve_language("fr")    → "en"  (unsupported, falls back)
        resolve_language(None)    → "en"
    """
    if not lang:
        return DEFAULT_LANGUAGE
    code = lang.strip().lower().split("-")[0]
    return code if code in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE
