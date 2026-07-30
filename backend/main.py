"""
FastAPI Application Core

Main application setup with middleware, exception handlers, and routing.
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.config.settings import get_settings
from backend.logging.config import setup_logging
from backend.middleware.request_id import RequestIDMiddleware
from backend.middleware.timing import TimingMiddleware
from backend.middleware.security import SecurityHeadersMiddleware
from backend.api import api_router
from backend.core.exceptions import (
    InferenceError,
    ModelLoadError,
    ValidationError,
    inference_error_handler,
    model_load_error_handler,
    validation_error_handler,
    http_exception_handler,
    general_exception_handler,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup
    setup_logging()
    logger = logging.getLogger(__name__)
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")

    # Initialize inference engine
    from backend.services.inference_service import get_inference_service
    inference_service = get_inference_service()
    await inference_service.initialize()

    logger.info("Application startup complete")
    yield

    # Shutdown
    logger.info("Shutting down application...")
    await inference_service.shutdown()
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Arabic Sign Language Real-Time Recognition Platform API",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
        lifespan=lifespan,
    )

    # Middleware (order matters)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(TimingMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # CORS (open for all origins — public API)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    app.add_exception_handler(InferenceError, inference_error_handler)
    app.add_exception_handler(ModelLoadError, model_load_error_handler)
    app.add_exception_handler(ValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    # Include unified API router
    app.include_router(api_router, prefix=f"/api/{settings.api_version}")

    # Root endpoint
    @app.get("/")
    async def root():
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "status": "running",
            "docs": "/docs" if settings.debug else "disabled",
        }

    return app


app = create_app()
