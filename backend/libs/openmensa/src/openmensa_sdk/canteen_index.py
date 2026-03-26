"""
OpenMensa SDK — canteen index
Author: Tobias Veselsky
Description: Persistent canteen index with fuzzy search.
"""

from __future__ import annotations

import datetime as dt
import json
import logging
import math
import os
import re
import tempfile
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from rapidfuzz import fuzz

from .client import OpenMensaClient
from .errors import OpenMensaAPIError
from .models import Canteen

logger = logging.getLogger(__name__)

CANTEEN_INDEX_VERSION = 1
DEFAULT_INDEX_TTL_HOURS = 24.0

DEFAULT_INDEX_PATH = os.getenv("OPENMENSA_CANTEEN_INDEX_PATH") or str(
    Path(os.getenv("XDG_CACHE_HOME") or Path.home() / ".cache")
    / "openmensa"
    / "canteens.json"
)

_STOP_TOKENS = {
    "tu",
    "th",
    "fh",
    "hs",
    "uni",
    "univ",
    "technische",
    "hochschule",
    "fachhochschule",
    "universitaet",
    "universitat",
    "university",
    "technical",
    "institute",
    "institut",
    "mensa",
    "canteen",
    "cafeteria",
    "in",
    "near",
    "at",
    "of",
    "am",
    "an",
    "bei",
}

_ALIAS_REPLACEMENTS = [
    ("technische hochschule", "th"),
    ("technische universitaet", "tu"),
    ("technische universitat", "tu"),
    ("technical university", "tu"),
    ("universitaet", "uni"),
    ("universitat", "uni"),
    ("university", "uni"),
    ("univ", "uni"),
    ("hochschule", "hs"),
    ("fachhochschule", "fh"),
    ("freie universitaet", "fu"),
    ("freie universitat", "fu"),
    ("humboldt universitaet", "hu"),
    ("humboldt universitat", "hu"),
]


@dataclass(frozen=True, slots=True)
class CanteenSearchResult:
    canteen: Canteen
    score: float
    distance_km: float | None = None


@dataclass(frozen=True, slots=True)
class _IndexedCanteen:
    canteen: Canteen
    name_norm: str
    city_norm: str | None
    address_norm: str | None
    aliases: tuple[str, ...]
    acronym: str | None


def _normalize_text(text: str) -> str:
    stripped = unicodedata.normalize("NFKD", text)
    ascii_only = "".join(ch for ch in stripped if not unicodedata.combining(ch))
    ascii_only = ascii_only.replace("ß", "ss").replace("ẞ", "ss")
    ascii_only = re.sub(r"[^a-zA-Z0-9]+", " ", ascii_only).strip().lower()
    return re.sub(r"\s+", " ", ascii_only)


def _normalize_city(text: str) -> str:
    return _normalize_text(text)


def _normalize_query(text: str) -> str:
    return _normalize_text(text)


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text)


def _acronym(tokens: Iterable[str]) -> str:
    letters = [t[0] for t in tokens if t]
    return "".join(letters)


def _prefix_acronym(tokens: list[str]) -> str | None:
    if len(tokens) < 2:
        return None
    prefix = tokens[0]
    if prefix not in {"tu", "uni", "univ", "hs", "fh", "th", "fu", "hu"}:
        return None
    initials = "".join(t[0] for t in tokens[1:] if t)
    if not initials:
        return None
    return f"{prefix}{initials}"


def _generate_aliases(name_norm: str, city_norm: str | None) -> tuple[str, ...]:
    aliases = {name_norm}

    for src, dst in _ALIAS_REPLACEMENTS:
        if src in name_norm:
            aliases.add(_normalize_text(name_norm.replace(src, dst)))

    tokens = _tokenize(name_norm)
    token_set = set(tokens)
    ac = _acronym(tokens)
    if ac and len(ac) >= 2:
        aliases.add(ac)
        if city_norm:
            aliases.add(f"{ac} {city_norm}")

    if city_norm:
        if (
            "technische universitaet" in name_norm
            or "technische universitat" in name_norm
            or "technical university" in name_norm
            or "tu" in token_set
        ):
            aliases.add(f"tu {city_norm}")
        if (
            "universitaet" in name_norm
            or "universitat" in name_norm
            or "university" in name_norm
            or "uni" in token_set
            or "univ" in token_set
        ):
            aliases.add(f"uni {city_norm}")
        if "fachhochschule" in name_norm or "fh" in token_set:
            aliases.add(f"fh {city_norm}")
        if "technische hochschule" in name_norm or "th" in token_set:
            aliases.add(f"th {city_norm}")
        if "hochschule" in name_norm or "hs" in token_set:
            aliases.add(f"hs {city_norm}")
        if "freie universitaet" in name_norm or "freie universitat" in name_norm or "fu" in token_set:
            aliases.add(f"fu {city_norm}")
        if "humboldt universitaet" in name_norm or "humboldt universitat" in name_norm or "hu" in token_set:
            aliases.add(f"hu {city_norm}")

    for alias in list(aliases):
        alias_tokens = _tokenize(alias)
        prefix_alias = _prefix_acronym(alias_tokens)
        if prefix_alias:
            aliases.add(prefix_alias)

    return tuple(sorted(a for a in aliases if a))


