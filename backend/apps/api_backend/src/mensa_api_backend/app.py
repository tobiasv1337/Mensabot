from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.canteens import router as canteens_router
from .routes.chat import router as chat_router
from .routes.debug import router as debug_router


def create_app() -> FastAPI:
    app = FastAPI()

    # Allow local dev frontends to call the API.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(chat_router)
    app.include_router(canteens_router)
    app.include_router(debug_router)

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
