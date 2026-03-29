from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..models import UserFilters
from ..prompts import DIET_PREFERENCE_TO_FILTER, DIRECTIONS_TOOL_NAME

_MENU_TOOL_NAMES = frozenset({"get_menu_for_date", "get_menus_batch"})
_DIRECT_CANTEEN_TOOL_NAMES = frozenset({"get_canteen_info", "get_menu_for_date", "get_opening_hours_osm_for_canteen"})


def _normalize_scalar(value: Any) -> str | None:
    raw = getattr(value, "value", value)
    if raw is None:
        return None
    if isinstance(raw, str):
        normalized = raw.strip()
        return normalized or None
    return str(raw)


def _normalize_allergens(values: Any) -> tuple[str, ...]:
    if not isinstance(values, list):
        return ()
    normalized = []
    for value in values:
        scalar = _normalize_scalar(value)
        if scalar is not None:
            normalized.append(scalar.casefold())
    return tuple(sorted(dict.fromkeys(normalized)))


@dataclass(frozen=True, slots=True)
class ResolvedUserFilters:
    allowed_canteen_ids: tuple[int, ...] = ()
    diet_filter: str | None = None
    exclude_allergens: tuple[str, ...] = ()
    price_category: str | None = None

    @classmethod
    def from_user_filters(cls, user_filters: UserFilters | None) -> "ResolvedUserFilters":
        if user_filters is None:
            return cls()
        allowed_canteen_ids = tuple(dict.fromkeys(canteen.id for canteen in user_filters.canteens))
        mapped_diet_filter = DIET_PREFERENCE_TO_FILTER.get(user_filters.diet) if user_filters.diet else None
        exclude_allergens = tuple(sorted(dict.fromkeys(allergen.casefold() for allergen in user_filters.allergens if allergen and allergen.strip())))
        return cls(allowed_canteen_ids=allowed_canteen_ids, diet_filter=mapped_diet_filter, exclude_allergens=exclude_allergens, price_category=user_filters.price_category)

    def active_filters_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        if self.allowed_canteen_ids:
            payload["allowed_canteen_ids"] = list(self.allowed_canteen_ids)
        if self.diet_filter is not None:
            payload["diet_filter"] = self.diet_filter
        if self.exclude_allergens:
            payload["exclude_allergens"] = list(self.exclude_allergens)
        if self.price_category is not None:
            payload["price_category"] = self.price_category
        return payload

    def is_empty(self) -> bool:
        return not (self.allowed_canteen_ids or self.diet_filter or self.exclude_allergens or self.price_category)


def validate_tool_filters(*, tool_name: str, args: Any, resolved_filters: ResolvedUserFilters) -> dict[str, Any] | None:
    if resolved_filters.is_empty():
        return None
    if resolved_filters.allowed_canteen_ids and tool_name == "search_canteens":
        return _build_policy_error(
            error_code="active_canteen_filter_block",
            message=f"Active UI canteen selection already provides canteen IDs {list(resolved_filters.allowed_canteen_ids)}. Do not call search_canteens while selected canteens are active. Use only those IDs or ask the user to clear the active canteen filter in the app first.",
            resolved_filters=resolved_filters,
            conflicting_args=args,
            violations=[{"type": "search_blocked_by_selected_canteens", "allowed_canteen_ids": list(resolved_filters.allowed_canteen_ids)}],
        )
    if tool_name in _DIRECT_CANTEEN_TOOL_NAMES:
        canteen_id = _extract_canteen_id(args)
        if canteen_id is not None and resolved_filters.allowed_canteen_ids and canteen_id not in resolved_filters.allowed_canteen_ids:
            return _build_policy_error(
                error_code="active_filter_conflict",
                message=f"Active UI canteen selection allows only {list(resolved_filters.allowed_canteen_ids)}, but this tool call targets canteen_id={canteen_id}. Use only allowed canteens or ask the user to clear the active canteen filter in the app first.",
                resolved_filters=resolved_filters,
                conflicting_args=args,
                violations=[{"type": "disallowed_canteen_id", "canteen_id": canteen_id, "allowed_canteen_ids": list(resolved_filters.allowed_canteen_ids)}],
            )
    if tool_name == "get_menus_batch":
        return _validate_batch_menu_filters(args=args, resolved_filters=resolved_filters)
    if tool_name == "get_menu_for_date":
        return _validate_single_menu_filters(args=args, resolved_filters=resolved_filters)
    if tool_name == DIRECTIONS_TOOL_NAME:
        return _validate_directions_filters(args=args, resolved_filters=resolved_filters)
    return None


def _validate_single_menu_filters(*, args: Any, resolved_filters: ResolvedUserFilters) -> dict[str, Any] | None:
    if not isinstance(args, dict):
        return None
    canteen_violation = _validate_canteen_id(args=args, resolved_filters=resolved_filters)
    if canteen_violation is not None:
        return canteen_violation
    return _validate_menu_filter_args(args=args, resolved_filters=resolved_filters)


def _validate_batch_menu_filters(*, args: Any, resolved_filters: ResolvedUserFilters) -> dict[str, Any] | None:
    if not isinstance(args, dict):
        return None
    requests = args.get("requests")
    if not isinstance(requests, list):
        return None
    violations: list[dict[str, Any]] = []
    for index, request in enumerate(requests):
        if not isinstance(request, dict):
            continue
        canteen_id = _extract_canteen_id(request)
        if canteen_id is not None and resolved_filters.allowed_canteen_ids and canteen_id not in resolved_filters.allowed_canteen_ids:
            violations.append({"index": index, "type": "disallowed_canteen_id", "canteen_id": canteen_id, "allowed_canteen_ids": list(resolved_filters.allowed_canteen_ids)})
            continue
        violations.extend(_collect_menu_filter_violations(args=request, resolved_filters=resolved_filters, index=index))
    if not violations:
        return None
    error_code = "missing_active_filter" if all(violation["type"].startswith("missing_") for violation in violations) else "active_filter_conflict"
    return _build_policy_error(
        error_code=error_code,
        message="Active UI filters require every get_menus_batch request entry to use the selected canteens and explicitly repeat the active diet, allergen, and price filters. Fix the conflicting request entries or ask the user to clear the active filters in the app first.",
        resolved_filters=resolved_filters,
        conflicting_args=args,
        violations=violations,
    )


