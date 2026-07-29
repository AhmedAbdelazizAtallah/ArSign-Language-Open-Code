"""
Structured Logging Configuration

Configures structlog for production-grade JSON logging.
"""

import logging
import sys
from typing import Any, Dict
import structlog
from structlog.types import EventDict, WrappedLogger

from backend.config.settings import get_settings


def add_request_id(logger: WrappedLogger, name: str, event_dict: EventDict) -> EventDict:
    """Add request ID to log entries if available."""
    # Request ID is added via middleware
    return event_dict


def add_service_info(logger: WrappedLogger, name: str, event_dict: EventDict) -> EventDict:
    """Add service metadata to log entries."""
    event_dict["service"] = "arabic-sign-language-api"
    event_dict["version"] = "1.0.0"
    return event_dict


def setup_logging():
    """Configure structured logging."""
    settings = get_settings()

    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
    )

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            add_service_info,
            add_request_id,
            structlog.processors.JSONRenderer() if settings.log_format == "json"
            else structlog.dev.ConsoleRenderer(colors=True),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = None) -> structlog.BoundLogger:
    """Get structured logger instance."""
    return structlog.get_logger(name)