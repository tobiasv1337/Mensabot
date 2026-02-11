from __future__ import annotations


def main() -> None:
    import uvicorn

    from .config import settings

    uvicorn.run("mensa_stt_server.app:app", host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()

