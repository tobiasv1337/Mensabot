"""
Mensabot API Backend — tools.definitions
Author: Tobias Veselsky
Description: OpenAI format tool definitions for LLM function calling.
"""

from typing import Any, Dict, List


# STUB tool definition. Just for testing function-calling behavior for now. :)
TOOL_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "list_canteens_near",
            "description": (
                "List canteens near a geographic location (paginated). "
                "Use this to find nearby university canteens. "
                "Return real canteen names, distances, and addresses."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {
                        "type": "number",
                        "description": "Latitude in WGS84 decimal degrees."
                    },
                    "lng": {
                        "type": "number",
                        "description": "Longitude in WGS84 decimal degrees."
                    },
                    "radius_km": {
                        "type": "number",
                        "description": "Search radius in kilometers.",
                        "default": 3.0
                    },
                    "page": {
                        "type": "integer",
                        "description": "Page number for pagination (1-based).",
                        "default": 1,
                        "minimum": 1
                    },
                },
                "required": ["lat", "lng"],
            },
        },
    },
]
