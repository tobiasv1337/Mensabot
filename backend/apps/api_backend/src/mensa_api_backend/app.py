"""
Mensabot API Backend — app
Author: Tobias Veselsky
Description: FastAPI application initialization and middleware configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router


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

# Include API routes
app.include_router(router)
