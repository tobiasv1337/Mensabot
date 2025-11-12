from .server import mcp

@mcp.tool()
def health() -> dict:
    """Simple health probe."""
    return {"ok": True}
