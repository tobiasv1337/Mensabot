"""
OpenMensa SDK — public API
Author: Tobias Veselsky
Description: Public imports for OpenMensa SDK package.
"""

from .canteen_index import CanteenIndex, CanteenIndexStore, CanteenSearchResult, DEFAULT_INDEX_PATH, DEFAULT_INDEX_TTL_HOURS
from .client import OpenMensaClient, DEFAULT_API_URL
from .errors import OpenMensaAPIError
from .models import Canteen, Day, Meal, PriceInfo

__all__ = [
    "CanteenIndex",
    "CanteenIndexStore",
    "CanteenSearchResult",
    "DEFAULT_INDEX_PATH",
    "DEFAULT_INDEX_TTL_HOURS",
    "OpenMensaClient",
    "OpenMensaAPIError",
    "Canteen",
    "Day",
    "Meal",
    "PriceInfo",
    "DEFAULT_API_URL",
]
