from .server import mcp

@mcp.tool()
def health() -> dict:
    """Verify the MCP server is operational. Returns {\"ok\": true} if healthy."""
    return {"ok": True}


@mcp.tool()
def request_user_location(prompt: str = "Um dir diese Frage zu beantworten, brauche ich deinen Standort. Möchtest du ihn freigeben?") -> dict:
    """
    Ask the user for permission to share their location. Returns the prompt text to display.
    The backend will use this to interrupt the tool loop and ask the frontend to collect the location.

    Use this tool when you need the user's location to answer a question.
    """
    return {"prompt": prompt}
