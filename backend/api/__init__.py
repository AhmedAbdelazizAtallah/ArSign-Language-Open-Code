"""
Main API Router
"""

from fastapi import APIRouter

from backend.api.v1 import health, predict, sentence, history, settings, metrics

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(predict.router, prefix="/predict", tags=["predict"])
api_router.include_router(sentence.router, prefix="/sentence", tags=["sentence"])
api_router.include_router(history.router, prefix="/history", tags=["history"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])