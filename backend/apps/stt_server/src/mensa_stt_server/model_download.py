from __future__ import annotations

import os
import urllib.request
from pathlib import Path


def ensure_parent_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def download_file(url: str, dest_path: Path, *, timeout_s: int = 60) -> None:
    ensure_parent_dir(dest_path)
    tmp_path = dest_path.with_suffix(dest_path.suffix + ".partial")
    if tmp_path.exists():
        tmp_path.unlink()

    req = urllib.request.Request(url, headers={"User-Agent": "mensa-stt-server/0.1"})
    with urllib.request.urlopen(req, timeout=timeout_s) as resp, open(tmp_path, "wb") as f:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)

    os.replace(tmp_path, dest_path)


def model_download_url(model_name: str) -> str:
    # whisper.cpp maintains the ggml model files in this Hugging Face repo.
    return f"https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{model_name}.bin"


def ensure_model_file(model_path: Path, model_name: str, *, timeout_s: int = 60) -> None:
    if model_path.exists():
        return
    url = model_download_url(model_name)
    download_file(url, model_path, timeout_s=timeout_s)

