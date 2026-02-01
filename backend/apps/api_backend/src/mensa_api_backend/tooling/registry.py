from typing import Any, Dict, List

from fastmcp import Client as MCPClient

from mensa_mcp_server import mcp

from ..logging import logger


async def get_openai_tools_from_mcp() -> List[Dict[str, Any]]:
    """
    Fetch tool definitions from the MCP server and convert them to OpenAI tool format.
    Returns:
        List[Dict[str, Any]]: List of tool definitions in OpenAI function calling format.
        Each tool has the structure: {"type": "function", "function": {...}}
    """
    async with MCPClient(mcp) as mcp_client:
        raw_tools = await mcp_client.list_tools()
        tool_list = list(raw_tools)

        openai_tools = []

        for tool in tool_list:
            name = getattr(tool, "name", None)
            description = getattr(tool, "description", "")
            parameters = getattr(tool, "inputSchema", None)
            if not name or not parameters:
                logger.warning(
                    "Tool is missing name or inputSchema. Name: %s, has parameters: %s\n Tool: %s.\nSkipping this tool.",
                    name,
                    parameters is not None,
                    tool,
                )
                continue

            openai_tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": name,
                        "description": description,
                        "parameters": parameters,
                    },
                }
            )
        return openai_tools
