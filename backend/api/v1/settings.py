"""
Settings API Routes
"""

from fastapi import APIRouter, Depends

from backend.services.settings_service import SettingsService
from backend.core.dependencies import get_settings_service

router = APIRouter()


@router.get("")
async def get_settings(
    settings_service: SettingsService = Depends(get_settings_service)
):
    """Get current settings."""
    return settings_service.get_settings()


@router.put("")
async def update_settings(
    settings: dict,
    settings_service: SettingsService = Depends(get_settings_service)
):
    """Update settings."""
    return settings_service.update_settings(settings)


@router.post("/reset")
async def reset_settings(
    settings_service: SettingsService = Depends(get_settings_service)
):
    """Reset settings to defaults."""
    return settings_service.reset_settings()