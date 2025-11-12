"""
Mensabot MCP Server — main
Author: Tobias Veselsky
Description: Entry point for the Mensa MCP server application.
"""

from . import tools_openmensa, tools_generic
from .server import mcp

def main() -> None:
    """ Start the Mensa MCP server application. """
    # Different FastMCP versions expose either .run() or .run_stdio().
    if hasattr(mcp, "run"):
        mcp.run() # FastMCP new
    else:
        mcp.run_stdio() # FastMCP old

if __name__ == "__main__":
    main()
