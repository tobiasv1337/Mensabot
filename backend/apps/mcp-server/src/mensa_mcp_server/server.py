"""
Mensabot MCP Server — server
Author: Tobias Veselsky
Description: Builds the FastMCP server and provides client factory for tools.
"""

from fastmcp import FastMCP
from openmensa_sdk import OpenMensaClient

from .settings import settings

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
