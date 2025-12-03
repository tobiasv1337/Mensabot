"""
Mensabot API Backend — tools
Author: Tobias Veselsky
Description: Tool registry and exports.
"""

from typing import Any, Callable, Dict

from .canteen import list_canteens_near
from .definitions import TOOL_DEFINITIONS


# Tool registry mapping function names to their implementations
TOOL_REGISTRY: Dict[str, Callable[..., Any]] = {
    "list_canteens_near": list_canteens_near,
}


__all__ = [
    "TOOL_REGISTRY",
    "TOOL_DEFINITIONS",
    "list_canteens_near",
]
