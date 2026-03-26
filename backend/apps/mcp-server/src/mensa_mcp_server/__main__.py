"""
Mensabot MCP Server — main
Author: Tobias Veselsky
Description: Entry point for the Mensa MCP server application.
"""

from .cache import shared_cache
from .server import mcp

def main() -> None:
    """ Start the Mensa MCP server application. """
    shared_cache.load()
    try:
        # Different FastMCP versions expose either .run() or .run_stdio().
        if hasattr(mcp, "run"):
            mcp.run() # FastMCP new
        else:
            mcp.run_stdio() # FastMCP old
    finally:
        shared_cache.flush()

if __name__ == "__main__":
    main()
