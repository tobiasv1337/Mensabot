from mensa_mcp_server.server import make_openmensa_client
from mensa_mcp_server.settings import settings
from mensa_mcp_server.metrics import metrics
from openmensa_sdk import CanteenIndexStore, OpenMensaAPIError

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
    ttl_hours = settings.canteen_index_ttl_hours

    metrics.inc("canteen_index.load.calls_total")
    metrics.inc_labeled("canteen_index.load.calls_by_caller_total", "api")

    cached = store.load()
    if cached is not None and not cached.is_stale(ttl_hours):
        metrics.inc("canteen_index.load.hit_total")
        return cached

    if cached is None:
        metrics.inc("canteen_index.load.miss_total")
    else:
        metrics.inc("canteen_index.load.stale_total")

    with make_openmensa_client() as client:
        metrics.inc("canteen_index.refresh.attempt_total")
        metrics.inc_labeled("canteen_index.refresh.attempt_by_caller_total", "api")
        try:
            idx = store.refresh(client)
        except OpenMensaAPIError:
            metrics.inc("canteen_index.refresh.error_total")
            if cached is not None:
                metrics.inc("canteen_index.refresh.used_stale_total")
                return cached
            raise

        metrics.inc("canteen_index.refresh.success_total")
        return idx


def canteen_to_out(canteen) -> CanteenOut:
    return CanteenOut(
        id=canteen.id,
        name=canteen.name,
        city=canteen.city,
        address=canteen.address,
        lat=canteen.latitude,
        lng=canteen.longitude,
    )
