"""
Mensabot API Backend — config
Author: Tobias Veselsky
Description: Configuration and environment settings.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load environment variables from .env file in the same directory as this module
_config_dir = Path(__file__).parent
load_dotenv(_config_dir / ".env")


def get_env_required(name: str) -> str:
    """
    Get a required environment variable. Raise an error if not set.
    """
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="forbid",
        case_sensitive=False,
    )

    llm_api_key: str
    llm_base_url: str
    llm_model: str
    mcp_url: str


settings = Settings()
