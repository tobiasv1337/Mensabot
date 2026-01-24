from .server import mcp

@mcp.tool()
def health() -> dict:
    """Verify the MCP server is operational. Returns {\"ok\": true} if healthy."""
    return {"ok": True}
