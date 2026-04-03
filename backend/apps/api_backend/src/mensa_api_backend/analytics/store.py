from __future__ import annotations

import hashlib
import json
import os
from contextvars import ContextVar, Token
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from threading import Lock
from typing import Any, Literal

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
_STATE_VERSION = 2
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


def _utc_hour_key(moment: datetime) -> tuple[int, int]:
    shifted = moment.astimezone(UTC)
    return shifted.weekday(), shifted.hour


def _day_key(moment: datetime) -> str:
    return moment.astimezone(UTC).date().isoformat()


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


def _empty_day_bucket() -> dict[str, int]:
    return {
        "active_users_total": 0,
        "interactions_total": 0,
        "messages_total": 0,
        "llm_messages_total": 0,
        "quick_lookup_messages_total": 0,
        "llm_interactions_total": 0,
        "quick_lookup_interactions_total": 0,
        "sessions_total": 0,
        "shortcut_triggered_messages_total": 0,
        "tool_calls_total": 0,
        "transcribe_requests_total": 0,
    }


def _empty_state() -> dict[str, Any]:
    return {
        "version": _STATE_VERSION,
        "updated_at": _iso_now(),
        "totals": {
            "messages_total": 0,
            "user_messages_total": 0,
            "assistant_messages_total": 0,
            "llm_messages_total": 0,
            "quick_lookup_messages_total": 0,
            "llm_interactions_total": 0,
            "quick_lookup_interactions_total": 0,
            "sessions_total": 0,
            "tool_calls_total": 0,
            "tool_calls_success_total": 0,
            "tool_calls_failed_total": 0,
            "transcribe_requests_total": 0,
            "shortcut_triggered_messages_total": 0,
            "typed_message_turns_total": 0,
            "voice_message_turns_total": 0,
            "shortcut_message_turns_total": 0,
        },
        "daily": {},
        "heatmap": {str(day): {str(hour): 0 for hour in range(24)} for day in range(7)},
        "leaderboards": {
            "cities": {},
            "canteens": {},
            "tools": {},
            "filters": {},
        },
        "diet_filters": {
            "none": 0,
            "vegetarian": 0,
            "vegan": 0,
            "meat": 0,
        },
        "request_diet_filters": {},
        "daily_active_users": {},
        "users": {},
        "known_chats": {},
        "known_canteens": {},
        "known_cities": {},
        "dedupe": {
            "requests": {},
        },
    }


