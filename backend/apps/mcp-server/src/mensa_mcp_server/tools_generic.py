import datetime as dt
from zoneinfo import ZoneInfo
from typing import Annotated, Optional

from pydantic import Field

from .server import mcp
from .settings import settings
from .schemas import DateContextDTO, DateEntryDTO, WeekRangeDTO, WeekdayName

_WEEKDAY_BY_INDEX: tuple[WeekdayName, ...] = (
    WeekdayName.monday,
    WeekdayName.tuesday,
    WeekdayName.wednesday,
    WeekdayName.thursday,
    WeekdayName.friday,
    WeekdayName.saturday,
    WeekdayName.sunday,
)


def _local_now() -> dt.datetime:
    return dt.datetime.now(ZoneInfo(settings.timezone))


def _week_start(date: dt.date) -> dt.date:
    return date - dt.timedelta(days=date.weekday())


def _date_entry(date: dt.date) -> DateEntryDTO:
    weekday = _WEEKDAY_BY_INDEX[date.weekday()]
    return DateEntryDTO(
        date=date.isoformat(),
        weekday=weekday,
        is_weekend=date.weekday() >= 5,
    )


def _week_range(start_date: dt.date) -> WeekRangeDTO:
    days = [_date_entry(start_date + dt.timedelta(days=offset)) for offset in range(7)]
    return WeekRangeDTO(
        start_date=start_date.isoformat(),
        end_date=(start_date + dt.timedelta(days=6)).isoformat(),
        days=days,
        weekdays=days[:5],
    )


@mcp.tool()
async def get_date_context() -> DateContextDTO:
    """
    Return canonical date references in the configured timezone.

    This function does NOT take any parameters.

    This returns:
    - `today` and `tomorrow` as `DateEntryDTO`.
    - `this_week` as days from *today* through Sunday (no days before today).
    - `next_week` as the following Mon-Sun week.
    """
    now = _local_now()
    today = now.date()
    base_start = _week_start(today)

    # this_week: from today..Sunday
    end_of_week = base_start + dt.timedelta(days=6)
    delta_days = (end_of_week - today).days
    this_week_days = [_date_entry(today + dt.timedelta(days=i)) for i in range(delta_days + 1)]
    this_week_weekdays = [d for d in this_week_days if not d.is_weekend][:5]
    this_week = WeekRangeDTO(
        start_date=today.isoformat(),
        end_date=end_of_week.isoformat(),
        days=this_week_days,
        weekdays=this_week_weekdays,
    )

    return DateContextDTO(
        timezone=settings.timezone,
        now_local=now.strftime("%Y-%m-%d %H:%M"),
        today=_date_entry(today),
        tomorrow=_date_entry(today + dt.timedelta(days=1)),
        this_week=this_week,
        next_week=_week_range(base_start + dt.timedelta(days=7)),
    )

@mcp.tool()
async def health() -> dict:
    """Verify the MCP server is operational. Returns {\"ok\": true} if healthy."""
    return {"ok": True}


@mcp.tool()
async def request_user_location(prompt: Annotated[str, Field(description="A short, user-facing message explaining why their location is needed. Write this in the same language you are responding in.")]) -> dict:
    """
    Ask the user for permission to share their location. Returns the prompt text to display.
    The backend will interrupt the tool loop to collect the user's GPS coordinates from the frontend.
    After the user interacts with the location prompt, their location is provided in the next user message.
    Use that next user message as input and continue with the relevant tool calls (for example search_canteens with coordinates).

    Use this tool when you need the user's location to answer a question. For example if the user asks what to eat nearby.
    Also use this tool to disambiguate search_canteens matches across different cities/areas when location is the best signal.
    Prefer this tool over asking for location manually in plain text for better UX and more accurate location data.
    """
    return {"prompt": prompt}


@mcp.tool()
async def request_canteen_directions(
    prompt: Annotated[str, Field(description="A short, user-facing message asking the user if they want to open directions. Write this in the same language you are responding in.")],
    canteen_id: Optional[int] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> dict:
    """
    Allows the user to open directions to a canteen in Google Maps.
    Use this tool when the user wants to navigate to a canteen or when the user wants to know where a canteen is located exactly.
    Provide either a canteen_id or a lat/lng pair (preferred: canteen_id).
    If both are provided, the explicit lat/lng values will take precedence.

    You have to retrieve the canteen_id via `search_canteens` first to use this tool with a canteen_id! Always call `search_canteens` before this tool to get the correct canteen_id.

    Calling this tool will show the user a button which opens Google Maps with directions to the canteen.
    """
    return {"prompt": prompt, "canteen_id": canteen_id, "lat": lat, "lng": lng}


@mcp.tool()
async def request_user_clarification(
    prompt: Annotated[str, Field(description="A short, user-facing question explaining what needs clarification. Write this in the same language you are responding in.")],
    options: Annotated[list[str], Field(description="A list of 2-10 option labels for the user to choose from. Each label should be very concise and user-friendly. Write this in the same language you are responding in.")],
    allow_none: Annotated[bool, Field(description="If true, an extra 'None of these' option will be shown to the user.")] = True,
) -> dict:
    """
    Present the user with a multiple-choice question in the chat UI.
    The backend will interrupt the tool loop and show clickable buttons to the user.
    After the user selects an option, that selection is provided in the next user message.
    Use that next user message as input and continue.

    Use this tool when:
    - search_canteens returns multiple plausible results and you are uncertain which one the user means
    - The user's request is ambiguous and could refer to different canteens, cities, or options
    - You need the user to choose between specific alternatives
    - You want to ask the user a simple yes/no question with clear button options
    - You can provide a concise predefined option list (2-10 options)

    Important:
    - If the user should choose from predefined options, call this tool instead of listing options in plain text.
    - Do not ask users to choose by typing when clickable options can be provided.
    - If the ambiguity is primarily geographic across many cities/areas, prefer request_user_location first.

    Do NOT use this tool when:
    - There is only one obvious option
    - The user has already specified enough information to proceed
    - The user clearly wants results for multiple canteens (then continue with all relevant matches)
    - The question is open-ended and no clear predefined options exist (just ask the user directly via text instead)
    """
    return {"prompt": prompt, "options": options, "allow_none": allow_none}
