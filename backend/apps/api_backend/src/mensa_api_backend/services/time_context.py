from datetime import datetime
from zoneinfo import ZoneInfo

from openai.types.chat import ChatCompletionMessage


def get_time_context() -> ChatCompletionMessage:
    """
    Generate a system prompt that informs the LLM about the current local date and time in Europe/Berlin.
    """
    now = datetime.now(ZoneInfo("Europe/Berlin"))
    weekday = now.strftime("%A")
    local = now.strftime("%Y-%m-%d %H:%M")

    return {
        "role": "system",
        "content": (
            f"Current local date and time: {weekday}, {local} (timezone: Europe/Berlin). "
            "Assume all canteen opening hours and menus refer to this timezone. "
            "When the user says 'today', interpret it as this local date."
        ),
    }
