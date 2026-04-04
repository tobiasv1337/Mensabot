from __future__ import annotations

import hashlib
import json
import os
from contextvars import ContextVar, Token
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from threading import Lock
from typing import Any, Literal
from zoneinfo import ZoneInfo

from mensabot_backend_core.settings import settings as core_settings

from ..services.canteen_index import load_canteen_index


MessageOrigin = Literal["typed", "voice", "shortcut"]
InteractionKind = Literal["llm_chat", "quick_lookup"]

USER_ID_HEADER = "x-mensabot-user-id"
CHAT_ID_HEADER = "x-mensabot-chat-id"
REQUEST_ID_HEADER = "x-mensabot-request-id"
MESSAGE_ORIGIN_HEADER = "x-mensabot-message-origin"
INTERACTION_KIND_HEADER = "x-mensabot-interaction-kind"

_REQUEST_ID_RETENTION_DAYS = 3
_SESSION_IDLE_TIMEOUT = timedelta(minutes=30)
_TOP_LIMIT = 10
_STATE_VERSION = 3
_BOARD_NAMES = ("cities", "canteens", "tools", "filters")
_ENTITY_NAMES = ("users", "chats", "canteens", "cities")
_DIET_OPTIONS = ("none", "vegetarian", "vegan", "meat")
_METRIC_KEYS = (
    "messages_total",
    "llm_messages_total",
    "quick_lookup_messages_total",
    "interactions_total",
    "llm_interactions_total",
    "quick_lookup_interactions_total",
    "sessions_total",
    "shortcut_triggered_messages_total",
    "tool_calls_total",
    "tool_calls_success_total",
    "tool_calls_failed_total",
    "transcribe_requests_total",
    "typed_message_turns_total",
    "voice_message_turns_total",
    "shortcut_message_turns_total",
)
_ANALYTICS_TIMEZONE = ZoneInfo(core_settings.timezone)
_current_context: ContextVar["AnalyticsRequestContext | None"] = ContextVar("mensabot_analytics_context", default=None)


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _iso_now() -> str:
    return _utc_now().isoformat()


