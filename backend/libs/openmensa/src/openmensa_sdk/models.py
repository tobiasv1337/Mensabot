"""
OpenMensa SDK — models
Author: Tobias Veselsky
Description: Domain dataclasses for OpenMensa SDK (Canteen, Day, Meal, PriceInfo).
"""

from __future__ import annotations
import datetime as dt
import math
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Any, Dict, Mapping, Optional, Tuple, Iterable

from .utils import _parse_coord_pair, _parse_date


@dataclass(frozen=True, slots=True)
class PriceInfo:
    """
    Price information for a meal (simple: students, employees, others).
    'raw' preserves all API-provided groups.
    """

    students: Optional[float] = None
    employees: Optional[float] = None
    pupils: Optional[float] = None
    others: Optional[float] = None

    raw: Mapping[str, float] = field(default_factory=lambda: MappingProxyType({}))

    @classmethod
    def from_api(cls, payload: Any) -> PriceInfo:
        if not isinstance(payload, Mapping):
            payload = {}

        def conv(v: Any) -> Optional[float]:
            try:
                if v is None:
                    return None
                x = float(v)
                if not math.isfinite(x):
                    return None
                return x
            except (TypeError, ValueError):
                return None

        raw_prices: Dict[str, float] = {}
        for group, price in payload.items():
            x = conv(price)
            if x is not None:
                raw_prices[str(group)] = x

        return cls(
            students=conv(payload.get("students")),
            employees=conv(payload.get("employees")),
            pupils=conv(payload.get("pupils")),
            others=conv(payload.get("others")),
            raw=MappingProxyType(raw_prices),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "students": self.students,
            "employees": self.employees,
            "pupils": self.pupils,
            "others": self.others,
            "raw": dict(self.raw),
        }


@dataclass(frozen=True, slots=True)
class Meal:
    """
    A single meal offered by a canteen (on a specific date).
    """

    id: int
    name: str
    prices: PriceInfo
    category: Optional[str] = None
    notes: Tuple[str, ...] = ()

    @classmethod
    def from_api(cls, payload: Mapping[str, Any]) -> Meal:
        raw_notes = payload.get("notes")
        norm_notes: Tuple[str, ...]
        if isinstance(raw_notes, Iterable) and not isinstance(raw_notes, (str, bytes)):
            norm_notes = tuple(str(n) for n in raw_notes)
        else:
            norm_notes = tuple()

        return cls(
            id=int(payload["id"]),
            name=str(payload.get("name") or ""),
            category=payload.get("category"),
            notes=norm_notes,
            prices=PriceInfo.from_api(payload.get("prices")),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "notes": list(self.notes),
            "prices": self.prices.to_dict(),
        }


@dataclass(frozen=True, slots=True)
class Day:
    """
    State of a canteen on a specific date.
    `closed` can tell you if it's open at all.
    `message` may carry info like 'Holiday' or 'Only dinner service'.
    """

    date: dt.date
    closed: Optional[bool] = None
    message: Optional[str] = None

    @classmethod
    def from_api(cls, payload: Mapping[str, Any]) -> Day:
        raw_closed = payload.get("closed")
        closed = bool(raw_closed) if isinstance(raw_closed, bool) else None
        return cls(
            date=_parse_date(payload.get("date")),
            closed=closed,
            message=payload.get("message"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "date": self.date.isoformat(),
            "closed": self.closed,
            "message": self.message,
        }


@dataclass(frozen=True, slots=True)
class Canteen:
    """
    A canteen / mensa.
    """

    id: int
    name: str
    city: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @classmethod
    def from_api(cls, payload: Mapping[str, Any]) -> Canteen:
        lat, lng = _parse_coord_pair(payload.get("coordinates"))
        return cls(
            id=int(payload["id"]),
            name=str(payload.get("name") or ""),
            city=payload.get("city"),
            address=payload.get("address"),
            latitude=lat,
            longitude=lng,
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "city": self.city,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
        }
