from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

DEFAULT_PROJECT_VERSION = "0.0.0"


@lru_cache(maxsize=1)
def read_project_version() -> str:
    env_version = os.getenv("MENSABOT_VERSION", "").strip()
    if env_version:
        return env_version

    for parent in Path(__file__).resolve().parents:
        version_file = parent / "VERSION"
        if not version_file.is_file():
            continue
        try:
            version = version_file.read_text(encoding="utf-8").strip()
        except OSError:
            return DEFAULT_PROJECT_VERSION
        return version or DEFAULT_PROJECT_VERSION

    return DEFAULT_PROJECT_VERSION


PROJECT_VERSION = read_project_version()


def build_user_agent(name: str) -> str:
    return f"{name}/{PROJECT_VERSION}"
