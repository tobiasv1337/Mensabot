"""
OpenMensa SDK — errors
Author: Tobias Veselsky
Description: Custom exceptions used by the OpenMensa SDK.
"""

from typing import Any, Optional

class OpenMensaAPIError(Exception):
    """Raised when the OpenMensa API returns an error response (HTTP >= 400)."""

    def __init__(
        self,
        status_code: int,
        message: str,
        *,
        url: Optional[str] = None,
        response_body: Any = None,
    ) -> None:
        parts = [f"HTTP {status_code}", message]
        if url:
            parts.append(f"({url})")
        super().__init__(" ".join(parts))
        self.status_code = status_code
        self.url = url
        self.response_body = response_body
