from __future__ import annotations

from functools import lru_cache
from importlib.metadata import PackageNotFoundError, version

DEFAULT_PACKAGE_VERSION = "0.0.0"


@lru_cache(maxsize=1)
def get_package_version() -> str:
    try:
        return version("openmensa-sdk")
    except PackageNotFoundError:
        return DEFAULT_PACKAGE_VERSION


def build_user_agent(name: str) -> str:
    return f"{name}/{get_package_version()}"