def _parse_iso(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _localize(moment: datetime) -> datetime:
    return moment.astimezone(_ANALYTICS_TIMEZONE)


def _local_day_key(moment: datetime) -> str:
    return _localize(moment).date().isoformat()


def _local_day_hour(moment: datetime) -> tuple[str, int]:
    local = _localize(moment)
    return local.date().isoformat(), local.hour


def _bucket_start_iso(day_key: str, hour: int | None = None) -> str:
    day_value = date.fromisoformat(day_key)
    start = datetime.combine(day_value, time(hour=hour or 0), tzinfo=_ANALYTICS_TIMEZONE)
    return start.isoformat()


def _date_range(start: date, end: date) -> list[str]:
    if start > end:
        return []
    span = (end - start).days
    return [(start + timedelta(days=offset)).isoformat() for offset in range(span + 1)]


def _normalize_label(value: str | None, *, fallback: str = "Unknown") -> str:
    if not isinstance(value, str):
        return fallback
    cleaned = " ".join(value.split()).strip()
    return cleaned or fallback


def _normalize_origin(value: str | None) -> MessageOrigin | None:
    if value in {"typed", "voice", "shortcut"}:
        return value
    return None


def _interaction_metric_prefix(value: InteractionKind) -> Literal["llm", "quick_lookup"]:
    return "llm" if value == "llm_chat" else "quick_lookup"


def _hashed_key(prefix: str, raw_value: str | None) -> str | None:
    if not isinstance(raw_value, str):
        return None
    cleaned = raw_value.strip()
    if not cleaned:
        return None
    digest = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()
    return f"{prefix}:{digest}"


def _add_unique(items: list[str], value: str | None) -> bool:
    if not isinstance(value, str):
        return False
    if value in items:
        return False
    items.append(value)
    return True


def _empty_metric_bucket() -> dict[str, int]:
    return {key: 0 for key in _METRIC_KEYS}


def _empty_leaderboards() -> dict[str, dict[str, Any]]:
    return {board: {} for board in _BOARD_NAMES}


def _empty_entities() -> dict[str, list[str]]:
    return {name: [] for name in _ENTITY_NAMES}


def _empty_diet_share() -> dict[str, int]:
    return {name: 0 for name in _DIET_OPTIONS}


def _empty_hour_bucket() -> dict[str, Any]:
    return {
        "metrics": _empty_metric_bucket(),
        "users": [],
    }


def _empty_day_bucket() -> dict[str, Any]:
    return {
        "metrics": _empty_metric_bucket(),
        "entities": _empty_entities(),
        "shares": {
            "diet_filters": _empty_diet_share(),
        },
        "leaderboards": _empty_leaderboards(),
        "hours": {str(hour): _empty_hour_bucket() for hour in range(24)},
    }


def _empty_state() -> dict[str, Any]:
    return {
        "version": _STATE_VERSION,
        "updated_at": _iso_now(),
        "daily": {},
        "dedupe": {
            "requests": {},
        },
        "request_diet_filters": {},
        "users": {},
    }


def _increment_counter(bucket: dict[str, Any], key: str, amount: int = 1) -> None:
    bucket[key] = int(bucket.get(key, 0)) + amount


def _sum_metrics(target: dict[str, int], source: dict[str, Any]) -> None:
    for key in _METRIC_KEYS:
        target[key] += int(source.get(key, 0))


def _canonical_diet_filter(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    if normalized == "meat_only":
        return "meat"
    if normalized in {"vegetarian", "vegan", "meat"}:
        return normalized
    return None


def _merge_leaderboard_counts(target: dict[str, dict[str, Any]], source: dict[str, Any]) -> None:
    for key, payload in source.items():
        if not isinstance(payload, dict):
            continue
        existing = target.get(key)
        if not isinstance(existing, dict):
            existing = {
                "key": key,
                "label": payload.get("label", key),
                "count": 0,
            }
            if "city" in payload:
                existing["city"] = payload.get("city")
            if "id" in payload:
                existing["id"] = payload.get("id")
            target[key] = existing
        existing["label"] = payload.get("label", existing.get("label", key))
        if "city" in payload:
            existing["city"] = payload.get("city")
        if "id" in payload:
            existing["id"] = payload.get("id")
        existing["count"] = int(existing.get("count", 0)) + int(payload.get("count", 0))


def _top_entries(items: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    sorted_items = sorted(
        (payload for payload in items.values() if isinstance(payload, dict)),
        key=lambda payload: (-int(payload.get("count", 0)), str(payload.get("label", ""))),
    )
    return sorted_items[:_TOP_LIMIT]


@dataclass(frozen=True)
class AnalyticsRequestContext:
    user_key: str | None
    chat_key: str | None
    request_key: str | None
    message_origin: MessageOrigin | None
    interaction_kind: InteractionKind
    track_events: bool = True


def get_current_analytics_context() -> AnalyticsRequestContext | None:
    return _current_context.get()


def set_current_analytics_context(context: AnalyticsRequestContext | None) -> Token:
    return _current_context.set(context)


def reset_current_analytics_context(token: Token) -> None:
    _current_context.reset(token)


class AnalyticsStore:
    """File-backed aggregate analytics store for lightweight deployment setups."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._state = _empty_state()
        self._loaded = False
        self._state_path: str | None = None
        self._canteen_by_id: dict[int, dict[str, Any]] = {}

    def configure(self, directory: str) -> None:
        normalized = os.path.abspath(directory)
        state_path = os.path.join(normalized, "analytics_state.json")
        with self._lock:
            if self._state_path == state_path:
                return
            self._state_path = state_path
            self._loaded = False
            self._state = _empty_state()

    def load(self) -> None:
        with self._lock:
            self._ensure_loaded_locked()

    def prepare_request_context(self, *, user_id: str | None, chat_id: str | None, request_id: str | None, message_origin: str | None, interaction_kind: InteractionKind) -> AnalyticsRequestContext:
        user_key = _hashed_key("usr", user_id)
        chat_key = _hashed_key("chat", chat_id)
        request_key = _hashed_key("req", request_id)
        origin = _normalize_origin(message_origin)

        with self._lock:
            self._ensure_loaded_locked()
            now = _utc_now()
            self._prune_dedupe_locked(now)
            track_events = True
            if request_key is not None:
                existing = self._state["dedupe"]["requests"].get(request_key)
                if isinstance(existing, str):
                    track_events = False
                else:
                    self._state["dedupe"]["requests"][request_key] = now.isoformat()
            if track_events:
                started_session = self._touch_user_locked(user_key, now)
                self._record_presence_locked(user_key=user_key, chat_key=chat_key, now=now, started_session=started_session)
                self._write_locked()

        return AnalyticsRequestContext(
            user_key=user_key,
            chat_key=chat_key,
            request_key=request_key,
            message_origin=origin,
            interaction_kind=interaction_kind,
            track_events=track_events,
        )

    def record_chat_response(self, context: AnalyticsRequestContext | None, *, filters: dict[str, Any] | None = None) -> None:
        if context is None or not context.track_events:
            return
        with self._lock:
            self._ensure_loaded_locked()
            now = _utc_now()
            self._record_message_batch_locked(
                context=context,
                interaction_kind="llm_chat",
                messages_added=2,
                now=now,
            )
            day_bucket = self._get_day_bucket_locked(_local_day_key(now))
            effective_diet = self._resolve_effective_diet_for_interaction_locked(context=context, filters=filters)
            self._record_effective_diet_share_locked(day_bucket=day_bucket, effective_diet=effective_diet)
            self._record_filter_leaderboard_locked(day_bucket=day_bucket, filters=filters, effective_diet=effective_diet)
            if context.request_key is not None:
                self._state["request_diet_filters"].pop(context.request_key, None)
            self._write_locked()

    def record_quick_lookup(self, context: AnalyticsRequestContext | None, *, canteen_id: int | None = None, diet_filter: str | None = None, exclude_allergens: list[str] | None = None, price_category: str | None = None) -> None:
        if context is None or not context.track_events:
            return
        with self._lock:
            self._ensure_loaded_locked()
            now = _utc_now()
            self._record_message_batch_locked(
                context=context,
                interaction_kind="quick_lookup",
                messages_added=2,
                now=now,
            )
            day_bucket = self._get_day_bucket_locked(_local_day_key(now))
            filters = {
                "diet_filter": diet_filter,
                "exclude_allergens": exclude_allergens or [],
                "price_category": price_category,
            }
            effective_diet = self._resolve_effective_diet_filter(filters)
            self._record_effective_diet_share_locked(day_bucket=day_bucket, effective_diet=effective_diet)
            self._record_filter_leaderboard_locked(day_bucket=day_bucket, filters=filters, effective_diet=effective_diet)
            if canteen_id is not None:
                self._record_canteen_locked(context=context, canteen_id=canteen_id, now=now)
            self._write_locked()

    def record_transcribe_request(self) -> None:
        with self._lock:
            self._ensure_loaded_locked()
            now = _utc_now()
            day_bucket, hour_bucket = self._get_day_and_hour_buckets_locked(now)
            _increment_counter(day_bucket["metrics"], "transcribe_requests_total")
            _increment_counter(hour_bucket["metrics"], "transcribe_requests_total")
            self._write_locked()

    def record_tool_call(self, *, context: AnalyticsRequestContext | None, tool_name: str, args: dict[str, Any] | None, ok: bool, result: Any) -> None:
        if context is None or not context.track_events:
            return
        with self._lock:
            self._ensure_loaded_locked()
            now = _utc_now()
            day_bucket, hour_bucket = self._get_day_and_hour_buckets_locked(now)
            _increment_counter(day_bucket["metrics"], "tool_calls_total")
            _increment_counter(hour_bucket["metrics"], "tool_calls_total")
            if ok:
                _increment_counter(day_bucket["metrics"], "tool_calls_success_total")
                _increment_counter(hour_bucket["metrics"], "tool_calls_success_total")
            else:
                _increment_counter(day_bucket["metrics"], "tool_calls_failed_total")
                _increment_counter(hour_bucket["metrics"], "tool_calls_failed_total")

            self._increment_leaderboard_locked(day_bucket=day_bucket, board="tools", key=tool_name, label=_normalize_label(tool_name, fallback="Tool"))
            self._record_effective_diet_hints_locked(context=context, tool_name=tool_name, args=args or {})
            self._record_entities_from_tool_locked(context=context, tool_name=tool_name, args=args or {}, result=result, now=now)
            self._write_locked()

    def get_public_stats(self, *, canteen_index_info: dict[str, int] | None = None) -> dict[str, Any]:
        with self._lock:
            self._ensure_loaded_locked()
            local_today = _localize(_utc_now()).date()
            period_days = self._build_period_day_keys(local_today)

            return {
                "updated_at": self._state["updated_at"],
                "timezone": core_settings.timezone,
                "availability": {
                    "total_canteens": int((canteen_index_info or {}).get("total_canteens", 0)),
                    "total_cities": int((canteen_index_info or {}).get("total_cities", 0)),
                },
                "periods": {
                    period_key: self._build_period_stats_locked(period_key=period_key, day_keys=day_keys)
                    for period_key, day_keys in period_days.items()
                },
            }

    def _ensure_loaded_locked(self) -> None:
        if self._loaded:
            return
        if not self._state_path:
            raise RuntimeError("AnalyticsStore.configure() must be called before use.")
        os.makedirs(os.path.dirname(self._state_path), exist_ok=True)
        if os.path.exists(self._state_path):
            try:
                with open(self._state_path, "r", encoding="utf-8") as handle:
                    loaded = json.load(handle)
                if isinstance(loaded, dict):
                    self._state = loaded
                else:
                    self._state = _empty_state()
            except Exception:
                self._state = _empty_state()
        else:
            self._state = _empty_state()
        self._normalize_state_locked()
        self._loaded = True

    def _normalize_state_locked(self) -> None:
        if int(self._state.get("version", 0) or 0) != _STATE_VERSION:
            self._state = _empty_state()
            return

        self._state["updated_at"] = self._state.get("updated_at") if isinstance(self._state.get("updated_at"), str) else _iso_now()
        self._state["users"] = self._state.get("users") if isinstance(self._state.get("users"), dict) else {}
        self._state["request_diet_filters"] = self._state.get("request_diet_filters") if isinstance(self._state.get("request_diet_filters"), dict) else {}

        dedupe = self._state.get("dedupe")
        self._state["dedupe"] = dedupe if isinstance(dedupe, dict) else {}
        requests = self._state["dedupe"].get("requests")
        self._state["dedupe"]["requests"] = requests if isinstance(requests, dict) else {}

        normalized_daily: dict[str, Any] = {}
        raw_daily = self._state.get("daily")
        if isinstance(raw_daily, dict):
            for day_key, payload in raw_daily.items():
                try:
                    date.fromisoformat(day_key)
                except (TypeError, ValueError):
                    continue
                normalized_daily[day_key] = self._normalize_day_bucket(payload)
        self._state["daily"] = normalized_daily

        normalized_users: dict[str, Any] = {}
        for user_key, payload in self._state["users"].items():
            if not isinstance(user_key, str):
                continue
            if not isinstance(payload, dict):
                payload = {}
            first_seen = payload.get("first_seen") if isinstance(payload.get("first_seen"), str) else self._state["updated_at"]
            last_seen = payload.get("last_seen") if isinstance(payload.get("last_seen"), str) else first_seen
            last_activity_at = payload.get("last_activity_at") if isinstance(payload.get("last_activity_at"), str) else last_seen
            current_session_started_at = payload.get("current_session_started_at") if isinstance(payload.get("current_session_started_at"), str) else last_activity_at
            session_count = max(int(payload.get("session_count", 0) or 0), 0)
            normalized_users[user_key] = {
                "first_seen": first_seen,
                "last_seen": last_seen,
                "last_activity_at": last_activity_at,
                "current_session_started_at": current_session_started_at,
                "session_count": session_count,
            }
        self._state["users"] = normalized_users

    def _normalize_day_bucket(self, payload: Any) -> dict[str, Any]:
        normalized = _empty_day_bucket()
        if not isinstance(payload, dict):
            return normalized

        metrics = payload.get("metrics")
        if isinstance(metrics, dict):
            for key in _METRIC_KEYS:
                normalized["metrics"][key] = int(metrics.get(key, 0))

        entities = payload.get("entities")
        if isinstance(entities, dict):
            for name in _ENTITY_NAMES:
                values = entities.get(name)
                normalized["entities"][name] = [item for item in values if isinstance(item, str)] if isinstance(values, list) else []

        shares = payload.get("shares")
        if isinstance(shares, dict):
            diet_filters = shares.get("diet_filters")
            if isinstance(diet_filters, dict):
                for name in _DIET_OPTIONS:
                    normalized["shares"]["diet_filters"][name] = int(diet_filters.get(name, 0))

        leaderboards = payload.get("leaderboards")
        if isinstance(leaderboards, dict):
            for board in _BOARD_NAMES:
                source_board = leaderboards.get(board)
                if isinstance(source_board, dict):
                    normalized["leaderboards"][board] = {
                        key: value for key, value in source_board.items() if isinstance(key, str) and isinstance(value, dict)
                    }

        hours = payload.get("hours")
        if isinstance(hours, dict):
            for hour in range(24):
                source_hour = hours.get(str(hour))
                if not isinstance(source_hour, dict):
                    continue
                hour_bucket = _empty_hour_bucket()
                source_metrics = source_hour.get("metrics")
                if isinstance(source_metrics, dict):
                    for key in _METRIC_KEYS:
                        hour_bucket["metrics"][key] = int(source_metrics.get(key, 0))
                source_users = source_hour.get("users")
                hour_bucket["users"] = [item for item in source_users if isinstance(item, str)] if isinstance(source_users, list) else []
                normalized["hours"][str(hour)] = hour_bucket

        return normalized

    def _write_locked(self) -> None:
        if not self._state_path:
            raise RuntimeError("AnalyticsStore.configure() must be called before use.")
        self._state["updated_at"] = _iso_now()
        tmp_path = f"{self._state_path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as handle:
            json.dump(self._state, handle, ensure_ascii=True, indent=2, sort_keys=True)
        os.replace(tmp_path, self._state_path)

    def _touch_user_locked(self, user_key: str | None, now: datetime) -> bool:
        if user_key is None:
            return False
        users = self._state["users"]
        payload = users.get(user_key)
        if not isinstance(payload, dict):
            payload = {
                "first_seen": now.isoformat(),
                "last_seen": now.isoformat(),
                "last_activity_at": now.isoformat(),
                "current_session_started_at": now.isoformat(),
                "session_count": 0,
            }
            users[user_key] = payload

        last_activity = _parse_iso(payload.get("last_activity_at"))
        session_count = int(payload.get("session_count", 0) or 0)
        started_session = session_count <= 0 or last_activity is None or now - last_activity > _SESSION_IDLE_TIMEOUT
        if started_session:
            payload["current_session_started_at"] = now.isoformat()
            payload["session_count"] = max(session_count, 0) + 1

        payload["last_seen"] = now.isoformat()
        payload["last_activity_at"] = now.isoformat()
        return started_session

    def _record_presence_locked(self, *, user_key: str | None, chat_key: str | None, now: datetime, started_session: bool) -> None:
        day_bucket, hour_bucket = self._get_day_and_hour_buckets_locked(now)
        if user_key is not None:
            _add_unique(day_bucket["entities"]["users"], user_key)
            _add_unique(hour_bucket["users"], user_key)
        if chat_key is not None:
            _add_unique(day_bucket["entities"]["chats"], chat_key)
        if started_session:
            _increment_counter(day_bucket["metrics"], "sessions_total")
            _increment_counter(hour_bucket["metrics"], "sessions_total")

    def _record_message_batch_locked(self, *, context: AnalyticsRequestContext, interaction_kind: InteractionKind, messages_added: int, now: datetime) -> None:
        metric_prefix = _interaction_metric_prefix(interaction_kind)
        day_bucket, hour_bucket = self._get_day_and_hour_buckets_locked(now)

        for metric_bucket in (day_bucket["metrics"], hour_bucket["metrics"]):
            _increment_counter(metric_bucket, "messages_total", messages_added)
            _increment_counter(metric_bucket, f"{metric_prefix}_messages_total", messages_added)
            _increment_counter(metric_bucket, "interactions_total")
            _increment_counter(metric_bucket, f"{metric_prefix}_interactions_total")

            if context.message_origin is not None:
                _increment_counter(metric_bucket, f"{context.message_origin}_message_turns_total")
                if context.message_origin == "shortcut":
                    _increment_counter(metric_bucket, "shortcut_triggered_messages_total", messages_added)

    def _resolve_effective_diet_filter(self, filters: dict[str, Any] | None) -> str | None:
        filters = filters or {}
        return _canonical_diet_filter(filters.get("diet")) or _canonical_diet_filter(filters.get("diet_filter"))

    def _resolve_effective_diet_for_interaction_locked(self, *, context: AnalyticsRequestContext, filters: dict[str, Any] | None) -> str | None:
        resolved = self._resolve_effective_diet_filter(filters)
        if resolved is not None:
            return resolved
        if context.request_key is None:
            return None
        payload = self._state["request_diet_filters"].get(context.request_key)
        if not isinstance(payload, dict):
            return None
        diets = payload.get("diets")
        unique_diets = [diet for diet in diets if diet in {"vegetarian", "vegan", "meat"}] if isinstance(diets, list) else []
        return unique_diets[0] if len(unique_diets) == 1 else None

    def _record_effective_diet_share_locked(self, *, day_bucket: dict[str, Any], effective_diet: str | None) -> None:
        key = effective_diet if effective_diet in {"vegetarian", "vegan", "meat"} else "none"
        _increment_counter(day_bucket["shares"]["diet_filters"], key)

    def _record_effective_diet_hints_locked(self, *, context: AnalyticsRequestContext | None, tool_name: str, args: dict[str, Any]) -> None:
        if tool_name == "get_menus_batch":
            requests = args.get("requests")
            if isinstance(requests, list):
                for item in requests:
                    if isinstance(item, dict):
                        self._record_effective_diet_hint_locked(context=context, filters=item)
            return
        self._record_effective_diet_hint_locked(context=context, filters=args)

    def _record_effective_diet_hint_locked(self, *, context: AnalyticsRequestContext | None, filters: dict[str, Any] | None) -> None:
        if context is None or context.request_key is None:
            return
        resolved = self._resolve_effective_diet_filter(filters)
        if resolved is None:
            return

        payload = self._state["request_diet_filters"].get(context.request_key)
        if not isinstance(payload, dict):
            payload = {"seen_at": _iso_now(), "diets": []}
            self._state["request_diet_filters"][context.request_key] = payload

        payload["seen_at"] = _iso_now()
        diets = payload.get("diets") if isinstance(payload.get("diets"), list) else []
        if resolved not in diets:
            diets.append(resolved)
        payload["diets"] = diets

    def _record_filter_leaderboard_locked(self, *, day_bucket: dict[str, Any], filters: dict[str, Any] | None, effective_diet: str | None = None) -> None:
        filters = filters or {}
        used_filter = False

        if effective_diet in {"vegetarian", "vegan", "meat"}:
            self._increment_leaderboard_locked(day_bucket=day_bucket, board="filters", key=f"diet:{effective_diet}", label=_normalize_label(effective_diet))
            used_filter = True

        price_category = filters.get("price_category")
        if isinstance(price_category, str) and price_category.strip():
            self._increment_leaderboard_locked(day_bucket=day_bucket, board="filters", key=f"price:{price_category}", label=_normalize_label(price_category))
            used_filter = True

        allergens = filters.get("allergens") or filters.get("exclude_allergens") or []
        if isinstance(allergens, list):
            for allergen in allergens:
                if isinstance(allergen, str) and allergen.strip():
                    key = allergen.strip().lower()
                    self._increment_leaderboard_locked(day_bucket=day_bucket, board="filters", key=f"allergen:{key}", label=_normalize_label(allergen))
                    used_filter = True

        if not used_filter:
            self._increment_leaderboard_locked(day_bucket=day_bucket, board="filters", key="none", label="No Filter")

    def _record_entities_from_tool_locked(self, *, context: AnalyticsRequestContext, tool_name: str, args: dict[str, Any], result: Any, now: datetime) -> None:
        if tool_name in {"get_canteen_info", "get_menu_for_date", "get_opening_hours_osm_for_canteen"}:
            canteen_id = args.get("canteen_id")
            if isinstance(canteen_id, int):
                self._record_canteen_locked(context=context, canteen_id=canteen_id, now=now)
            return

        if tool_name == "get_menus_batch":
            requests = args.get("requests")
            if isinstance(requests, list):
                for item in requests:
                    if isinstance(item, dict) and isinstance(item.get("canteen_id"), int):
                        self._record_canteen_locked(context=context, canteen_id=item["canteen_id"], now=now)
            return

        if tool_name == "request_canteen_directions":
            canteen_id = args.get("canteen_id")
            if isinstance(canteen_id, int):
                self._record_canteen_locked(context=context, canteen_id=canteen_id, now=now)
            return

        _ = result

    def _record_canteen_locked(self, *, context: AnalyticsRequestContext, canteen_id: int, now: datetime) -> None:
        canteen = self._get_canteen_metadata_locked(canteen_id)
        if canteen is None:
            return
        _ = context
        day_bucket = self._get_day_bucket_locked(_local_day_key(now))
        canteen_key = str(canteen_id)
        _add_unique(day_bucket["entities"]["canteens"], canteen_key)
        _add_unique(day_bucket["entities"]["cities"], canteen["city_key"])
        self._increment_leaderboard_locked(
            day_bucket=day_bucket,
            board="canteens",
            key=canteen_key,
            label=canteen["label"],
            extra={"city": canteen["city"], "id": canteen_id},
        )
        self._increment_leaderboard_locked(day_bucket=day_bucket, board="cities", key=canteen["city_key"], label=canteen["city"])

    def _get_canteen_metadata_locked(self, canteen_id: int) -> dict[str, Any] | None:
        cached = self._canteen_by_id.get(canteen_id)
        if cached is not None:
            return cached

        try:
            index = load_canteen_index()
        except Exception:
            return None

        canteen = next((item for item in index.canteens if int(item.id) == int(canteen_id)), None)
        if canteen is None:
            return None

        city_label = _normalize_label(canteen.city, fallback="Unknown City")
        payload = {
            "label": _normalize_label(canteen.name, fallback=f"Canteen {canteen_id}"),
            "city": city_label,
            "city_key": city_label.lower(),
        }
        self._canteen_by_id[canteen_id] = payload
        return payload

    def _get_day_bucket_locked(self, day_key: str) -> dict[str, Any]:
        bucket = self._state["daily"].get(day_key)
        if not isinstance(bucket, dict):
            bucket = _empty_day_bucket()
            self._state["daily"][day_key] = bucket
        return bucket

    def _get_day_and_hour_buckets_locked(self, moment: datetime) -> tuple[dict[str, Any], dict[str, Any]]:
        day_key, hour = _local_day_hour(moment)
        day_bucket = self._get_day_bucket_locked(day_key)
        hour_bucket = day_bucket["hours"].get(str(hour))
        if not isinstance(hour_bucket, dict):
            hour_bucket = _empty_hour_bucket()
            day_bucket["hours"][str(hour)] = hour_bucket
        return day_bucket, hour_bucket

    def _increment_leaderboard_locked(self, *, day_bucket: dict[str, Any], board: str, key: str, label: str, extra: dict[str, Any] | None = None) -> None:
        items = day_bucket["leaderboards"][board]
        payload = items.get(key)
        if not isinstance(payload, dict):
            payload = {"key": key, "label": label, "count": 0}
            items[key] = payload
        payload["label"] = label
        if extra:
            payload.update(extra)
        payload["count"] = int(payload.get("count", 0)) + 1

    def _build_period_day_keys(self, today: date) -> dict[str, list[str]]:
        today_days = _date_range(today, today)
        seven_day_start = today - timedelta(days=6)
        thirty_day_start = today - timedelta(days=29)
        year_start = date(today.year, 1, 1)

        daily_keys = sorted(self._state["daily"].keys())
        if daily_keys:
            total_start = date.fromisoformat(daily_keys[0])
            total_end = date.fromisoformat(daily_keys[-1])
            total_days = _date_range(total_start, total_end)
        else:
            total_days = []

        return {
            "today": today_days,
            "7d": _date_range(seven_day_start, today),
            "30d": _date_range(thirty_day_start, today),
            "ytd": _date_range(year_start, today),
            "total": total_days,
        }

    def _build_period_stats_locked(self, *, period_key: str, day_keys: list[str]) -> dict[str, Any]:
        aggregated = self._aggregate_period_locked(day_keys)
        return {
            "summary": {
                "active_users": len(aggregated["users"]),
                "messages": aggregated["metrics"]["messages_total"],
                "sessions": aggregated["metrics"]["sessions_total"],
                "tool_calls": aggregated["metrics"]["tool_calls_total"],
                "active_chats": len(aggregated["chats"]),
                "distinct_canteens": len(aggregated["canteens"]),
                "distinct_cities": len(aggregated["cities"]),
                "transcribe_requests": aggregated["metrics"]["transcribe_requests_total"],
                "shortcut_messages": aggregated["metrics"]["shortcut_message_turns_total"],
                "tool_success_rate": (
                    aggregated["metrics"]["tool_calls_success_total"] / aggregated["metrics"]["tool_calls_total"]
                    if aggregated["metrics"]["tool_calls_total"] > 0
                    else 0.0
                ),
                "average_messages_per_session": (
                    aggregated["metrics"]["messages_total"] / aggregated["metrics"]["sessions_total"]
                    if aggregated["metrics"]["sessions_total"] > 0
                    else 0.0
                ),
                "average_tool_calls_per_llm_turn": (
                    aggregated["metrics"]["tool_calls_total"] / aggregated["metrics"]["llm_interactions_total"]
                    if aggregated["metrics"]["llm_interactions_total"] > 0
                    else 0.0
                ),
            },
            "shares": {
                "interaction_types": [
                    {"id": "llm_chat", "label": "LLM Chat", "value": aggregated["metrics"]["llm_interactions_total"]},
                    {"id": "quick_lookup", "label": "Quick Lookup", "value": aggregated["metrics"]["quick_lookup_interactions_total"]},
                ],
                "message_origins": [
                    {"id": "typed", "label": "Typed", "value": aggregated["metrics"]["typed_message_turns_total"]},
                    {"id": "voice", "label": "Voice", "value": aggregated["metrics"]["voice_message_turns_total"]},
                    {"id": "shortcut", "label": "Shortcut", "value": aggregated["metrics"]["shortcut_message_turns_total"]},
                ],
                "diet_filters": [
                    {"id": "none", "label": "No Diet Filter", "value": aggregated["diet_filters"]["none"]},
                    {"id": "vegetarian", "label": "Vegetarian", "value": aggregated["diet_filters"]["vegetarian"]},
                    {"id": "vegan", "label": "Vegan", "value": aggregated["diet_filters"]["vegan"]},
                    {"id": "meat", "label": "Meat", "value": aggregated["diet_filters"]["meat"]},
                ],
            },
            "trend": self._build_trend_locked(period_key=period_key, day_keys=day_keys),
            "heatmap": self._build_heatmap_locked(day_keys),
            "leaderboards": {
                "cities": _top_entries(aggregated["leaderboards"]["cities"]),
                "canteens": _top_entries(aggregated["leaderboards"]["canteens"]),
                "tools": _top_entries(aggregated["leaderboards"]["tools"]),
                "filters": _top_entries(aggregated["leaderboards"]["filters"]),
            },
        }

    def _aggregate_period_locked(self, day_keys: list[str]) -> dict[str, Any]:
        metrics = _empty_metric_bucket()
        users: set[str] = set()
        chats: set[str] = set()
        canteens: set[str] = set()
        cities: set[str] = set()
        diet_filters = _empty_diet_share()
        leaderboards = {board: {} for board in _BOARD_NAMES}

        for day_key in day_keys:
            day_bucket = self._state["daily"].get(day_key)
            if not isinstance(day_bucket, dict):
                continue
            _sum_metrics(metrics, day_bucket["metrics"])
            users.update(day_bucket["entities"]["users"])
            chats.update(day_bucket["entities"]["chats"])
            canteens.update(day_bucket["entities"]["canteens"])
            cities.update(day_bucket["entities"]["cities"])
            for diet_name in _DIET_OPTIONS:
                diet_filters[diet_name] += int(day_bucket["shares"]["diet_filters"].get(diet_name, 0))
            for board in _BOARD_NAMES:
                _merge_leaderboard_counts(leaderboards[board], day_bucket["leaderboards"][board])

        return {
            "metrics": metrics,
            "users": users,
            "chats": chats,
            "canteens": canteens,
            "cities": cities,
            "diet_filters": diet_filters,
            "leaderboards": leaderboards,
        }

    def _build_trend_locked(self, *, period_key: str, day_keys: list[str]) -> dict[str, Any]:
        if period_key == "today":
            today_key = day_keys[0] if day_keys else _local_day_key(_utc_now())
            day_bucket = self._state["daily"].get(today_key) if isinstance(self._state["daily"].get(today_key), dict) else None
            points = []
            for hour in range(24):
                hour_bucket = day_bucket["hours"].get(str(hour)) if isinstance(day_bucket, dict) else None
                metrics = hour_bucket["metrics"] if isinstance(hour_bucket, dict) else _empty_metric_bucket()
                active_users = len(hour_bucket["users"]) if isinstance(hour_bucket, dict) else 0
                points.append(
                    {
                        "bucket_start": _bucket_start_iso(today_key, hour),
                        "active_users": active_users,
                        "messages": int(metrics.get("messages_total", 0)),
                        "llm_messages": int(metrics.get("llm_messages_total", 0)),
                        "quick_lookup_messages": int(metrics.get("quick_lookup_messages_total", 0)),
                        "interactions": int(metrics.get("interactions_total", 0)),
                        "sessions": int(metrics.get("sessions_total", 0)),
                        "shortcut_messages": int(metrics.get("shortcut_message_turns_total", 0)),
                        "tool_calls": int(metrics.get("tool_calls_total", 0)),
                        "transcribe_requests": int(metrics.get("transcribe_requests_total", 0)),
                    }
                )
            return {
                "granularity": "hour",
                "points": points,
            }

        points = []
        for day_key in day_keys:
            day_bucket = self._state["daily"].get(day_key)
            metrics = day_bucket["metrics"] if isinstance(day_bucket, dict) else _empty_metric_bucket()
            active_users = len(day_bucket["entities"]["users"]) if isinstance(day_bucket, dict) else 0
            points.append(
                {
                    "bucket_start": _bucket_start_iso(day_key),
                    "active_users": active_users,
                    "messages": int(metrics.get("messages_total", 0)),
                    "llm_messages": int(metrics.get("llm_messages_total", 0)),
                    "quick_lookup_messages": int(metrics.get("quick_lookup_messages_total", 0)),
                    "interactions": int(metrics.get("interactions_total", 0)),
                    "sessions": int(metrics.get("sessions_total", 0)),
                    "shortcut_messages": int(metrics.get("shortcut_message_turns_total", 0)),
                    "tool_calls": int(metrics.get("tool_calls_total", 0)),
                    "transcribe_requests": int(metrics.get("transcribe_requests_total", 0)),
                }
            )
        return {
            "granularity": "day",
            "points": points,
        }

    def _build_heatmap_locked(self, day_keys: list[str]) -> list[dict[str, int]]:
        matrix = {weekday: {hour: 0 for hour in range(24)} for weekday in range(7)}
        for day_key in day_keys:
            day_bucket = self._state["daily"].get(day_key)
            if not isinstance(day_bucket, dict):
                continue
            weekday = date.fromisoformat(day_key).weekday()
            for hour in range(24):
                hour_bucket = day_bucket["hours"].get(str(hour))
                if not isinstance(hour_bucket, dict):
                    continue
                matrix[weekday][hour] += int(hour_bucket["metrics"].get("interactions_total", 0))

        return [
            {
                "weekday": weekday,
                "hour": hour,
                "count": int(matrix[weekday][hour]),
            }
            for weekday in range(7)
            for hour in range(24)
        ]

    def _prune_dedupe_locked(self, now: datetime) -> None:
        cutoff = now - timedelta(days=_REQUEST_ID_RETENTION_DAYS)
        requests = self._state["dedupe"]["requests"]
        stale_request_keys = []
        for key, raw_value in requests.items():
            parsed = _parse_iso(raw_value)
            if parsed is None or parsed < cutoff:
                stale_request_keys.append(key)
        for key in stale_request_keys:
            requests.pop(key, None)

        request_diet_filters = self._state["request_diet_filters"]
        stale_hint_keys = []
        for key, payload in request_diet_filters.items():
            seen_at = _parse_iso(payload.get("seen_at")) if isinstance(payload, dict) else None
            if seen_at is None or seen_at < cutoff:
                stale_hint_keys.append(key)
        for key in stale_hint_keys:
            request_diet_filters.pop(key, None)


analytics_store = AnalyticsStore()
