"""
Mensabot MCP Server — server
Author: Tobias Veselsky
Description: Builds the FastMCP server and provides client factory for tools.
"""

from fastmcp import FastMCP
from pydantic_settings import BaseSettings, SettingsConfigDict
from openmensa_sdk import OpenMensaClient

class MCPServerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MENSA_MCP_", env_file=".env", env_file_encoding="utf-8", extra="forbid", case_sensitive=False)

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

settings = MCPServerSettings()
mcp = FastMCP(name=settings.mcp_name)

def make_openmensa_client() -> OpenMensaClient:
    return OpenMensaClient(
        base_url=settings.openmensa_base_url,
        timeout=settings.openmensa_timeout,
        user_agent=settings.openmensa_user_agent,
    )


# Import tools to register them with the MCP server
from . import tools_generic
from . import tools_openmensa
