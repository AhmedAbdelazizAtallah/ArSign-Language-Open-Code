"""
AI Module Configuration

Centralized configuration for all AI inference components.
"""

from pydantic import Field
from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path


class ModelConfig(BaseSettings):
    """Model loading and inference configuration."""

    model_path: Path = Field(
        default=Path("models/best.onnx"),
        description="Path to ONNX model file"
    )
    use_gpu: bool = Field(
        default=True,
        description="Use GPU if available"
    )
    intra_op_threads: int = Field(
        default=0,
        description="Intra-op parallelism threads (0 = auto)"
    )
    inter_op_threads: int = Field(
        default=0,
        description="Inter-op parallelism threads (0 = auto)"
    )

    class Config:
        env_prefix = "MODEL_"
        case_sensitive = False


class PreprocessConfig(BaseSettings):
    """Image preprocessing configuration."""

    input_size: int = Field(
        default=640,
        description="Model input size (square)"
    )
    mean: tuple = Field(
        default=(0.0, 0.0, 0.0),
        description="Normalization mean (RGB)"
    )
    std: tuple = Field(
        default=(1.0, 1.0, 1.0),
        description="Normalization std (RGB)"
    )
    swap_rb: bool = Field(
        default=True,
        description="Swap BGR to RGB"
    )
    letterbox: bool = Field(
        default=True,
        description="Use letterbox resize to preserve aspect ratio"
    )
    new_shape: tuple = Field(
        default=(640, 640),
        description="Target shape for letterbox"
    )
    color_space: str = Field(
        default="RGB",
        description="Input color space"
    )
    dtype: str = Field(
        default="float32",
        description="Output tensor dtype"
    )

    class Config:
        env_prefix = "PREPROCESS_"
        case_sensitive = False


class NMSConfig(BaseSettings):
    """Non-Maximum Suppression configuration."""

    conf_threshold: float = Field(
        default=0.30,
        ge=0.0,
        le=1.0,
        description="Confidence threshold"
    )
    iou_threshold: float = Field(
        default=0.45,
        ge=0.0,
        le=1.0,
        description="IoU threshold for NMS"
    )
    max_detections: int = Field(
        default=100,
        ge=1,
        le=1000,
        description="Maximum detections per image"
    )
    class_agnostic: bool = Field(
        default=False,
        description="Class-agnostic NMS"
    )
    multi_label: bool = Field(
        default=True,
        description="Multiple labels per box"
    )

    class Config:
        env_prefix = "NMS_"
        case_sensitive = False


class TemporalConfig(BaseSettings):
    """Temporal stabilization configuration."""

    window_size: int = Field(
        default=5,
        ge=1,
        le=30,
        description="Sliding window size for voting"
    )
    min_votes: int = Field(
        default=3,
        ge=1,
        description="Minimum votes for stable prediction"
    )
    confidence_smoothing: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Exponential smoothing factor"
    )
    prediction_lock_frames: int = Field(
        default=3,
        ge=0,
        le=20,
        description="Frames to lock prediction after stabilization"
    )
    max_history: int = Field(
        default=30,
        ge=5,
        le=100,
        description="Maximum history length"
    )

    class Config:
        env_prefix = "TEMPORAL_"
        case_sensitive = False


class DuplicateFilterConfig(BaseSettings):
    """Duplicate prediction suppression configuration."""

    cooldown_frames: int = Field(
        default=10,
        ge=0,
        le=100,
        description="Frames to wait before allowing same prediction"
    )
    similarity_threshold: float = Field(
        default=0.85,
        ge=0.0,
        le=1.0,
        description="IoU threshold for duplicate detection"
    )
    enable_letter_lock: bool = Field(
        default=True,
        description="Enable letter lock mechanism"
    )
    lock_duration_frames: int = Field(
        default=15,
        ge=1,
        le=100,
        description="Frames to lock a letter after detection"
    )

    class Config:
        env_prefix = "DUPLICATE_"
        case_sensitive = False


class SentenceBuilderConfig(BaseSettings):
    """Sentence builder configuration."""

    max_sentence_length: int = Field(
        default=500,
        ge=10,
        le=2000,
        description="Maximum sentence character length"
    )
    word_separator: str = Field(
        default=" ",
        description="Word separator character"
    )
    auto_space: bool = Field(
        default=True,
        description="Automatically add spaces between words"
    )
    rtl_rendering: bool = Field(
        default=True,
        description="Render Arabic RTL"
    )
    confidence_threshold: float = Field(
        default=0.50,
        ge=0.0,
        le=1.0,
        description="Minimum confidence to add to sentence"
    )
    undo_stack_size: int = Field(
        default=20,
        ge=5,
        le=100,
        description="Undo stack size"
    )

    class Config:
        env_prefix = "SENTENCE_"
        case_sensitive = False


class AIConfig(BaseSettings):
    """Main AI configuration aggregator."""

    model: ModelConfig = Field(default_factory=ModelConfig)
    preprocess: PreprocessConfig = Field(default_factory=PreprocessConfig)
    nms: NMSConfig = Field(default_factory=NMSConfig)
    temporal: TemporalConfig = Field(default_factory=TemporalConfig)
    duplicate_filter: DuplicateFilterConfig = Field(default_factory=DuplicateFilterConfig)
    sentence_builder: SentenceBuilderConfig = Field(default_factory=SentenceBuilderConfig)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


_ai_config_instance: Optional[AIConfig] = None


def get_ai_config() -> AIConfig:
    """Get singleton AI configuration instance."""
    global _ai_config_instance
    if _ai_config_instance is None:
        _ai_config_instance = AIConfig()
    return _ai_config_instance