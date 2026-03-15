from datetime import datetime
from zoneinfo import ZoneInfo

from openai.types.chat import ChatCompletionMessage

from ..i18n import get_string, DEFAULT_LANGUAGE


def get_time_context(lang: str = DEFAULT_LANGUAGE) -> ChatCompletionMessage:
    """
    Generate a system prompt that informs the LLM about the current local date and time in Europe/Berlin.
    """
    now = datetime.now(ZoneInfo("Europe/Berlin"))
    weekday_names = get_string("weekdays", lang).split(",")
    weekday = weekday_names[now.weekday()]
    local = now.strftime("%Y-%m-%d %H:%M")

    return {
        "role": "system",
        "content": get_string("time_context", lang, weekday=weekday, local=local),
    }
