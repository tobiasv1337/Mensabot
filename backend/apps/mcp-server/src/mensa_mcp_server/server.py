from fastmcp import FastMCP
from mensabot_backend_core.openmensa_client import make_openmensa_client

from .settings import settings

mcp = FastMCP(name=settings.mcp_name)


# Import tools to register them with the MCP server
from . import tools_generic
from . import tools_openmensa