def _build_query_variants(query_norm: str) -> list[tuple[str, float, float | None]]:
    variants: list[tuple[str, float, float | None]] = []
    seen: set[str] = set()

    def add_variant(value: str, weight: float, cap: float | None = None) -> None:
        if not value or value in seen:
            return
        variants.append((value, weight, cap))
        seen.add(value)

    add_variant(query_norm, 1.0, None)

    for src, dst in _ALIAS_REPLACEMENTS:
        if src in query_norm:
            add_variant(_normalize_text(query_norm.replace(src, dst)), 0.95, None)

    tokens = query_norm.split()
    prefix_variant = _prefix_acronym(tokens)
    if prefix_variant:
        add_variant(prefix_variant, 0.95, None)

    if tokens and any(t in _STOP_TOKENS for t in tokens):
        filtered = [t for t in tokens if t not in _STOP_TOKENS]
        if filtered:
            # Stop tokens like "tu", "uni", "mensa" are very common and would otherwise
            # make many unrelated canteens score >= min_score. When we have at least one
            # informative token left, use the filtered query with reduced weight and a
            # score cap so it contributes without inflating scores for weak matches.
            add_variant(" ".join(filtered), 0.75, 90.0)
            prefix_variant = _prefix_acronym(filtered)
            if prefix_variant:
                add_variant(prefix_variant, 0.8, 90.0)

    return variants


def _best_city_match(target: str, cities: Iterable[str], threshold: float) -> str | None:
    best_city = None
    best_score = threshold
    for city in cities:
        score = max(float(fuzz.ratio(target, city)), float(fuzz.partial_ratio(target, city)))
        if score > best_score:
            best_score = score
            best_city = city
    return best_city


def _resolve_city_filter(city: str | None, cities: set[str]) -> str | None:
    if not city:
        return None
    city_norm = _normalize_city(city)
    if city_norm in cities:
        return city_norm
    return _best_city_match(city_norm, cities, threshold=70.0)


