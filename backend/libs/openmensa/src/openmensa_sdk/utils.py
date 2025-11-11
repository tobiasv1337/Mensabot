"""
OpenMensa SDK — utils
Author: Tobias Veselsky
Description: Internal helper functions for OpenMensa SDK (parsing, pagination utilities).
"""

import datetime as dt
import math
from typing import Any, Dict, Mapping, Optional, Tuple, Union
from urllib.parse import parse_qs, urlparse

def _clean_params(params: Mapping[str, Any]) -> Dict[str, Any]:
    """Remove None values from query params."""
    return {k: v for k, v in params.items() if v is not None}


def _parse_date_str(value: Union[str, dt.date]) -> str:
    """Return ISO date string from either str or datetime.date."""
    return value if isinstance(value, str) else value.isoformat()


def _parse_date(value: Any) -> dt.date:
    """Parse a date from API ('YYYY-MM-DD') into datetime.date."""
    if isinstance(value, dt.date):
        return value
    return dt.date.fromisoformat(str(value))


def _parse_coord_pair(raw: Any) -> Tuple[Optional[float], Optional[float]]:
    """
    Spec: coordinates is either null or [lat, lng].
    Returns (lat, lng) or (None, None). Never returns a half-filled pair.
    """
    if not isinstance(raw, (list, tuple)) or len(raw) < 2:
        return (None, None)
    try:
        lat = float(raw[0])
        lng = float(raw[1])
    except (TypeError, ValueError):
        return (None, None)
    if any(map(math.isnan, (lat, lng))) or any(map(math.isinf, (lat, lng))):
        return (None, None)
    return (lat, lng)


def _parse_next_page_from_link(link_header: Optional[str]) -> Optional[int]:
    """
    Parse an RFC5988-style 'Link' header to find ?page=... for rel="next".

    Example:
        <https://openmensa.org/api/v2/canteens?page=2>; rel="next",
        <https://openmensa.org/api/v2/canteens?page=10>; rel="last"
    """
    if not link_header:
        return None

    parts = [p.strip() for p in link_header.split(",") if p.strip()]
    for part in parts:
        if 'rel="next"' not in part:
            continue
        start = part.find("<")
        end = part.find(">", start + 1)
        if start == -1 or end == -1:
            continue
        url = part[start + 1 : end]

        qs = parse_qs(urlparse(url).query)
        if "page" in qs and qs["page"]:
            try:
                return int(qs["page"][0])
            except ValueError:
                pass

    return None
