#!/usr/bin/env python3
"""
OpenMensa SDK — cli application
Author: Tobias Veselsky
Description: Command-line application for using the OpenMensa SDK.

Usage examples:
    # 1. List first 10 canteens
    openmensa list-canteens --per-page 10

    # 2. List canteens near TU Berlin
    openmensa list-canteens --near-lat 52.512 --near-lng 13.326 --near-dist 2.0

    # 3. Show details for a single canteen
    openmensa get-canteen --id 2019

    # 4. Show available days for a canteen
    openmensa list-days --canteen-id 2019

    # 5. Show meals for a specific date
    openmensa list-meals --canteen-id 2019 --date 2025-10-29

    # 6. Show a single meal by ID
    openmensa get-meal --canteen-id 2019 --date 2025-10-29 --meal-id 12345

    # 7. Refresh the local canteen index
    openmensa index-refresh

    # 8. List canteens from the local index
    openmensa index-list --per-page 20 --city Berlin

    # 9. Search canteens in the local index
    openmensa index-search --query "tu berlin" --limit 5
"""

import argparse
import json
from datetime import date as _date
from typing import List, Optional

from openmensa_sdk import (
    OpenMensaClient,
    OpenMensaAPIError,
    Canteen,
    Day,
    Meal,
    CanteenIndexStore,
    CanteenSearchResult,
    DEFAULT_INDEX_TTL_HOURS,
)


def cmd_list_canteens(args) -> int:
    with OpenMensaClient() as client:
        try:
            canteens, next_page = client.list_canteens(
                near_lat=args.near_lat,
                near_lng=args.near_lng,
                near_dist=args.near_dist,
                per_page=args.per_page,
                page=args.page,
                has_coordinates=args.has_coordinates,
            )
        except OpenMensaAPIError as e:
            print_api_error(e)
            return 1

    print(f"Found {len(canteens)} canteens (next_page={next_page}):")
    for c in canteens:
        print_canteen(c)
    return 0


def cmd_get_canteen(args) -> int:
    with OpenMensaClient() as client:
        try:
            c = client.get_canteen(args.id)
        except OpenMensaAPIError as e:
            print_api_error(e)
            return 1

    print_canteen(c)
    return 0


def cmd_list_days(args) -> int:
    with OpenMensaClient() as client:
        try:
            start = args.start
            days, next_page = client.list_days(
                args.canteen_id,
                start=start,
                per_page=args.per_page,
                page=args.page,
            )
        except OpenMensaAPIError as e:
            print_api_error(e)
            return 1

    print(f"Found {len(days)} days (next_page={next_page}):")
    for d in days:
        print_day(d)
    return 0


def cmd_list_meals(args) -> int:
    with OpenMensaClient() as client:
        try:
            meals = client.list_meals(args.canteen_id, args.date)
        except OpenMensaAPIError as e:
            print_api_error(e)
            return 1

    print(f"Found {len(meals)} meals for {args.date}:")
    for m in meals:
        print_meal(m)
    return 0


def cmd_get_meal(args) -> int:
    with OpenMensaClient() as client:
        try:
            meal = client.get_meal(args.canteen_id, args.date, args.meal_id)
        except OpenMensaAPIError as e:
            print_api_error(e)
            return 1

    print_meal(meal, verbose=True)
    return 0


def _get_index_store(args) -> CanteenIndexStore:
    if args.index_path:
        return CanteenIndexStore(path=args.index_path)
    return CanteenIndexStore()


def cmd_index_refresh(args) -> int:
    store = _get_index_store(args)
    with OpenMensaClient() as client:
        try:
            index = store.refresh(client)
        except OpenMensaAPIError as e:
            print_api_error(e)
            return 1
    print(f"Index refreshed: {index.updated_at.isoformat()} ({len(index.canteens)} canteens)")
    return 0


