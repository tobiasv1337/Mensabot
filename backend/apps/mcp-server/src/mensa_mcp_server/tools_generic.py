import datetime as dt
from zoneinfo import ZoneInfo
from typing import Optional

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
async def request_user_location(prompt: str = "Um dir diese Frage zu beantworten, brauche ich deinen Standort. Möchtest du ihn freigeben?") -> dict:
    """
    Ask the user for permission to share their location. Returns the prompt text to display.
    This will return the users GPS location which you can use for canteen lookup etc.

    Use this tool when you need the user's location to answer a question. For example if the user aks what to eat nearby.
    Prefer this tool for requesting the users location over just asking manually via your response for better user experience and more accurate location data.
    """
    return {"prompt": prompt}


@mcp.tool()
async def request_canteen_directions(
    prompt: str = "Möchtest du die Route zur Mensa in Google Maps öffnen?",
    canteen_id: Optional[int] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> dict:
    """
    Allows the user to open directions to a canteen in Google Maps.
    Use this tool when the user wants to navigate to a canteen or when the user wants to know where a canteen is located exactly.
    Provide either a canteen_id or a lat/lng pair (preferred: canteen_id).
    If both are provided, the explicit lat/lng values will take precedence.

    The backend will interrupt the tool loop and instruct the frontend to show
    a directions button with this prompt.
    """
    return {"prompt": prompt, "canteen_id": canteen_id, "lat": lat, "lng": lng}
