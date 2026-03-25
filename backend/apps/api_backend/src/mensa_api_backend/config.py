from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class APIBackendSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="API_BACKEND_",
        env_file=(".env", "../../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    llm_api_key: str
    llm_base_url: str
    llm_model: str
    llm_temperature: float | None = None

    @field_validator("llm_temperature", mode="before")
    @classmethod
    def _empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    log_level: str = "INFO"
    max_llm_iterations: int = 10
    max_history_messages: int = 20
    llm_max_retries: int = 10
    llm_retry_base_delay: float = 1.0
    llm_retry_max_delay: float = 30.0

    # LLM-as-a-Judge: validate final responses before returning them.
    llm_judge_enabled: bool = True
    llm_judge_max_corrections: int = 5

    io_max_concurrency: int = 10
    llm_max_concurrency: int = 10

    # Local STT service for voice message transcription.
    stt_base_url: str = "http://stt:9100"
    stt_timeout_s: float = 900.0
    stt_max_upload_bytes: int = 25 * 1024 * 1024
    stt_max_concurrency: int = 1

    # Expose debugging endpoints (cache + external API metrics). Keep disabled in production.
    enable_debug_endpoints: bool = False


settings = APIBackendSettings()