def _infer_city_from_query(query_norm: str, cities: set[str]) -> str | None:
    if not query_norm:
        return None
    if query_norm in cities:
        return query_norm
    for city in cities:
        if city in query_norm:
            return city
    tokens = [t for t in query_norm.split() if t and t not in _STOP_TOKENS]
    if tokens:
        candidate = " ".join(tokens)
        if candidate in cities:
            return candidate
        match = _best_city_match(candidate, cities, threshold=85.0)
        if match:
            return match
    return _best_city_match(query_norm, cities, threshold=90.0)


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def _parse_dt(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return dt.datetime.fromisoformat(value)
    except ValueError:
        return None


class CanteenIndex:
    def __init__(self, canteens: list[Canteen], updated_at: dt.datetime) -> None:
        self.canteens = list(canteens)
        self.updated_at = updated_at
        self._entries = self._index_canteens(self.canteens)
        self._cities = {e.city_norm for e in self._entries if e.city_norm}
        self._city_centroids = self._build_city_centroids(self._entries)

    @property
    def city_count(self) -> int:
        return len(self._cities)

    @classmethod
    def from_dict(cls, payload: dict) -> CanteenIndex:
        if not isinstance(payload, dict):
            raise ValueError("Index payload must be a dict.")
        if payload.get("version") != CANTEEN_INDEX_VERSION:
            raise ValueError(
                f"Index payload version {payload.get('version')!r} does not match expected version {CANTEEN_INDEX_VERSION}."
            )

        updated_at = _parse_dt(payload.get("updated_at"))
        if updated_at is None:
            updated_at = dt.datetime.now(dt.timezone.utc)

        canteens_raw = payload.get("canteens") or []
        canteens: list[Canteen] = []
        for item in canteens_raw:
            if not isinstance(item, dict):
                continue
            canteens.append(
                Canteen(
                    id=int(item.get("id")),
                    name=str(item.get("name") or ""),
                    city=item.get("city"),
                    address=item.get("address"),
                    latitude=item.get("latitude"),
                    longitude=item.get("longitude"),
                )
            )

        return cls(canteens=canteens, updated_at=updated_at)

    @classmethod
    def from_file(cls, path: str) -> CanteenIndex:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
        return cls.from_dict(payload)

    def to_dict(self) -> dict:
        updated_at = self.updated_at
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=dt.timezone.utc)
        else:
            updated_at = updated_at.astimezone(dt.timezone.utc)
        return {
            "version": CANTEEN_INDEX_VERSION,
            "updated_at": updated_at.isoformat(),
            "total_canteens": len(self.canteens),
            "canteens": [c.to_dict() for c in self.canteens],
        }

    def to_file(self, path: str) -> None:
        dir_path = os.path.dirname(path) or "."
        os.makedirs(dir_path, exist_ok=True)

        fd, tmp_path = tempfile.mkstemp(prefix=f".{os.path.basename(path)}.", suffix=".tmp", dir=dir_path, text=True)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(self.to_dict(), handle, ensure_ascii=True, indent=2, sort_keys=True)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(tmp_path, path)
        finally:
            try:
                os.remove(tmp_path)
            except FileNotFoundError:
                pass

    def is_stale(self, ttl_hours: float) -> bool:
        updated_at = self.updated_at
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=dt.timezone.utc)
        else:
            updated_at = updated_at.astimezone(dt.timezone.utc)
        age = dt.datetime.now(dt.timezone.utc) - updated_at
        return age.total_seconds() >= ttl_hours * 3600.0

    def list(
        self,
        *,
        page: int = 1,
        per_page: int = 50,
        city: str | None = None,
        has_coordinates: bool | None = None,
    ) -> tuple[list[Canteen], int]:
        if page < 1:
            raise ValueError("page must be >= 1.")
        if per_page < 1:
            raise ValueError("per_page must be >= 1.")

        city_norm = _resolve_city_filter(city, self._cities) if city else None
        if city and city_norm is None:
            return [], 0
        items = self._entries
        if city_norm:
            items = [e for e in items if e.city_norm == city_norm]
        if has_coordinates is True:
            items = [e for e in items if e.canteen.latitude is not None and e.canteen.longitude is not None]
        elif has_coordinates is False:
            items = [e for e in items if e.canteen.latitude is None or e.canteen.longitude is None]

        total = len(items)
        start = (page - 1) * per_page
        end = start + per_page
        return [e.canteen for e in items[start:end]], total

    def search(
        self,
        query: str | None,
        *,
        page: int = 1,
        per_page: int = 50,
        city: str | None = None,
        near_lat: float | None = None,
        near_lng: float | None = None,
        radius_km: float | None = None,
        min_score: float = 60.0,
        has_coordinates: bool | None = None,
        sort_by: str = "auto",  # auto, distance, name, city
    ) -> tuple[list[CanteenSearchResult], int]:
        query_norm = _normalize_query(query or "")
        has_query = bool(query_norm)

        # Phase 1: resolve city (explicit or inferred)
        explicit_city = city is not None
        city_norm = _resolve_city_filter(city, self._cities) if explicit_city else None
        inferred_city = False
        if explicit_city and city_norm is None:
            return [], 0
        if not explicit_city and query_norm:
            city_norm = _infer_city_from_query(query_norm, self._cities)
            inferred_city = city_norm is not None

        # Phase 2: determine expansion center + radius (filtering)
        expansion_center: tuple[float, float] | None = None
        effective_radius: float | None = None
        if near_lat is not None and near_lng is not None:
            expansion_center = (near_lat, near_lng)
            effective_radius = radius_km
        elif radius_km is not None and explicit_city and city_norm:
            centroid = self._city_centroids.get(city_norm)
            if centroid is not None:
                expansion_center = centroid
                effective_radius = radius_km

        # Phase 3: determine distance center (for reporting)
        distance_center: tuple[float, float] | None = expansion_center
        if distance_center is None and city_norm:
            centroid = self._city_centroids.get(city_norm)
            if centroid is not None:
                distance_center = centroid

        variants = _build_query_variants(query_norm) if query_norm else []
        results: list[CanteenSearchResult] = []

        for entry in self._entries:
            if has_coordinates is True and (entry.canteen.latitude is None or entry.canteen.longitude is None):
                continue
            if has_coordinates is False and (entry.canteen.latitude is not None and entry.canteen.longitude is not None):
                continue

            in_city = city_norm is not None and entry.city_norm == city_norm

            distance_km: float | None = None
            in_expansion = False
            if distance_center is not None:
                if entry.canteen.latitude is None or entry.canteen.longitude is None:
                    distance_km = None
                else:
                    distance_km = _haversine_km(
                        entry.canteen.latitude,
                        entry.canteen.longitude,
                        distance_center[0],
                        distance_center[1],
                    )
                    if expansion_center is not None and effective_radius is not None:
                        if distance_km <= effective_radius:
                            in_expansion = True

            if explicit_city:
                if not (in_city or in_expansion):
                    continue
            else:
                if expansion_center is not None and effective_radius is not None and not in_expansion:
                    continue

            if not variants:
                results.append(CanteenSearchResult(canteen=entry.canteen, score=0.0, distance_km=distance_km))
                continue

            if not _matches_any_important_token(query_norm, entry):
                continue

            score = _score_entry(variants, entry)
            if in_city and (explicit_city or inferred_city):
                score = min(100.0, score + 5.0)
            if score < min_score:
                continue

            results.append(CanteenSearchResult(canteen=entry.canteen, score=score, distance_km=distance_km))

        total = len(results)
        
        # Sort results
        if sort_by == "distance":
            results.sort(
                key=lambda r: (
                    r.distance_km is None,
                    r.distance_km if r.distance_km is not None else float("inf"),
                    _normalize_text(r.canteen.name),
                )
            )
        elif sort_by == "city":
            results.sort(
                key=lambda r: (
                    _normalize_text(r.canteen.city or ""),
                    _normalize_text(r.canteen.name),
                )
            )
        elif sort_by == "name":
            results.sort(key=lambda r: _normalize_text(r.canteen.name))
        else: # auto / default
            if has_query:
                results.sort(
                    key=lambda r: (
                        -r.score,
                        r.distance_km is None,
                        r.distance_km if r.distance_km is not None else float("inf"),
                        _normalize_text(r.canteen.name),
                    )
                )
            else:
                results.sort(
                    key=lambda r: (
                        r.distance_km is None,
                        r.distance_km if r.distance_km is not None else float("inf"),
                        _normalize_text(r.canteen.name),
                    )
                )

        start = (page - 1) * per_page
        end = start + per_page
        return results[start:end], total

    @staticmethod
    def _index_canteens(canteens: list[Canteen]) -> list[_IndexedCanteen]:
        ordered = sorted(canteens, key=lambda c: (_normalize_text(c.name), c.id))
        entries: list[_IndexedCanteen] = []
        for canteen in ordered:
            name_norm = _normalize_text(canteen.name)
            city_norm = _normalize_city(canteen.city) if canteen.city else None
            address_norm = _normalize_text(canteen.address) if canteen.address else None
            aliases = _generate_aliases(name_norm, city_norm)
            tokens = _tokenize(name_norm)
            ac = _acronym(tokens) if tokens else None
            if not ac or len(ac) < 2:
                ac = None
            entries.append(
                _IndexedCanteen(
                    canteen=canteen,
                    name_norm=name_norm,
                    city_norm=city_norm,
                    address_norm=address_norm,
                    aliases=aliases,
                    acronym=ac,
                )
            )
        return entries

    @staticmethod
    def _build_city_centroids(entries: list[_IndexedCanteen]) -> dict[str, tuple[float, float]]:
        sums: dict[str, tuple[float, float, int]] = {}
        for entry in entries:
            if entry.city_norm is None:
                continue
            if entry.canteen.latitude is None or entry.canteen.longitude is None:
                continue
            key = entry.city_norm
            lat_sum, lng_sum, count = sums.get(key, (0.0, 0.0, 0))
            sums[key] = (
                lat_sum + float(entry.canteen.latitude),
                lng_sum + float(entry.canteen.longitude),
                count + 1,
            )
        centroids: dict[str, tuple[float, float]] = {}
        for city, (lat_sum, lng_sum, count) in sums.items():
            if count:
                centroids[city] = (lat_sum / count, lng_sum / count)
        return centroids


