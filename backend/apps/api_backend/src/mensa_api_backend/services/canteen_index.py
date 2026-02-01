from mensa_mcp_server.server import make_openmensa_client
from openmensa_sdk import CanteenIndexStore

from ..config import settings
from ..models import CanteenOut


_canteen_index_store: CanteenIndexStore | None = None


def get_canteen_index_store() -> CanteenIndexStore:
    global _canteen_index_store
    if _canteen_index_store is None:
        _canteen_index_store = (
            CanteenIndexStore(path=settings.canteen_index_path)
            if settings.canteen_index_path
            else CanteenIndexStore()
        )
    return _canteen_index_store


def load_canteen_index():
    store = get_canteen_index_store()
    with make_openmensa_client() as client:
        return store.refresh_if_stale(client, ttl_hours=settings.canteen_index_ttl_hours)


def canteen_to_out(canteen) -> CanteenOut:
    return CanteenOut(
        id=canteen.id,
        name=canteen.name,
        city=canteen.city,
        address=canteen.address,
        lat=canteen.latitude,
        lng=canteen.longitude,
    )
