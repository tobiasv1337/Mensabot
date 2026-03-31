import re
from urllib.parse import urlparse

import requests
from openmensa_sdk import OpenMensaClient

from .metrics import metrics
from .settings import settings

_OPENMENSA_ID_RE = re.compile(r"/\d+")
_OPENMENSA_DATE_RE = re.compile(r"/\d{4}-\d{2}-\d{2}")


def _normalize_openmensa_path(url: str) -> str:
    try:
        path = urlparse(url).path
    except Exception:
        return "<unknown>"
    path = _OPENMENSA_DATE_RE.sub("/{date}", path)
    path = _OPENMENSA_ID_RE.sub("/{id}", path)
    return path or "<unknown>"


def make_openmensa_client() -> OpenMensaClient:
    client = OpenMensaClient(base_url=settings.openmensa_base_url, timeout=settings.openmensa_timeout, user_agent=settings.openmensa_user_agent)
    sess = getattr(client, "_session", None)
    if isinstance(sess, requests.Session):
        original_request = sess.request

        def instrumented_request(method, url, *args, **kwargs):  # type: ignore[no-untyped-def]
            metrics.inc("openmensa.http.requests_total")
            metrics.inc_labeled("openmensa.http.method_total", str(method).upper())
            try:
                resp = original_request(method, url, *args, **kwargs)
            except requests.RequestException as exc:
                metrics.inc("openmensa.http.errors_total")
                metrics.inc_labeled("openmensa.http.error_type_total", type(exc).__name__)
                raise
            metrics.inc("openmensa.http.responses_total")
            metrics.inc_labeled("openmensa.http.status_total", str(getattr(resp, "status_code", "unknown")))
            metrics.inc_labeled("openmensa.http.path_total", _normalize_openmensa_path(getattr(resp, "url", str(url))))
            return resp

        sess.request = instrumented_request  # type: ignore[method-assign]
    return client
