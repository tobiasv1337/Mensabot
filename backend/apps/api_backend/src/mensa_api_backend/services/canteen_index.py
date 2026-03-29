from mensabot_backend_core.canteen_index_service import get_index_store, load_canteen_index as _load_canteen_index

from ..models import CanteenOut


def get_canteen_index_store():
    return get_index_store()


def load_canteen_index():
    return _load_canteen_index(caller="api")


def canteen_to_out(canteen) -> CanteenOut:
    return CanteenOut(
        id=canteen.id,
        name=canteen.name,
        city=canteen.city,
        address=canteen.address,
        lat=canteen.latitude,
        lng=canteen.longitude,
    )
