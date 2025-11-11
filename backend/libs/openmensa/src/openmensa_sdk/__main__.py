#!/usr/bin/env python3
"""
OpenMensa SDK — main
Author: Tobias Veselsky
Description: Entry point for the OpenMensa SDK package.
"""

from .cli import main

if __name__ == "__main__":
    SystemExit(main())
