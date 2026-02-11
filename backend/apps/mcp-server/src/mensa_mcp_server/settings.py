from pydantic_settings import BaseSettings, SettingsConfigDict


class MCPServerSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="MENSA_MCP_",
        env_file=(".env", "../../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # OpenMensa API
    openmensa_base_url: str = "https://openmensa.org/api/v2"
    openmensa_timeout: float = 10.0
    openmensa_user_agent: str = "mensabot-mcp-server/0.1"
    mcp_name: str = "mensabot-openmensa-mcp-server"

    # Overpass / OSM
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    overpass_timeout: float = 25.0
    overpass_cache_ttl_s: int = 900
    overpass_user_agent: str = "mensabot-mcp-server/0.1"

    # Canteen index
    canteen_index_path: str | None = None
    canteen_index_ttl_hours: float = 24.0

    # Timezone for date calculations
    timezone: str = "Europe/Berlin"

    # Concurrency limits
    io_max_concurrency: int = 10


settings = MCPServerSettings()
