"""
Health Check API
"""

from fastapi import APIRouter, Depends
from datetime import datetime
import psutil

from backend.services.model_service import ModelService
from backend.core.dependencies import get_model_service

router = APIRouter()


@router.get("")
async def health_check(
    model_service: ModelService = Depends(get_model_service)
):
    """Health check endpoint."""
    health = await model_service.health_check()

    return {
        "success": True,
        "timestamp": datetime.utcnow().isoformat(),
        **health
    }