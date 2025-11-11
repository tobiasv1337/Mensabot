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

    return p


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