def _score_entry(variants: list[tuple[str, float, float | None]], entry: _IndexedCanteen) -> float:
    best = 0.0
    for query, weight, cap in variants:
        if query == entry.name_norm:
            best = max(best, 100.0 * weight)
        if query and query in entry.name_norm:
            best = max(best, 90.0 * weight)
        base_scores = [
            float(fuzz.token_set_ratio(query, entry.name_norm)),
            float(fuzz.partial_ratio(query, entry.name_norm)),
        ]
        for score in base_scores:
            if cap is not None:
                score = min(score, cap)
            best = max(best, score * weight)

        # Also match against addresses so queries like "Hardenbergstraße" work as expected.
        if entry.address_norm:
            if query == entry.address_norm:
                best = max(best, 100.0 * weight)
            if query and query in entry.address_norm:
                best = max(best, 90.0 * weight)
            addr_scores = [
                float(fuzz.token_set_ratio(query, entry.address_norm)),
                float(fuzz.partial_ratio(query, entry.address_norm)),
            ]
            for score in addr_scores:
                if cap is not None:
                    score = min(score, cap)
                best = max(best, score * weight)

        for alias in entry.aliases:
            if query == alias:
                best = max(best, 100.0 * weight)
            if query and query in alias:
                best = max(best, 90.0 * weight)
            if len(alias) < 3:
                continue
            alias_scores = [
                float(fuzz.token_set_ratio(query, alias)),
                float(fuzz.partial_ratio(query, alias)),
            ]
            for score in alias_scores:
                if cap is not None:
                    score = min(score, cap)
                best = max(best, score * weight)

        if entry.acronym:
            if query == entry.acronym:
                best = max(best, 100.0 * weight)
            if len(query) <= 3 and query in entry.acronym:
                best = max(best, 95.0 * weight)
    return best


