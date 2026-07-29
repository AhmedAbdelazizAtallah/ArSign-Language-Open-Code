"""
Backend Configuration

Centralized configuration using Pydantic Settings.
"""

from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    """Application settings."""

    # App
    app_name: str = "Arabic Sign Language Platform"
    app_version: str = "1.0.0"
    api_version: str = "v1"
    environment: str = "development"
    debug: bool = True

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4

    # Model
    model_path: Path = Path("models/best.onnx")
    model_input_size: int = 640
    model_classes: int = 32

    # Inference
    conf_threshold: float = 0.30
    iou_threshold: float = 0.45
    max_detections: int = 100
    use_gpu: bool = True
    execution_providers: List[str] = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    warmup_runs: int = 5
    intra_op_threads: int = 0
    inter_op_threads: int = 0

    # Temporal Stabilization
    stabilization_window: int = 5
    min_votes: int = 3
    confidence_threshold: float = 0.50
    stability_threshold: float = 0.60
    temporal_mode: str = "majority_vote"
    prediction_lock_frames: int = 3

    # Duplicate Filter
    duplicate_cooldown_frames: int = 10
    similarity_threshold: float = 0.85
    enable_letter_lock: bool = True
    lock_duration_frames: int = 15
    min_confidence_for_sentence: float = 0.50

    # Sentence Builder
    max_sentence_length: int = 500
    word_separator: str = " "
    auto_space: bool = True
    rtl_rendering: bool = True
    sentence_confidence_threshold: float = 0.50
    undo_stack_size: int = 20

    # Upload
    max_upload_size: int = 104857600  # 100MB
    allowed_image_types: List[str] = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    allowed_video_types: List[str] = ["video/mp4", "video/avi", "video/quicktime", "video/x-matroska"]
    upload_dir: Path = Path("uploads")
    temp_dir: Path = Path("tmp")

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["*"]
    cors_allow_headers: List[str] = ["*"]

    # Security
    secret_key: str = "your-secret-key-change-in-production"
    rate_limit_requests: int = 100
    rate_limit_window: int = 60

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    log_file: Path = Path("logs/app.log")

    # Monitoring
    enable_metrics: bool = True
    metrics_port: int = 9090

    # Frontend
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "allow"


_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get singleton settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings