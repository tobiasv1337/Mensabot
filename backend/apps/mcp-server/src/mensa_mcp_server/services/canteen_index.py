from mensabot_backend_core.canteen_index_service import get_index_store, load_canteen_index as _load_canteen_index


def load_canteen_index():
    return _load_canteen_index(caller="mcp")
