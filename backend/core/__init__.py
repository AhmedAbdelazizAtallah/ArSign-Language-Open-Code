"""
Core Package
"""

from backend.core.dependencies import (
    get_model_service,
    get_inference_service,
    get_history_service,
    get_sentence_service,
    get_settings_service,
)

__all__ = [
    "get_model_service",
    "get_inference_service",
    "get_history_service",
    "get_sentence_service",
    "get_settings_service",
]