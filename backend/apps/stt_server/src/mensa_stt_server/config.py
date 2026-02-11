from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class STTSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="STT_",
        env_file=(".env", "../../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    host: str = "0.0.0.0"
    port: int = 9100

    # whisper.cpp binary and model selection
    whisper_bin: str = "/opt/whisper/whisper-cli"
    models_dir: str = "/models"
    model: str = "small"
    model_path: str | None = None
    auto_download_model: bool = False

    # Resource limits
    max_upload_bytes: int = 25 * 1024 * 1024
    max_audio_seconds: int = 180
    max_concurrency: int = 1
    timeout_s: int = 900
    threads: int = 4

    # If set, forward to whisper.cpp's `-l` argument. Use "auto" for auto-detect.
    language: str = "auto"

    def resolved_model_path(self) -> Path:
        if self.model_path:
            return Path(self.model_path)
        return Path(self.models_dir) / f"ggml-{self.model}.bin"


settings = STTSettings()
