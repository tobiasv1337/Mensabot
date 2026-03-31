from __future__ import annotations

import asyncio
import logging
import re
import time
from email.utils import parsedate_to_datetime
from urllib.parse import urlsplit, urlunsplit

import anyio
import httpx

from ..cache import shared_cache
from ..cache_keys import overpass_query_key
from ..metrics import metrics
from .queries import overpass_query_element
from .scoring import OSMRef

logger = logging.getLogger("mensabot_backend_core.osm")

_OVERPASS_SLOT_WAIT_RE = re.compile(r"Slot available after: .*?, in (\d+) seconds\.?", re.IGNORECASE)
_OVERPASS_SLOTS_AVAILABLE_NOW_RE = re.compile(r"\b\d+\s+slots?\s+available\s+now\b", re.IGNORECASE)


class OverpassClient:
    MAX_RETRIES = 10
    INITIAL_BACKOFF_S = 1.0
    MAX_BACKOFF_S = 16.0
    MAX_RATE_LIMIT_WAIT_S = 120.0
    BACKOFF_MULTIPLIER = 2.0

    def __init__(self, *, overpass_url: str, overpass_status_url: str | None, user_agent: str, timeout_s: float, status_timeout_s: float, cache_ttl_s: int, max_concurrency: int) -> None:
        self.overpass_url = overpass_url
        self.overpass_status_url = overpass_status_url or self._derive_status_url(overpass_url)
        self.user_agent = user_agent
        self.timeout_s = timeout_s
        self.status_timeout_s = status_timeout_s
        self.cache_ttl_s = cache_ttl_s
        self._overpass_semaphore = asyncio.Semaphore(max(1, max_concurrency))
        self._cooldown_lock = asyncio.Lock()
        self._cooldown_until_monotonic = 0.0
        self._inflight_lock = asyncio.Lock()
        self._inflight_queries: dict[str, asyncio.Task[dict[str, object]]] = {}

    @staticmethod
    def _derive_status_url(overpass_url: str) -> str | None:
        parts = urlsplit(overpass_url)
        path = parts.path.rstrip("/")
        if not path.endswith("/interpreter"):
            return None
        return urlunsplit((parts.scheme, parts.netloc, f"{path[:-len('/interpreter')]}/status", "", ""))

    @staticmethod
    def _parse_retry_after_seconds(raw: str | None) -> float | None:
        if not raw:
            return None
        try:
            return max(0.0, float(raw))
        except ValueError:
            pass
        try:
            return max(0.0, parsedate_to_datetime(raw).timestamp() - time.time())
        except (TypeError, ValueError, IndexError, OverflowError):
            return None


    @staticmethod
    def _parse_status_wait_seconds(status_text: str) -> float | None:
        waits = [int(match.group(1)) for match in _OVERPASS_SLOT_WAIT_RE.finditer(status_text or "")]
        if waits:
            return float(min(waits))
        if _OVERPASS_SLOTS_AVAILABLE_NOW_RE.search(status_text or ""):
            return 0.0
        return None

    async def _wait_for_shared_cooldown(self) -> None:
        while True:
            async with self._cooldown_lock:
                remaining_s = self._cooldown_until_monotonic - time.monotonic()
            if remaining_s <= 0:
                return
            logger.info(f"Overpass rate limit cooldown active, waiting {remaining_s:.1f}s")
            await anyio.sleep(remaining_s)

    async def _extend_shared_cooldown(self, wait_s: float) -> None:
        if wait_s <= 0:
            return
        capped_wait_s = min(self.MAX_RATE_LIMIT_WAIT_S, wait_s)
        async with self._cooldown_lock:
            self._cooldown_until_monotonic = max(self._cooldown_until_monotonic, time.monotonic() + capped_wait_s)

    async def _read_status_wait_seconds(self, client: httpx.AsyncClient) -> float | None:
        if not self.overpass_status_url:
            return None
        try:
            response = await client.get(self.overpass_status_url, timeout=self.status_timeout_s)
            response.raise_for_status()
            wait_s = self._parse_status_wait_seconds(response.text)
            if wait_s is not None:
                metrics.inc("overpass.http.status_hint_total")
            return wait_s
        except httpx.HTTPError as exc:
            logger.debug(f"Overpass status lookup failed: {type(exc).__name__}: {exc}")
            return None

    async def _compute_rate_limit_wait_seconds(self, *, client: httpx.AsyncClient, response: httpx.Response, fallback_s: float) -> tuple[float, str]:
        retry_after_s = self._parse_retry_after_seconds(response.headers.get("Retry-After"))
        if retry_after_s is not None:
            return min(self.MAX_RATE_LIMIT_WAIT_S, max(fallback_s, retry_after_s)), "Retry-After"
        status_wait_s = await self._read_status_wait_seconds(client)
        if status_wait_s is not None:
            return min(self.MAX_RATE_LIMIT_WAIT_S, max(fallback_s, status_wait_s)), "status endpoint"
        return min(self.MAX_RATE_LIMIT_WAIT_S, fallback_s), "exponential backoff"

    async def _post_with_retry(self, query: str) -> dict[str, object]:
        backoff_s = self.INITIAL_BACKOFF_S
        async with httpx.AsyncClient(timeout=self.timeout_s, headers={"User-Agent": self.user_agent}) as client:
            for attempt in range(1, self.MAX_RETRIES + 1):
                try:
                    retry_wait_s: float | None = None
                    retry_reason: str | None = None
                    await self._wait_for_shared_cooldown()
                    async with self._overpass_semaphore:
                        await self._wait_for_shared_cooldown()
                        logger.debug(f"Overpass request attempt {attempt}/{self.MAX_RETRIES}")
                        metrics.inc("overpass.http.attempts_total")
                        response = await client.post(self.overpass_url, content=query.encode("utf-8"))
                        metrics.inc("overpass.http.responses_total")
                        metrics.inc_labeled("overpass.http.status_total", str(response.status_code))
                        if response.status_code == 429:
                            metrics.inc("overpass.http.rate_limited_total")
                            retry_wait_s, retry_reason = await self._compute_rate_limit_wait_seconds(client=client, response=response, fallback_s=backoff_s)
                            await self._extend_shared_cooldown(retry_wait_s)
                            if attempt >= self.MAX_RETRIES:
                                raise RuntimeError(f"Overpass rate limited (429); suggested wait {retry_wait_s:.1f}s ({retry_reason}).")
                        elif response.status_code >= 500:
                            metrics.inc("overpass.http.server_error_total")
                            if attempt >= self.MAX_RETRIES:
                                raise RuntimeError(f"Overpass server error {response.status_code} after {self.MAX_RETRIES} attempts.")
                            retry_wait_s = backoff_s
                            retry_reason = "server error"
                        else:
                            response.raise_for_status()

                    if retry_wait_s is not None:
                        if response.status_code == 429:
                            logger.info(f"Overpass rate limited (429; {retry_reason}), retrying in {retry_wait_s:.1f}s")
                        else:
                            logger.warning(f"Overpass {retry_reason or 'retry'} ({response.status_code}), retrying in {retry_wait_s:.1f}s")
                        metrics.inc("overpass.http.retries_total")
                        await anyio.sleep(retry_wait_s)
                        backoff_s = min(self.MAX_BACKOFF_S, backoff_s * self.BACKOFF_MULTIPLIER)
                        continue

                    try:
                        data = response.json()
                    except ValueError as exc:
                        metrics.inc("overpass.http.invalid_json_total")
                        raise RuntimeError(f"Overpass returned invalid JSON: {exc}") from exc
                    if not isinstance(data, dict):
                        metrics.inc("overpass.http.invalid_json_total")
                        raise RuntimeError("Overpass returned non-object JSON.")
                    logger.debug("Overpass request successful")
                    metrics.inc("overpass.http.success_total")
                    return data
                except RuntimeError as exc:
                    if "Overpass rate limited (429)" not in str(exc) and "Overpass server error" not in str(exc):
                        raise
                    logger.error(str(exc))
                    raise
                except httpx.TimeoutException:
                    metrics.inc("overpass.http.timeout_total")
                    if attempt < self.MAX_RETRIES:
                        logger.warning(f"Overpass timeout, retrying in {backoff_s}s (attempt {attempt}/{self.MAX_RETRIES})")
                        metrics.inc("overpass.http.retries_total")
                        await anyio.sleep(backoff_s)
                        backoff_s = min(self.MAX_BACKOFF_S, backoff_s * self.BACKOFF_MULTIPLIER)
                        continue
                    logger.error(f"Overpass timeout after {self.MAX_RETRIES} attempts")
                    raise RuntimeError(f"Overpass API timeout after {self.MAX_RETRIES} attempts")
                except httpx.ConnectError as exc:
                    metrics.inc("overpass.http.connect_error_total")
                    if attempt < self.MAX_RETRIES:
                        logger.warning(f"Overpass connection error, retrying in {backoff_s}s (attempt {attempt}/{self.MAX_RETRIES})")
                        metrics.inc("overpass.http.retries_total")
                        await anyio.sleep(backoff_s)
                        backoff_s = min(self.MAX_BACKOFF_S, backoff_s * self.BACKOFF_MULTIPLIER)
                        continue
                    logger.error(f"Overpass connection failed after {self.MAX_RETRIES} attempts")
                    raise RuntimeError(f"Could not connect to Overpass API after {self.MAX_RETRIES} attempts: {exc}") from exc
                except httpx.HTTPStatusError as exc:
                    status_code = exc.response.status_code
                    logger.error(f"Overpass HTTP error: {status_code}")
                    metrics.inc("overpass.http.http_error_total")
                    if status_code == 400:
                        raise RuntimeError("Overpass query error (400): Check query syntax") from exc
                    if status_code == 403:
                        raise RuntimeError("Overpass access denied (403): Check API credentials/access") from exc
                    if status_code == 404:
                        raise RuntimeError("Overpass endpoint not found (404): Check Overpass URL configuration") from exc
                    raise RuntimeError(f"Overpass HTTP error {status_code}: {exc}") from exc
                except Exception as exc:
                    logger.error(f"Unexpected Overpass error: {type(exc).__name__}: {exc}")
                    metrics.inc_labeled("overpass.http.unexpected_error_total", type(exc).__name__)
                    raise RuntimeError(f"Unexpected Overpass error: {type(exc).__name__}: {exc}") from exc
        raise RuntimeError(f"Overpass request failed after {self.MAX_RETRIES} attempts")

    async def post(self, query: str) -> dict[str, object]:
        cache_key = overpass_query_key(query)
        cached = shared_cache.get(cache_key)
        if cached is not None:
            logger.debug("Overpass cache hit")
            return cached
        owner = False
        async with self._inflight_lock:
            cached = shared_cache.get(cache_key)
            if cached is not None:
                logger.debug("Overpass cache hit")
                return cached
            task = self._inflight_queries.get(cache_key)
            if task is None:
                task = asyncio.create_task(self._post_with_retry(query))
                self._inflight_queries[cache_key] = task
                owner = True
            else:
                logger.debug("Overpass in-flight query hit")
        try:
            data = await task
        finally:
            if owner:
                async with self._inflight_lock:
                    current = self._inflight_queries.get(cache_key)
                    if current is task:
                        self._inflight_queries.pop(cache_key, None)
        if owner:
            shared_cache.set(cache_key, data, ttl_s=self.cache_ttl_s)
        return data

    async def fetch_element(self, ref: OSMRef) -> dict[str, object] | None:
        data = await self.post(overpass_query_element(ref))
        elements = data.get("elements") or []
        return elements[0] if elements else None
