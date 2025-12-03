"""
Mensabot API Backend — main
Author: Tobias Veselsky
Description: Entry point for the Mensa API backend application.
"""

from .app import app


def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
