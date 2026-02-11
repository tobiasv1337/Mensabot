from .app import app


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, ws="websockets-sansio")


if __name__ == "__main__":
    main()