def _increment_counter(bucket: dict[str, Any], key: str, amount: int = 1) -> None:
    bucket[key] = int(bucket.get(key, 0)) + amount


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
                self._touch_user_locked(user_key, now)
                self._mark_user_active_for_day_locked(user_key, now)
                self._touch_chat_locked(chat_key, now)
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
            self._record_chat_diet_share_locked(context=context, filters=filters)
            self._record_filters_locked(filters)
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
            self._record_filters_locked(
                {
                    "diet": None,
                    "allergens": exclude_allergens or [],
                    "price_category": price_category,
                    "diet_filter": diet_filter,
                },
                record_diet_share=True,
            )
            if canteen_id is not None:
                self._record_canteen_locked(context, canteen_id)
            self._write_locked()

    def record_transcribe_request(self) -> None:
        with self._lock:
            self._ensure_loaded_locked()
            now = _utc_now()
            _increment_counter(self._state["totals"], "transcribe_requests_total")
            day_bucket = self._state["daily"].setdefault(_day_key(now), _empty_day_bucket())
            _increment_counter(day_bucket, "transcribe_requests_total")
            self._write_locked()

    def record_tool_call(self, *, context: AnalyticsRequestContext | None, tool_name: str, args: dict[str, Any] | None, ok: bool, result: Any) -> None:
        if context is None or not context.track_events:
            return
        with self._lock:
            self._ensure_loaded_locked()
            now = _utc_now()
            totals = self._state["totals"]
            _increment_counter(totals, "tool_calls_total")
            if ok:
                _increment_counter(totals, "tool_calls_success_total")
            else:
                _increment_counter(totals, "tool_calls_failed_total")

            day_bucket = self._state["daily"].setdefault(_day_key(now), _empty_day_bucket())
            _increment_counter(day_bucket, "tool_calls_total")

            self._increment_leaderboard_locked("tools", tool_name, _normalize_label(tool_name, fallback="Tool"))
            self._record_filters_from_tool_locked(context=context, tool_name=tool_name, args=args or {})
            self._record_entities_from_tool_locked(context=context, tool_name=tool_name, args=args or {}, result=result)
            self._write_locked()

    def get_public_stats(self, *, canteen_index_info: dict[str, int] | None = None) -> dict[str, Any]:
        with self._lock:
            self._ensure_loaded_locked()
            now = _utc_now()
            users = self._state["users"]
            active_cutoff = now - timedelta(days=30)
            active_users_30d = sum(
                1
                for payload in users.values()
                if (_parse_iso(payload.get("last_seen")) or datetime.min.replace(tzinfo=UTC)) >= active_cutoff
            )
            distinct_canteens_total = len(self._state["known_canteens"])
            distinct_cities_total = len(self._state["known_cities"])
            canteens_per_user = [
                len((payload.get("canteen_ids") or []))
                for payload in users.values()
            ]
            avg_canteens_per_user = (
                sum(canteens_per_user) / len(canteens_per_user)
                if canteens_per_user
                else 0.0
            )
            totals = self._state["totals"]
            tool_calls_total = int(totals.get("tool_calls_total", 0))
            sessions_total = int(totals.get("sessions_total", 0))
            tool_success_rate = (
                int(totals.get("tool_calls_success_total", 0)) / tool_calls_total
                if tool_calls_total > 0
                else 0.0
            )
            llm_interactions_total = max(int(totals.get("llm_interactions_total", 0)), 0)
            average_tools_per_llm_turn = tool_calls_total / llm_interactions_total if llm_interactions_total > 0 else 0.0
            average_messages_per_session = int(totals.get("messages_total", 0)) / sessions_total if sessions_total > 0 else 0.0
            diet_filter_share = self._build_diet_filter_share_locked()

            trend_points = []
            for date_key in sorted(self._state["daily"].keys()):
                bucket = self._state["daily"][date_key]
                trend_points.append(
                    {
                        "date": date_key,
                        "active_users": int(bucket.get("active_users_total", 0)),
                        "messages": int(bucket.get("messages_total", 0)),
                        "llm_messages": int(bucket.get("llm_messages_total", 0)),
                        "quick_lookup_messages": int(bucket.get("quick_lookup_messages_total", 0)),
                        "interactions": int(bucket.get("interactions_total", 0)),
                        "sessions": int(bucket.get("sessions_total", 0)),
                        "shortcut_messages": int(bucket.get("shortcut_triggered_messages_total", 0)),
                        "tool_calls": int(bucket.get("tool_calls_total", 0)),
                        "transcribe_requests": int(bucket.get("transcribe_requests_total", 0)),
                    }
                )

            heatmap = []
            for weekday in range(7):
                day_bucket = self._state["heatmap"].get(str(weekday), {})
                for hour in range(24):
                    heatmap.append(
                        {
                            "weekday": weekday,
                            "hour": hour,
                            "count": int(day_bucket.get(str(hour), 0)),
                        }
                    )

            return {
                "updated_at": self._state["updated_at"],
                "headline": {
                    "messages_total": int(totals.get("messages_total", 0)),
                    "users_total": len(users),
                    "active_users_30d": active_users_30d,
                    "sessions_total": sessions_total,
                    "chats_total": len(self._state["known_chats"]),
                    "tool_calls_total": tool_calls_total,
                    "transcribe_requests_total": int(totals.get("transcribe_requests_total", 0)),
                    "shortcut_triggered_messages_total": int(totals.get("shortcut_triggered_messages_total", 0)),
                    "distinct_canteens_total": distinct_canteens_total,
                    "distinct_cities_total": distinct_cities_total,
                    "average_canteens_per_user": avg_canteens_per_user,
                    "average_messages_per_session": average_messages_per_session,
                    "tool_success_rate": tool_success_rate,
                    "average_tools_per_llm_turn": average_tools_per_llm_turn,
                },
                "availability": {
                    "total_canteens": int((canteen_index_info or {}).get("total_canteens", 0)),
                    "total_cities": int((canteen_index_info or {}).get("total_cities", 0)),
                },
                "shares": {
                    "interaction_types": [
                        {
                            "id": "llm_chat",
                            "label": "LLM Chat",
                            "value": int(totals.get("llm_interactions_total", 0)),
                        },
                        {
                            "id": "quick_lookup",
                            "label": "Quick Lookup",
                            "value": int(totals.get("quick_lookup_interactions_total", 0)),
                        },
                    ],
                    "message_origins": [
                        {
                            "id": "typed",
                            "label": "Typed",
                            "value": int(totals.get("typed_message_turns_total", 0)),
                        },
                        {
                            "id": "voice",
                            "label": "Voice",
                            "value": int(totals.get("voice_message_turns_total", 0)),
                        },
                        {
                            "id": "shortcut",
                            "label": "Shortcut",
                            "value": int(totals.get("shortcut_message_turns_total", 0)),
                        },
                    ],
                    "diet_filters": diet_filter_share,
                },
                "trend": {
                    "points": trend_points,
                },
                "heatmap": heatmap,
                "leaderboards": {
                    "cities": self._top_entries_locked("cities"),
                    "canteens": self._top_entries_locked("canteens"),
                    "tools": self._top_entries_locked("tools"),
                    "filters": self._top_entries_locked("filters"),
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
            except Exception:
                self._state = _empty_state()
        else:
            self._state = _empty_state()
        self._normalize_state_locked()
        self._loaded = True

    def _normalize_state_locked(self) -> None:
        default_state = _empty_state()

        for key, value in default_state.items():
            if key not in self._state or not isinstance(self._state[key], type(value)):
                self._state[key] = value

        totals = self._state["totals"]
        for key, value in default_state["totals"].items():
            totals.setdefault(key, value)

        for board in default_state["leaderboards"]:
            existing = self._state["leaderboards"].get(board)
            self._state["leaderboards"][board] = existing if isinstance(existing, dict) else {}

        existing_diet_filters = self._state.get("diet_filters")
        self._state["diet_filters"] = existing_diet_filters if isinstance(existing_diet_filters, dict) else {}
        for key, value in default_state["diet_filters"].items():
            self._state["diet_filters"].setdefault(key, value)

        for key in ("users", "known_chats", "known_canteens", "known_cities", "daily_active_users", "request_diet_filters"):
            existing = self._state.get(key)
            self._state[key] = existing if isinstance(existing, dict) else {}

        state_version = int(self._state.get("version", 0) or 0)
        if state_version < _STATE_VERSION:
            self._state["diet_filters"] = default_state["diet_filters"].copy()
            self._state["request_diet_filters"] = {}
            self._state["version"] = _STATE_VERSION

        dedupe = self._state.get("dedupe")
        self._state["dedupe"] = dedupe if isinstance(dedupe, dict) else {}
        requests = self._state["dedupe"].get("requests")
        self._state["dedupe"]["requests"] = requests if isinstance(requests, dict) else {}

        computed_sessions_total = 0
        for user_key, payload in list(self._state["users"].items()):
            if not isinstance(payload, dict):
                payload = {}
                self._state["users"][user_key] = payload
            first_seen = payload.get("first_seen") if isinstance(payload.get("first_seen"), str) else self._state["updated_at"]
            last_seen = payload.get("last_seen") if isinstance(payload.get("last_seen"), str) else first_seen
            payload["first_seen"] = first_seen
            payload["last_seen"] = last_seen
            payload["chat_ids"] = payload.get("chat_ids") if isinstance(payload.get("chat_ids"), list) else []
            payload["canteen_ids"] = payload.get("canteen_ids") if isinstance(payload.get("canteen_ids"), list) else []
            payload["city_keys"] = payload.get("city_keys") if isinstance(payload.get("city_keys"), list) else []
            payload["last_activity_at"] = payload.get("last_activity_at") if isinstance(payload.get("last_activity_at"), str) else last_seen
            payload["current_session_started_at"] = payload.get("current_session_started_at") if isinstance(payload.get("current_session_started_at"), str) else payload["last_activity_at"]
            session_count = int(payload.get("session_count", 0) or 0)
            if session_count <= 0:
                session_count = 1
            payload["session_count"] = session_count
            computed_sessions_total += session_count

        totals["sessions_total"] = max(int(totals.get("sessions_total", 0)), computed_sessions_total)

        for date_key, bucket in list(self._state["daily"].items()):
            if not isinstance(bucket, dict):
                self._state["daily"][date_key] = _empty_day_bucket()
                continue
            for key, value in _empty_day_bucket().items():
                bucket.setdefault(key, value)

        normalized_heatmap = {str(day): {str(hour): 0 for hour in range(24)} for day in range(7)}
        existing_heatmap = self._state.get("heatmap")
        if isinstance(existing_heatmap, dict):
            for day in range(7):
                day_bucket = existing_heatmap.get(str(day))
                if not isinstance(day_bucket, dict):
                    continue
                for hour in range(24):
                    normalized_heatmap[str(day)][str(hour)] = int(day_bucket.get(str(hour), 0))
        self._state["heatmap"] = normalized_heatmap

    def _write_locked(self) -> None:
        if not self._state_path:
            raise RuntimeError("AnalyticsStore.configure() must be called before use.")
        self._state["updated_at"] = _iso_now()
        tmp_path = f"{self._state_path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as handle:
            json.dump(self._state, handle, ensure_ascii=True, indent=2, sort_keys=True)
        os.replace(tmp_path, self._state_path)

    def _touch_user_locked(self, user_key: str | None, now: datetime) -> None:
        if user_key is None:
            return
        users = self._state["users"]
        payload = users.get(user_key)
        if not isinstance(payload, dict):
            payload = {
                "first_seen": now.isoformat(),
                "last_seen": now.isoformat(),
                "last_activity_at": now.isoformat(),
                "current_session_started_at": now.isoformat(),
                "session_count": 0,
                "chat_ids": [],
                "canteen_ids": [],
                "city_keys": [],
            }
            users[user_key] = payload
        else:
            payload["last_seen"] = now.isoformat()
            payload["chat_ids"] = payload.get("chat_ids") if isinstance(payload.get("chat_ids"), list) else []
            payload["canteen_ids"] = payload.get("canteen_ids") if isinstance(payload.get("canteen_ids"), list) else []
            payload["city_keys"] = payload.get("city_keys") if isinstance(payload.get("city_keys"), list) else []
        self._touch_session_locked(payload, now)

    def _touch_session_locked(self, payload: dict[str, Any], now: datetime) -> None:
        last_activity = _parse_iso(payload.get("last_activity_at"))
        session_count = int(payload.get("session_count", 0) or 0)
        should_start_session = session_count <= 0 or last_activity is None or now - last_activity > _SESSION_IDLE_TIMEOUT

        if should_start_session:
            payload["current_session_started_at"] = now.isoformat()
            payload["session_count"] = max(session_count, 0) + 1
            _increment_counter(self._state["totals"], "sessions_total")
            day_bucket = self._state["daily"].setdefault(_day_key(now), _empty_day_bucket())
            _increment_counter(day_bucket, "sessions_total")

        payload["last_seen"] = now.isoformat()
        payload["last_activity_at"] = now.isoformat()

    def _touch_chat_locked(self, chat_key: str | None, now: datetime) -> None:
        if chat_key is None:
            return
        chats = self._state["known_chats"]
        payload = chats.get(chat_key)
        if not isinstance(payload, dict):
            chats[chat_key] = {
                "first_seen": now.isoformat(),
                "last_seen": now.isoformat(),
            }
            return
        payload["last_seen"] = now.isoformat()

    def _mark_user_active_for_day_locked(self, user_key: str | None, now: datetime) -> None:
        if user_key is None:
            return
        day_key = _day_key(now)
        active_users = self._state["daily_active_users"].setdefault(day_key, [])
        if not isinstance(active_users, list):
            active_users = []
            self._state["daily_active_users"][day_key] = active_users
        if user_key in active_users:
            return
        active_users.append(user_key)
        day_bucket = self._state["daily"].setdefault(day_key, _empty_day_bucket())
        _increment_counter(day_bucket, "active_users_total")

    def _record_message_batch_locked(self, *, context: AnalyticsRequestContext, interaction_kind: InteractionKind, messages_added: int, now: datetime) -> None:
        metric_prefix = _interaction_metric_prefix(interaction_kind)
        totals = self._state["totals"]
        day_bucket = self._state["daily"].setdefault(_day_key(now), _empty_day_bucket())
        _increment_counter(totals, "messages_total", messages_added)
        _increment_counter(totals, "user_messages_total")
        _increment_counter(totals, "assistant_messages_total")
        _increment_counter(totals, f"{metric_prefix}_messages_total", messages_added)
        _increment_counter(totals, f"{metric_prefix}_interactions_total")

        if context.message_origin is not None:
            _increment_counter(totals, f"{context.message_origin}_message_turns_total")
            if context.message_origin == "shortcut":
                _increment_counter(totals, "shortcut_triggered_messages_total", messages_added)
                _increment_counter(day_bucket, "shortcut_triggered_messages_total", messages_added)

        _increment_counter(day_bucket, "messages_total", messages_added)
        _increment_counter(day_bucket, f"{metric_prefix}_messages_total", messages_added)
        _increment_counter(day_bucket, "interactions_total")
        _increment_counter(day_bucket, f"{metric_prefix}_interactions_total")

        weekday, hour = _utc_hour_key(now)
        _increment_counter(self._state["heatmap"][str(weekday)], str(hour))

        if context.user_key is not None and context.chat_key is not None:
            user_payload = self._state["users"].get(context.user_key)
            if isinstance(user_payload, dict):
                chat_ids = user_payload.setdefault("chat_ids", [])
                if context.chat_key not in chat_ids:
                    chat_ids.append(context.chat_key)

    def _record_filters_locked(self, filters: dict[str, Any] | None, *, record_diet_share: bool = False) -> None:
        filters = filters or {}
        diet = filters.get("diet")
        diet_filter = filters.get("diet_filter")
        allergens = filters.get("allergens") or filters.get("exclude_allergens") or []
        price_category = filters.get("price_category")
        normalized_diet_filter = "meat" if diet_filter == "meat_only" else diet_filter

        if record_diet_share:
            if diet in {"vegetarian", "vegan", "meat"}:
                _increment_counter(self._state["diet_filters"], diet)
            elif normalized_diet_filter in {"vegetarian", "vegan", "meat"}:
                _increment_counter(self._state["diet_filters"], normalized_diet_filter)
            else:
                _increment_counter(self._state["diet_filters"], "none")

        used_filter = False
        if diet in {"vegetarian", "vegan", "meat"}:
            self._increment_leaderboard_locked("filters", f"diet:{diet}", _normalize_label(str(diet)))
            used_filter = True
        if diet_filter in {"vegetarian", "vegan", "meat_only"}:
            label = "Meat" if diet_filter == "meat_only" else _normalize_label(str(diet_filter))
            self._increment_leaderboard_locked("filters", f"diet:{diet_filter}", label)
            used_filter = True
        if isinstance(price_category, str) and price_category.strip():
            self._increment_leaderboard_locked("filters", f"price:{price_category}", _normalize_label(price_category))
            used_filter = True
        for allergen in allergens:
            if isinstance(allergen, str) and allergen.strip():
                key = allergen.strip().lower()
                self._increment_leaderboard_locked("filters", f"allergen:{key}", _normalize_label(allergen))
                used_filter = True
        if not used_filter:
            self._increment_leaderboard_locked("filters", "none", "No Filter")

    def _record_filters_from_tool_locked(self, *, context: AnalyticsRequestContext | None, tool_name: str, args: dict[str, Any]) -> None:
        if tool_name == "get_menus_batch":
            requests = args.get("requests")
            if isinstance(requests, list):
                for item in requests:
                    if isinstance(item, dict):
                        self._record_request_diet_hint_locked(context, item)
                        self._record_filters_locked(item)
            return
        self._record_request_diet_hint_locked(context, args)
        self._record_filters_locked(args)

    def _record_chat_diet_share_locked(self, *, context: AnalyticsRequestContext, filters: dict[str, Any] | None) -> None:
        resolved = self._resolve_diet_filter(filters)
        if resolved is None and context.request_key is not None:
            payload = self._state["request_diet_filters"].get(context.request_key)
            if isinstance(payload, dict):
                diets = payload.get("diets") if isinstance(payload.get("diets"), list) else []
                unique_diets = [diet for diet in diets if diet in {"vegetarian", "vegan", "meat"}]
                if len(unique_diets) == 1:
                    resolved = unique_diets[0]

        _increment_counter(self._state["diet_filters"], resolved or "none")

        if context.request_key is not None:
            self._state["request_diet_filters"].pop(context.request_key, None)

    def _record_request_diet_hint_locked(self, context: AnalyticsRequestContext | None, filters: dict[str, Any] | None) -> None:
        if context is None or context.request_key is None:
            return
        resolved = self._resolve_diet_filter(filters)
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

    def _resolve_diet_filter(self, filters: dict[str, Any] | None) -> str | None:
        filters = filters or {}
        diet = filters.get("diet")
        diet_filter = filters.get("diet_filter")
        normalized_diet_filter = "meat" if diet_filter == "meat_only" else diet_filter

        if diet in {"vegetarian", "vegan", "meat"}:
            return str(diet)
        if normalized_diet_filter in {"vegetarian", "vegan", "meat"}:
            return str(normalized_diet_filter)
        return None

    def _record_entities_from_tool_locked(self, *, context: AnalyticsRequestContext, tool_name: str, args: dict[str, Any], result: Any) -> None:
        if tool_name in {"get_canteen_info", "get_menu_for_date", "get_opening_hours_osm_for_canteen"}:
            canteen_id = args.get("canteen_id")
            if isinstance(canteen_id, int):
                self._record_canteen_locked(context, canteen_id)
            return

        if tool_name == "get_menus_batch":
            requests = args.get("requests")
            if isinstance(requests, list):
                for item in requests:
                    if isinstance(item, dict) and isinstance(item.get("canteen_id"), int):
                        self._record_canteen_locked(context, item["canteen_id"])
            return

        if tool_name == "request_canteen_directions":
            canteen_id = args.get("canteen_id")
            if isinstance(canteen_id, int):
                self._record_canteen_locked(context, canteen_id)
            return

        # Intentionally do not treat generic search results as concrete exploration.
        _ = result

    def _record_canteen_locked(self, context: AnalyticsRequestContext, canteen_id: int) -> None:
        canteen = self._get_canteen_metadata_locked(canteen_id)
        if canteen is None:
            return
        canteen_key = str(canteen_id)
        self._state["known_canteens"][canteen_key] = {
            "id": canteen_id,
            "label": canteen["label"],
            "city": canteen["city"],
        }
        self._increment_leaderboard_locked("canteens", canteen_key, canteen["label"], extra={"city": canteen["city"], "id": canteen_id})

        city_key = canteen["city_key"]
        self._state["known_cities"][city_key] = {"label": canteen["city"]}
        self._increment_leaderboard_locked("cities", city_key, canteen["city"])

        if context.user_key is not None:
            payload = self._state["users"].get(context.user_key)
            if isinstance(payload, dict):
                canteen_ids = payload.setdefault("canteen_ids", [])
                if canteen_key not in canteen_ids:
                    canteen_ids.append(canteen_key)
                city_keys = payload.setdefault("city_keys", [])
                if city_key not in city_keys:
                    city_keys.append(city_key)

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

    def _increment_leaderboard_locked(self, board: str, key: str, label: str, *, extra: dict[str, Any] | None = None) -> None:
        items = self._state["leaderboards"][board]
        payload = items.get(key)
        if not isinstance(payload, dict):
            payload = {"key": key, "label": label, "count": 0}
            if extra:
                payload.update(extra)
            items[key] = payload
        payload["label"] = label
        if extra:
            payload.update(extra)
        payload["count"] = int(payload.get("count", 0)) + 1

    def _top_entries_locked(self, board: str) -> list[dict[str, Any]]:
        items = self._state["leaderboards"][board].values()
        sorted_items = sorted(
            (item for item in items if isinstance(item, dict)),
            key=lambda item: (-int(item.get("count", 0)), str(item.get("label", ""))),
        )
        return sorted_items[:_TOP_LIMIT]

    def _build_diet_filter_share_locked(self) -> list[dict[str, Any]]:
        diet_filters = self._state["diet_filters"]

        return [
            {"id": "none", "label": "No Diet Filter", "value": int(diet_filters.get("none", 0))},
            {"id": "vegetarian", "label": "Vegetarian", "value": int(diet_filters.get("vegetarian", 0))},
            {"id": "vegan", "label": "Vegan", "value": int(diet_filters.get("vegan", 0))},
            {"id": "meat", "label": "Meat", "value": int(diet_filters.get("meat", 0))},
        ]

    def _prune_dedupe_locked(self, now: datetime) -> None:
        cutoff = now - timedelta(days=_REQUEST_ID_RETENTION_DAYS)
        requests = self._state["dedupe"]["requests"]
        stale_keys = []
        for key, raw_value in requests.items():
            parsed = _parse_iso(raw_value)
            if parsed is None or parsed < cutoff:
                stale_keys.append(key)
        for key in stale_keys:
            requests.pop(key, None)

        request_diet_filters = self._state["request_diet_filters"]
        stale_diet_keys = []
        for key, payload in request_diet_filters.items():
            seen_at = _parse_iso(payload.get("seen_at")) if isinstance(payload, dict) else None
            if seen_at is None or seen_at < cutoff:
                stale_diet_keys.append(key)
        for key in stale_diet_keys:
            request_diet_filters.pop(key, None)


analytics_store = AnalyticsStore()
