# openmensa-sdk

Typed Python wrapper for the [OpenMensa API v2](https://openmensa.org/api/v2).  
Provides a `requests`-based client that returns dataclasses (`Canteen`, `Day`, `Meal`) with stable `to_dict()` helpers for MCP tools and other automation.

## Highlights
- Fully typed dataclasses for canteens, days, meals, and prices.
- Simple, easy-to-use, extendable client API.
- Pagination helpers for `/canteens` (via `list_*` + `iter_canteens`) and `/days`.
- Exceptions include HTTP status, URL, and response body for easier debugging.
- Optional CLI tool for quick inspection of canteen data.

## Installation
```bash
# inside the repository root
uv pip install -e backend/libs/openmensa
# ...or use pip if uv is unavailable
pip install -e backend/libs/openmensa
```

## Quick start
```python
from openmensa_sdk import OpenMensaClient

with OpenMensaClient() as client:
    canteens, _ = client.list_canteens(per_page=20)
    meals = client.list_meals(canteen_id=canteens[0].id, date="2025-11-11")

first_meal = meals[0]
print(first_meal.name, first_meal.prices.to_dict())
```

### Iterating through everything
```python
from openmensa_sdk import OpenMensaClient

with OpenMensaClient() as client:
    # Walk all canteens near a location
    for c in client.iter_canteens(near_lat=52.52, near_lng=13.405, per_page=100):
        # For each canteen, fetch meals for a given date
        meals = client.list_meals(canteen_id=c.id, date="2025-11-11")
        for m in meals:
            pass  # do something
```

### Command-line usage
A simple CLI is included when the package is installed.
```bash
# list first 10 canteens
uv run openmensa list-canteens --per-page 10

# list canteens near TU Berlin
uv run openmensa list-canteens --near-lat 52.512 --near-lng 13.326 --near-dist 2.0

# show meals for a specific canteen and date
uv run openmensa list-meals --canteen-id 2019 --date 2025-11-11
```

```bash
openmensa --help

---
**Maintainer:** Tobias Veselsky  (<veselsky@tu-berlin.de>) 