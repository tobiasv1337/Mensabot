"""
OpenMensa SDK — client
Author: Tobias Veselsky
Description: Client for OpenMensa HTTP API v2 (sync, requests-based).
"""

from __future__ import annotations
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple, Union
import requests
import datetime as dt

from .errors import OpenMensaAPIError
from .models import Canteen, Day, Meal
from .utils import _parse_date_str, _parse_next_page_from_link, _clean_params
from mensabot_common.version import build_user_agent



DEFAULT_API_URL = "https://openmensa.org/api/v2"

class OpenMensaClient:
    """
    Client for the OpenMensa API v2.

    Typical usage:

        with OpenMensaClient() as client:
            canteens, next_page = client.list_canteens(per_page=20)
            meals_today = client.list_meals(canteen_id=2019, date="2025-10-29")

    Features:
    - Centralize all HTTP in one place (_request)
    - Return structured dataclasses (Canteen, Day, Meal)
    - Provide stable .to_dict() for MCP / LLM usage
    - Expose pagination info so the caller can continue if needed
    """

    def __init__(
        self,
        *,
        base_url: str = DEFAULT_API_URL,
        session: Optional[requests.Session] = None,
        timeout: float = 10.0,
        user_agent: str = build_user_agent("openmensa-sdk"),
        extra_headers: Optional[Mapping[str, str]] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

        self._session_provided = session is not None
        self._session = session or requests.Session()

        # default headers
        self._session.headers.setdefault("Accept", "application/json")
        self._session.headers.setdefault("User-Agent", user_agent)
        if extra_headers:
            self._session.headers.update(extra_headers)

    def close(self) -> None:
        """Close underlying session if this client created it."""
        if not self._session_provided:
            self._session.close()

    def __enter__(self) -> OpenMensaClient:
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    # ---- internal HTTP helper ----------------------------------------

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Mapping[str, Any]] = None,
    ) -> Tuple[Any, Mapping[str, str]]:
        """
        Perform an HTTP request and return (decoded_json, headers).
        Raises OpenMensaAPIError if the request fails.
        """
        url = f"{self.base_url}/{path.lstrip('/')}"
        response = self._session.request(
            method=method.upper(),
            url=url,
            params=_clean_params(params or {}),
            timeout=self.timeout,
        )

        if response.status_code >= 400:
            self._raise_api_error(response, url)

        if not response.content:
            return None, response.headers

        try:
            data = response.json()
        except ValueError as exc:
            raise OpenMensaAPIError(
                response.status_code,
                "Failed to decode JSON response",
                url=url,
                response_body=response.text,
            ) from exc

        return data, response.headers

    def _raise_api_error(self, response: requests.Response, url: str) -> None:
        """
        Convert an HTTP error response to OpenMensaAPIError.
        """
        body: Any
        try:
            body = response.json()
        except ValueError:
            body = response.text or None

        if isinstance(body, Mapping):
            message = str(body.get("message") or response.reason or "Unknown error")
        else:
            message = response.reason or "Unknown error"

        raise OpenMensaAPIError(
            response.status_code,
            message,
            url=url,
            response_body=body,
        )

    # ---- public API: canteens ----------------------------------------

    def list_canteens(
        self,
        *,
        near_lat: Optional[float] = None,
        near_lng: Optional[float] = None,
        near_dist: Optional[float] = None,
        ids: Optional[Sequence[int]] = None,
        has_coordinates: Optional[bool] = None,
        per_page: Optional[int] = None,
        page: Optional[int] = None,
    ) -> Tuple[List[Canteen], Optional[int]]:
        """
        Return a (possibly paginated) list of canteens.
        Returns (canteens, next_page_number_or_None).

        Args:
            near_lat/near_lng[/near_dist]:
                Filter by location. OpenMensa expects near[lat], near[lng], near[dist] (km).
            ids:
                Filter by comma-separated list of canteen IDs.
            has_coordinates:
                Only return canteens that have coordinates.
            per_page/page:
                Pagination parameters (OpenMensa style: per_page, page).
        """
        params: Dict[str, Any] = {}

        if near_lat is not None and near_lng is not None:
            params["near[lat]"] = f"{near_lat:.6f}"
            params["near[lng]"] = f"{near_lng:.6f}"
            if near_dist is not None:
                params["near[dist]"] = str(float(near_dist))
        elif near_dist is not None:
            raise ValueError("near_dist requires both near_lat and near_lng")

        if ids:
            params["ids"] = ",".join(str(int(i)) for i in ids)

        if has_coordinates is not None:
            params["hasCoordinates"] = "true" if has_coordinates else "false"

        if per_page is not None:
            params["per_page"] = int(per_page)
        if page is not None:
            params["page"] = int(page)

        payload, headers = self._request("GET", "canteens", params=params)

        canteens = [Canteen.from_api(item) for item in (payload or [])]
        next_page = _parse_next_page_from_link(headers.get("Link"))
        return canteens, next_page

    def iter_canteens(
        self,
        *,
        near_lat: Optional[float] = None,
        near_lng: Optional[float] = None,
        near_dist: Optional[float] = None,
        ids: Optional[Sequence[int]] = None,
        has_coordinates: Optional[bool] = None,
        per_page: int = 50,
        start_page: int = 1,
        max_pages: Optional[int] = None,
    ) -> Iterable[Canteen]:
        """
        Convenience generator that walks pagination for you.
        Yields Canteen objects across all pages (or up to max_pages).
        """
        page = start_page
        pages_seen = 0

        while True:
            if max_pages is not None and pages_seen >= max_pages:
                break

            items, next_page = self.list_canteens(
                near_lat=near_lat,
                near_lng=near_lng,
                near_dist=near_dist,
                ids=ids,
                has_coordinates=has_coordinates,
                per_page=per_page,
                page=page,
            )
            for c in items:
                yield c

            pages_seen += 1
            if not next_page:
                break
            page = next_page

    def get_canteen(self, canteen_id: int) -> Canteen:
        """Return details for a single canteen by ID."""
        payload, _ = self._request("GET", f"canteens/{int(canteen_id)}")
        return Canteen.from_api(payload)

    # ---- public API: days --------------------------------------------

    def list_days(
        self,
        canteen_id: int,
        *,
        start: Optional[Union[str, dt.date]] = None,
        per_page: Optional[int] = None,
        page: Optional[int] = None,
    ) -> Tuple[List[Day], Optional[int]]:
        """
        List availability information (open/closed/message) per date
        for a given canteen. Returns (days, next_page).
        """
        params: Dict[str, Any] = {}
        if start is not None:
            params["start"] = _parse_date_str(start)
        if per_page is not None:
            params["per_page"] = int(per_page)
        if page is not None:
            params["page"] = int(page)

        payload, headers = self._request(
            "GET",
            f"canteens/{int(canteen_id)}/days",
            params=params,
        )

        days = [Day.from_api(item) for item in (payload or [])]
        next_page = _parse_next_page_from_link(headers.get("Link"))
        return days, next_page

    def get_day(
        self,
        canteen_id: int,
        date: Union[str, dt.date],
    ) -> Day:
        """
        Get availability info for a specific date in one canteen.
        If the API returns 404 (no info for that date yet),
        this will currently raise OpenMensaAPIError with status_code 404.
        """
        day_str = _parse_date_str(date)
        payload, _ = self._request(
            "GET",
            f"canteens/{int(canteen_id)}/days/{day_str}",
        )
        return Day.from_api(payload)

    # ---- public API: meals -------------------------------------------

    def list_meals(
        self,
        canteen_id: int,
        date: Union[str, dt.date],
    ) -> List[Meal]:
        """
        List meals for a canteen on a given date.
        Note: Some canteens will 404 here if they haven't published data yet.
        That case will raise OpenMensaAPIError(status_code=404).
        """
        day_str = _parse_date_str(date)
        payload, _ = self._request(
            "GET",
            f"canteens/{int(canteen_id)}/days/{day_str}/meals",
        )
        return [Meal.from_api(item) for item in (payload or [])]

    def get_meal(
        self,
        canteen_id: int,
        date: Union[str, dt.date],
        meal_id: int,
    ) -> Meal:
        """
        Get a specific meal by ID for a given date in a canteen.
        Also 404s if not available yet.
        """
        day_str = _parse_date_str(date)
        payload, _ = self._request(
            "GET",
            f"canteens/{int(canteen_id)}/days/{day_str}/meals/{int(meal_id)}",
        )
        return Meal.from_api(payload)
