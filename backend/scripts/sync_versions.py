from __future__ import annotations

import argparse
import json
import re
import shlex
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence


ROOT = Path(__file__).resolve().parents[2]
VERSION_FILE = ROOT / "VERSION"


@dataclass(frozen=True)
class PythonProject:
    name: str
    rel_path: str

    @property
    def path(self) -> Path:
        return ROOT / self.rel_path

    @property
    def pyproject_path(self) -> Path:
        return self.path / "pyproject.toml"


PYTHON_PROJECTS: tuple[PythonProject, ...] = (
    PythonProject(name="mensabot-common", rel_path="backend/libs/mensabot-common"),
    PythonProject(name="openmensa-sdk", rel_path="backend/libs/openmensa"),
    PythonProject(name="mensabot-backend-core", rel_path="backend/libs/mensabot-backend-core"),
    PythonProject(name="mensa-mcp-server", rel_path="backend/apps/mcp-server"),
    PythonProject(name="mensa-stt-server", rel_path="backend/apps/stt_server"),
    PythonProject(name="mensa-api-backend", rel_path="backend/apps/api_backend"),
)

FRONTEND_DIR = ROOT / "frontend"
FRONTEND_PACKAGE_JSON = FRONTEND_DIR / "package.json"
FRONTEND_PACKAGE_LOCK = FRONTEND_DIR / "package-lock.json"


def log(message: str) -> None:
    print(message, flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Sync the repository VERSION into all package manifests, then refresh "
            "Python lockfiles and environments and rebuild the frontend."
        )
    )
    parser.add_argument(
        "--versions-only",
        action="store_true",
        help="Only update version metadata. Skip uv lock, uv sync, and frontend build.",
    )
    parser.add_argument(
        "--skip-uv-lock",
        action="store_true",
        help="Skip `uv lock` for Python projects.",
    )
    parser.add_argument(
        "--skip-uv-sync",
        action="store_true",
        help="Skip `uv sync --locked` for Python projects.",
    )
    parser.add_argument(
        "--skip-frontend-build",
        action="store_true",
        help="Skip `npm run build` in the frontend.",
    )
    return parser.parse_args()


def read_version() -> str:
    version = VERSION_FILE.read_text(encoding="utf-8").strip()
    if not version:
        raise RuntimeError(f"{VERSION_FILE} is empty.")
    return version


def replace_or_fail(path: Path, pattern: str, replacement: str, *, count: int = 1) -> None:
    text = path.read_text(encoding="utf-8")
    updated, replacements = re.subn(pattern, replacement, text, count=count, flags=re.MULTILINE)
    if replacements != count:
        raise RuntimeError(f"Expected {count} replacement(s) in {path}, got {replacements}.")
    if updated != text:
        path.write_text(updated, encoding="utf-8")


def write_json_if_changed(path: Path, payload: Any) -> None:
    updated = json.dumps(payload, indent=2) + "\n"
    current = path.read_text(encoding="utf-8")
    if updated != current:
        path.write_text(updated, encoding="utf-8")


def sync_pyproject_versions(version: str) -> None:
    for project in PYTHON_PROJECTS:
        replace_or_fail(
            project.pyproject_path,
            r'^version = "[^"]+"$',
            f'version = "{version}"',
        )


def sync_frontend_versions(version: str) -> None:
    package_json = json.loads(FRONTEND_PACKAGE_JSON.read_text(encoding="utf-8"))
    if "version" not in package_json:
        raise RuntimeError(f"Missing top-level version in {FRONTEND_PACKAGE_JSON}.")
    package_json["version"] = version
    write_json_if_changed(FRONTEND_PACKAGE_JSON, package_json)

    package_lock = json.loads(FRONTEND_PACKAGE_LOCK.read_text(encoding="utf-8"))
    if "version" not in package_lock:
        raise RuntimeError(f"Missing top-level version in {FRONTEND_PACKAGE_LOCK}.")
    if package_lock.get("packages", {}).get("") is None:
        raise RuntimeError(f'Missing root package entry packages[""] in {FRONTEND_PACKAGE_LOCK}.')

    package_lock["version"] = version
    package_lock["packages"][""]["version"] = version
    write_json_if_changed(FRONTEND_PACKAGE_LOCK, package_lock)


def format_command(command: Sequence[str]) -> str:
    return " ".join(shlex.quote(part) for part in command)


def run_command(*, cwd: Path, command: Sequence[str]) -> None:
    rel_cwd = cwd.relative_to(ROOT)
    printable = format_command(command)
    log(f"[run] ({rel_cwd}) {printable}")
    try:
        subprocess.run(command, cwd=cwd, check=True)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"Command failed in {rel_cwd}: {printable}") from exc


def run_uv_lock() -> None:
    log("Running `uv lock` for Python projects...")
    for project in PYTHON_PROJECTS:
        run_command(cwd=project.path, command=("uv", "lock"))


def run_uv_sync() -> None:
    log("Running `uv sync --locked` for Python projects...")
    for project in PYTHON_PROJECTS:
        run_command(cwd=project.path, command=("uv", "sync", "--locked"))


def run_frontend_build() -> None:
    log("Running `npm run build` for the frontend...")
    run_command(cwd=FRONTEND_DIR, command=("npm", "run", "build"))


def main() -> int:
    args = parse_args()
    if args.versions_only:
        args.skip_uv_lock = True
        args.skip_uv_sync = True
        args.skip_frontend_build = True

    version = read_version()

    log(f"Synchronizing manifests to version {version}...")
    sync_pyproject_versions(version)
    sync_frontend_versions(version)

    if not args.skip_uv_lock:
        run_uv_lock()
    if not args.skip_uv_sync:
        run_uv_sync()
    if not args.skip_frontend_build:
        run_frontend_build()

    log(f"Version sync pipeline completed for {version}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
