"""
Inference Service Dependencies
"""

from functools import lru_cache

from backend.services.model_service import ModelService
from backend.services.inference_service import InferenceService
from backend.services.history_service import HistoryService
from backend.services.sentence_service import SentenceService
from backend.services.settings_service import SettingsService


@lru_cache()
def get_model_service() -> ModelService:
    """Get model service singleton."""
    return ModelService()


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