import logging

from .config import settings


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("mensa_api_backend")
    logger.setLevel(settings.log_level.upper())

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
        logger.addHandler(handler)
        logger.propagate = False

    return logger


logger = setup_logging()
