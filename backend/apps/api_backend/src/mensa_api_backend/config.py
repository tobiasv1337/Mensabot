from pydantic_settings import BaseSettings, SettingsConfigDict


class APIBackendSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="API_BACKEND_",
        env_file="src/mensa_api_backend/.env",
        env_file_encoding="utf-8",
        extra="forbid",
        case_sensitive=False,
    )

    llm_api_key: str
    llm_base_url: str
    llm_model: str

    llm_supports_tool_messages: bool = False
    log_level: str = "INFO"
    max_llm_iterations: int = 10
    llm_max_retries: int = 10
    llm_retry_base_delay: float = 1.0
    llm_retry_max_delay: float = 30.0
    llm_fallback_response: str = (
        "I'm sorry, but I wasn't able to provide a satisfactory answer within the allowed number of "
        "attempts. Please try rephrasing your question or ask something else."
    )

    canteen_index_path: str | None = None
    canteen_index_ttl_hours: float = 24.0

    io_max_concurrency: int = 10
    llm_max_concurrency: int = 10


settings = APIBackendSettings()