def cmd_index_list(args) -> int:
    store = _get_index_store(args)
    with OpenMensaClient() as client:
        try:
            index = store.refresh_if_stale(client, ttl_hours=args.ttl_hours)
        except OpenMensaAPIError as e:
            print_api_error(e)
            return 1

    canteens, total = index.list(
        page=args.page,
        per_page=args.per_page,
        city=args.city,
        has_coordinates=args.has_coordinates,
    )
    next_page = args.page + 1 if args.page * args.per_page < total else None

    print(f"Index updated_at={index.updated_at.isoformat()} total_canteens={len(index.canteens)}")
    print(f"Found {len(canteens)} canteens (total={total}, next_page={next_page}):")
    for c in canteens:
        print_canteen(c)
    return 0


def cmd_index_search(args) -> int:
    store = _get_index_store(args)
    with OpenMensaClient() as client:
        try:
            index = store.refresh_if_stale(client, ttl_hours=args.ttl_hours)
        except OpenMensaAPIError as e:
            print_api_error(e)
            return 1

    results, total = index.search(
        args.query,
        city=args.city,
        near_lat=args.near_lat,
        near_lng=args.near_lng,
        radius_km=args.radius_km,
        limit=args.limit,
        min_score=args.min_score,
        has_coordinates=args.has_coordinates,
    )

    print(f"Index updated_at={index.updated_at.isoformat()} total_canteens={len(index.canteens)}")
    if not args.query:
        print("Mode: location-only (no text score; results ordered by distance)")
    print(f"Found {len(results)} results (total={total}):")
    show_score = bool(args.query)
    for r in results:
        print_search_result(r, show_score=show_score)
    return 0


# ---- printers --------------------------------------------------------

def print_canteen(c: Canteen) -> None:
    as_dict = c.to_dict()
    print("CANTEEN")
    print(f"  id:         {as_dict['id']}")
    print(f"  name:       {as_dict['name']}")
    print(f"  city:       {as_dict['city']}")
    print(f"  address:    {as_dict['address']}")
    print(f"  latitude:   {as_dict['latitude']}")
    print(f"  longitude:  {as_dict['longitude']}")


def print_day(d: Day) -> None:
    as_dict = d.to_dict()
    print("DAY")
    print(f"  date:       {as_dict['date']}")
    print(f"  closed:     {as_dict['closed']}")
    print(f"  message:    {as_dict['message']}")


def print_meal(m: Meal, verbose: bool = False) -> None:
    as_dict = m.to_dict()
    print("MEAL")
    print(f"  id:         {as_dict['id']}")
    print(f"  name:       {as_dict['name']}")
    print(f"  category:   {as_dict['category']}")
    print(f"  notes:      {', '.join(as_dict['notes']) if as_dict['notes'] else '-'}")

    prices = as_dict["prices"]
    print("  prices:")
    print(f"    students:     {prices['students']}")
    print(f"    employees:    {prices['employees']}")
    print(f"    pupils:       {prices['pupils']}")
    print(f"    others:       {prices['others']}")
    if verbose:
        print(f"    raw:          {json.dumps(prices['raw'], ensure_ascii=False)}")


def print_search_result(r: CanteenSearchResult, show_score: bool = True) -> None:
    print("RESULT")
    if show_score:
        print(f"  score:      {r.score:.1f}")
    else:
        print("  score:      -")
    print(f"  distance:   {r.distance_km if r.distance_km is not None else '-'}")
    print_canteen(r.canteen)


def print_api_error(e: OpenMensaAPIError) -> None:
    print("OpenMensa API Error:")
    print(f"  status:   {e.status_code}")
    print(f"  message:  {str(e)}")
    print(f"  url:      {e.url}")
    if e.response_body is not None:
        try:
            body_str = json.dumps(e.response_body, indent=2, ensure_ascii=False)
        except Exception:
            body_str = str(e.response_body)
        print("  body:")
        print("   ", body_str)


