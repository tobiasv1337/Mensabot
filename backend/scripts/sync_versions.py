from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()


def replace_or_fail(path: Path, pattern: str, replacement: str, *, count: int = 1) -> None:
    text = path.read_text(encoding="utf-8")
    updated, replacements = re.subn(pattern, replacement, text, count=count, flags=re.MULTILINE)
    if replacements != count:
        raise RuntimeError(f"Expected {count} replacement(s) in {path}, got {replacements}.")
    if updated != text:
        path.write_text(updated, encoding="utf-8")


def sync_pyproject_versions() -> None:
    for rel_path in [
        "backend/apps/api_backend/pyproject.toml",
        "backend/apps/mcp-server/pyproject.toml",
        "backend/apps/stt_server/pyproject.toml",
        "backend/libs/mensabot-backend-core/pyproject.toml",
        "backend/libs/mensabot-common/pyproject.toml",
        "backend/libs/openmensa/pyproject.toml",
    ]:
        replace_or_fail(ROOT / rel_path, r'^version = "[^"]+"$', f'version = "{VERSION}"')


def sync_frontend_versions() -> None:
    replace_or_fail(ROOT / "frontend/package.json", r'^  "version": "[^"]+",$', f'  "version": "{VERSION}",')
    replace_or_fail(
        ROOT / "frontend/package-lock.json",
        r'"version": "[^"]+"',
        f'"version": "{VERSION}"',
        count=2,
    )

def main() -> None:
    if not VERSION:
        raise RuntimeError(f"{ROOT / 'VERSION'} is empty.")

    sync_pyproject_versions()
    sync_frontend_versions()

    print(f"Synchronized project version to {VERSION}.")


if __name__ == "__main__":
    main()
