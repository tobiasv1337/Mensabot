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
    openmensa_user_agent: str = "mensabot-mcp-server/1.0.0"
    mcp_name: str = "mensabot-openmensa-mcp-server"

    # Overpass / OSM
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    overpass_status_url: str | None = None
    overpass_timeout: float = 25.0
    overpass_status_timeout: float = 5.0
    overpass_cache_ttl_s: int = 900
    overpass_max_concurrency: int = 1
    overpass_user_agent: str = "mensabot-mcp-server/1.0.0"

    # Canteen index
    canteen_index_path: str | None = None
    canteen_index_ttl_hours: float = 24.0

    # Shared cache
    shared_cache_path: str | None = None
    shared_cache_default_ttl_s: int = 300
    shared_cache_max_items: int = 4096
    openmensa_canteen_info_cache_ttl_s: int = 60 * 60 * 24
    openmensa_menu_cache_ttl_s: int = 60 * 60
    openmensa_menu_error_cache_ttl_s: int = 30
    opening_hours_cache_ttl_s: int = 60 * 60 * 24 * 7
    opening_hours_error_cache_ttl_s: int = 60
    mcp_tools_cache_ttl_s: int = 60 * 60 * 24

    # Timezone for date calculations
    timezone: str = "Europe/Berlin"

    # Concurrency limits
    io_max_concurrency: int = 10


settings = MCPServerSettings()