# ---- argparse --------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="CLI demo for the OpenMensa API wrapper"
    )
    sub = p.add_subparsers(dest="command", required=True)

    # list-canteens
    sc = sub.add_parser("list-canteens", help="List canteens (optionally filtered)")
    sc.add_argument("--near-lat", type=float, default=None, help="Latitude for proximity search")
    sc.add_argument("--near-lng", type=float, default=None, help="Longitude for proximity search")
    sc.add_argument("--near-dist", type=float, default=None, help="Distance in km for proximity search")
    sc.add_argument("--per-page", type=int, default=None, help="Items per page")
    sc.add_argument("--page", type=int, default=None, help="Page number (1-based)")
    sc.add_argument("--has-coordinates", dest="has_coordinates", action="store_const", const=True, default=None, help="Only return canteens that have coordinates")
    sc.set_defaults(func=cmd_list_canteens)

    # get-canteen
    gc = sub.add_parser("get-canteen", help="Show one canteen by ID")
    gc.add_argument("--id", type=int, required=True, help="Canteen ID")
    gc.set_defaults(func=cmd_get_canteen)

    # list-days
    ld = sub.add_parser("list-days", help="List availability days for a canteen")
    ld.add_argument("--canteen-id", type=int, required=True, help="Canteen ID")
    ld.add_argument("--start", type=str, default=None, help="Start date (YYYY-MM-DD)")
    ld.add_argument("--per-page", type=int, default=None, help="Items per page")
    ld.add_argument("--page", type=int, default=None, help="Page number")
    ld.set_defaults(func=cmd_list_days)

    # list-meals
    lm = sub.add_parser("list-meals", help="List meals for a canteen/date")
    lm.add_argument("--canteen-id", type=int, required=True, help="Canteen ID")
    lm.add_argument("--date", type=str, default=_date.today().isoformat(), help="Date (YYYY-MM-DD). Defaults to today.")
    lm.set_defaults(func=cmd_list_meals)

    # get-meal
    gm = sub.add_parser("get-meal", help="Get single meal by canteen/date/meal-id")
    gm.add_argument("--canteen-id", type=int, required=True, help="Canteen ID")
    gm.add_argument("--date", type=str, default=_date.today().isoformat(), help="Date (YYYY-MM-DD). Defaults to today.")
    gm.add_argument("--meal-id", type=int, required=True, help="Meal ID")
    gm.set_defaults(func=cmd_get_meal)

    # index-refresh
    ir = sub.add_parser("index-refresh", help="Refresh the local canteen index")
    ir.add_argument("--index-path", type=str, default=None, help="Path to the local index file")
    ir.set_defaults(func=cmd_index_refresh)

    # index-list
    il = sub.add_parser("index-list", help="List canteens from the local index")
    il.add_argument("--index-path", type=str, default=None, help="Path to the local index file")
    il.add_argument("--ttl-hours", type=float, default=DEFAULT_INDEX_TTL_HOURS, help="Index refresh TTL in hours")
    il.add_argument("--page", type=int, default=1, help="Page number (1-based)")
    il.add_argument("--per-page", type=int, default=50, help="Items per page")
    il.add_argument("--city", type=str, default=None, help="Optional city filter")
    il.add_argument("--has-coordinates", dest="has_coordinates", action="store_const", const=True, default=None, help="Only return canteens with coordinates")
    il.add_argument("--no-coordinates", dest="has_coordinates", action="store_const", const=False, help="Only return canteens without coordinates")
    il.set_defaults(func=cmd_index_list)

    # index-search
    isearch = sub.add_parser("index-search", help="Search canteens in the local index")
    isearch.add_argument("--index-path", type=str, default=None, help="Path to the local index file")
    isearch.add_argument("--ttl-hours", type=float, default=DEFAULT_INDEX_TTL_HOURS, help="Index refresh TTL in hours")
    isearch.add_argument("--query", type=str, default=None, help="Search query")
    isearch.add_argument("--city", type=str, default=None, help="Optional city filter")
    isearch.add_argument("--near-lat", type=float, default=None, help="Latitude for radius search")
    isearch.add_argument("--near-lng", type=float, default=None, help="Longitude for radius search")
    isearch.add_argument("--radius-km", type=float, default=None, help="Radius in kilometers for near search")
    isearch.add_argument("--limit", type=int, default=20, help="Max number of results to return")
    isearch.add_argument("--min-score", type=float, default=60.0, help="Minimum search score (0-100)")
    isearch.add_argument("--has-coordinates", dest="has_coordinates", action="store_const", const=True, default=None, help="Only return canteens with coordinates")
    isearch.add_argument("--no-coordinates", dest="has_coordinates", action="store_const", const=False, help="Only return canteens without coordinates")
    isearch.set_defaults(func=cmd_index_search)

    return p


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
