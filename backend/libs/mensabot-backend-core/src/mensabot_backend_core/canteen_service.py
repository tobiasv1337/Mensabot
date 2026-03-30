from __future__ import annotations

from openmensa_sdk import OpenMensaAPIError

from .cache import shared_cache
from .cache_keys import openmensa_canteen_key
from .dto import CanteenDTO
from .mappers import _canteen_to_dto
from .openmensa_client import make_openmensa_client
from .settings import settings


class CanteenNotFoundError(ValueError):
    """Raised when a requested canteen does not exist upstream."""


class CanteenLookupError(RuntimeError):
    """Raised when a canteen lookup fails for non-404 upstream reasons."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


def fetch_canteen_info(canteen_id: int) -> CanteenDTO:
    cache_key = openmensa_canteen_key(canteen_id)
    cached = shared_cache.get(cache_key)
    if cached is not None:
        return CanteenDTO.model_validate(cached)

    with make_openmensa_client() as client:
        try:
            canteen = client.get_canteen(canteen_id)
        except OpenMensaAPIError as exc:
            status_code = getattr(exc, "status_code", None)
            if status_code == 404:
                raise CanteenNotFoundError(f"Canteen with ID {canteen_id} not found.") from exc
            raise CanteenLookupError(str(exc), status_code=status_code) from exc

    dto = _canteen_to_dto(canteen)
    shared_cache.set(cache_key, dto.model_dump(exclude_none=True), ttl_s=settings.openmensa_canteen_info_cache_ttl_s)
    return dto