def _matches_any_important_token(query_norm: str, entry: _IndexedCanteen) -> bool:
    """
    Guardrail against stop-token dominated matches.

    Example: "TU Hardenbergstraße" contains the very common token "tu". If we
    score everything purely by fuzzy ratios, many unrelated "TU ..." canteens
    can end up above the min_score. For queries that include at least one
    "informative" token (non-stop, length >= 4), require that at least one of
    those tokens matches name/city/address reasonably well.
    """

    tokens = [t for t in _tokenize(query_norm) if t not in _STOP_TOKENS and len(t) >= 4]
    if not tokens:
        return True

    haystacks: list[str] = [entry.name_norm]
    if entry.city_norm:
        haystacks.append(entry.city_norm)
    if entry.address_norm:
        haystacks.append(entry.address_norm)

    for token in tokens:
        for h in haystacks:
            if token in h:
                return True
            # Keep this strict: it is only a gate, the real ranking happens later.
            if float(fuzz.partial_ratio(token, h)) >= 90.0:
                return True

    return False


class CanteenIndexStore:
    def __init__(self, *, path: str | None = None) -> None:
        self.path = path or DEFAULT_INDEX_PATH
        self._index: CanteenIndex | None = None
        self._file_mtime: float | None = None

    def load(self) -> CanteenIndex | None:
        if not os.path.exists(self.path):
            return None

        try:
            mtime = os.path.getmtime(self.path)
        except OSError:
            logger.exception("Failed to stat canteen index file: %s", self.path)
            return None
        if self._index is not None and self._file_mtime == mtime:
            return self._index

        try:
            index = CanteenIndex.from_file(self.path)
        except Exception:
            logger.exception("Failed to load canteen index from %s", self.path)
            self._index = None
            self._file_mtime = None
            return None
        self._index = index
        self._file_mtime = mtime
        return index

    def refresh(self, client: OpenMensaClient) -> CanteenIndex:
        canteens = list(client.iter_canteens(per_page=100))
        index = CanteenIndex(canteens=canteens, updated_at=dt.datetime.now(dt.timezone.utc))
        index.to_file(self.path)
        self._index = index
        self._file_mtime = os.path.getmtime(self.path)
        logger.info("Canteen index refreshed (%d canteens).", len(index.canteens))
        return index

    def refresh_if_stale(self, client: OpenMensaClient, *, ttl_hours: float = DEFAULT_INDEX_TTL_HOURS) -> CanteenIndex:
        index = self.load()
        if index is None:
            return self.refresh(client)
        if index.is_stale(ttl_hours):
            return self.refresh(client)
        return index

    def refresh_if_stale_or_cached(
        self,
        client: OpenMensaClient,
        *,
        ttl_hours: float = DEFAULT_INDEX_TTL_HOURS,
    ) -> CanteenIndex:
        cached = self.load()
        if cached is not None and not cached.is_stale(ttl_hours):
            return cached
        try:
            return self.refresh(client)
        except OpenMensaAPIError:
            if cached is not None:
                logger.warning("OpenMensa API error refreshing index; using stale cache.", exc_info=True)
                return cached
            raise