def _validate_directions_filters(*, args: Any, resolved_filters: ResolvedUserFilters) -> dict[str, Any] | None:
    if not isinstance(args, dict):
        return None
    canteen_id = _extract_canteen_id(args)
    lat = args.get("lat")
    lng = args.get("lng")
    if resolved_filters.allowed_canteen_ids and canteen_id is None and (lat is not None or lng is not None):
        return _build_policy_error(
            error_code="active_filter_conflict",
            message=f"Active UI canteen selection allows only {list(resolved_filters.allowed_canteen_ids)}. request_canteen_directions may not use raw lat/lng without an allowed canteen_id while a canteen filter is active.",
            resolved_filters=resolved_filters,
            conflicting_args=args,
            violations=[{"type": "directions_requires_allowed_canteen_id", "allowed_canteen_ids": list(resolved_filters.allowed_canteen_ids)}],
        )
    if canteen_id is None:
        return None
    return _validate_canteen_id(args=args, resolved_filters=resolved_filters)


def _validate_canteen_id(*, args: dict[str, Any], resolved_filters: ResolvedUserFilters) -> dict[str, Any] | None:
    canteen_id = _extract_canteen_id(args)
    if canteen_id is None or not resolved_filters.allowed_canteen_ids or canteen_id in resolved_filters.allowed_canteen_ids:
        return None
    return _build_policy_error(
        error_code="active_filter_conflict",
        message=f"Active UI canteen selection allows only {list(resolved_filters.allowed_canteen_ids)}, but this tool call targets canteen_id={canteen_id}. Use only allowed canteens or ask the user to clear the active canteen filter in the app first.",
        resolved_filters=resolved_filters,
        conflicting_args=args,
        violations=[{"type": "disallowed_canteen_id", "canteen_id": canteen_id, "allowed_canteen_ids": list(resolved_filters.allowed_canteen_ids)}],
    )


def _validate_menu_filter_args(*, args: dict[str, Any], resolved_filters: ResolvedUserFilters) -> dict[str, Any] | None:
    violations = _collect_menu_filter_violations(args=args, resolved_filters=resolved_filters)
    if not violations:
        return None
    error_code = "missing_active_filter" if all(violation["type"].startswith("missing_") for violation in violations) else "active_filter_conflict"
    return _build_policy_error(
        error_code=error_code,
        message="Active UI filters require this menu tool call to explicitly repeat the selected diet, allergen, and price filters. Fix the tool arguments or ask the user to clear the active filters in the app first.",
        resolved_filters=resolved_filters,
        conflicting_args=args,
        violations=violations,
    )


def _collect_menu_filter_violations(*, args: dict[str, Any], resolved_filters: ResolvedUserFilters, index: int | None = None) -> list[dict[str, Any]]:
    violations: list[dict[str, Any]] = []
    diet_filter = _normalize_scalar(args.get("diet_filter"))
    if resolved_filters.diet_filter is not None:
        if diet_filter is None:
            violations.append(_menu_violation("missing_diet_filter", "diet_filter", None, resolved_filters.diet_filter, index=index))
        elif diet_filter != resolved_filters.diet_filter:
            violations.append(_menu_violation("conflicting_diet_filter", "diet_filter", diet_filter, resolved_filters.diet_filter, index=index))
    exclude_allergens = _normalize_allergens(args.get("exclude_allergens"))
    if resolved_filters.exclude_allergens:
        if args.get("exclude_allergens") is None:
            violations.append(_menu_violation("missing_exclude_allergens", "exclude_allergens", None, list(resolved_filters.exclude_allergens), index=index))
        elif exclude_allergens != resolved_filters.exclude_allergens:
            violations.append(_menu_violation("conflicting_exclude_allergens", "exclude_allergens", list(exclude_allergens), list(resolved_filters.exclude_allergens), index=index))
    price_category = _normalize_scalar(args.get("price_category"))
    if resolved_filters.price_category is not None:
        if price_category is None:
            violations.append(_menu_violation("missing_price_category", "price_category", None, resolved_filters.price_category, index=index))
        elif price_category != resolved_filters.price_category:
            violations.append(_menu_violation("conflicting_price_category", "price_category", price_category, resolved_filters.price_category, index=index))
    return violations


def _menu_violation(violation_type: str, field: str, actual: Any, expected: Any, *, index: int | None) -> dict[str, Any]:
    violation = {"type": violation_type, "field": field, "actual": actual, "expected": expected}
    if index is not None:
        violation["index"] = index
    return violation


def _build_policy_error(*, error_code: str, message: str, resolved_filters: ResolvedUserFilters, conflicting_args: Any, violations: list[dict[str, Any]]) -> dict[str, Any]:
    return {"error": message, "error_code": error_code, "active_filters": resolved_filters.active_filters_payload(), "conflicting_args": conflicting_args, "violations": violations}


def _extract_canteen_id(args: Any) -> int | None:
    if not isinstance(args, dict):
        return None
    raw_canteen_id = args.get("canteen_id")
    if raw_canteen_id is None:
        return None
    try:
        return int(raw_canteen_id)
    except (TypeError, ValueError):
        return None
