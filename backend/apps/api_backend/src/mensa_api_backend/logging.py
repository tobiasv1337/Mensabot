import logging

from .config import settings


LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"


def _configure_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(settings.log_level.upper())

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(LOG_FORMAT))
        logger.addHandler(handler)
        logger.propagate = False

    return logger


def setup_logging() -> logging.Logger:
    _configure_logger("mensa_mcp_server")
    _configure_logger("openmensa_sdk")
    return _configure_logger("mensa_api_backend")


logger = setup_logging()
