"""
Inference Service Dependencies
"""

from functools import lru_cache

from backend.services.model_service import ModelService, get_model_service as _get_model_service
from backend.services.inference_service import InferenceService
from backend.services.history_service import HistoryService
from backend.services.sentence_service import SentenceService
from backend.services.settings_service import SettingsService


@lru_cache()
def get_model_service() -> ModelService:
    """Get model service singleton."""
    return _get_model_service()


@lru_cache()
def get_inference_service() -> InferenceService:
    """Get inference service singleton."""
    return InferenceService()


@lru_cache()
def get_history_service() -> HistoryService:
    """Get history service singleton."""
    return HistoryService()


@lru_cache()
def get_sentence_service() -> SentenceService:
    """Get sentence service singleton."""
    return SentenceService()


@lru_cache()
def get_settings_service() -> SettingsService:
    """Get settings service singleton."""
    return SettingsService()
