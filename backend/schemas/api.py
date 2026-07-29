"""
API Request/Response Schemas

Pydantic models for request validation and response serialization.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


# Common schemas
class BaseResponse(BaseModel):
    """Base response model."""
    model_config = ConfigDict(from_attributes=True)

    success: bool = True
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None


class ErrorResponse(BaseResponse):
    """Error response model."""
    success: bool = False
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class HealthResponse(BaseResponse):
    """Health check response."""
    status: str
    version: str
    model_loaded: bool
    model_path: str
    gpu_available: bool
    cpu_usage: float
    memory_usage: float
    uptime_seconds: float


class MetricsResponse(BaseResponse):
    """Metrics response."""
    current_fps: float
    average_fps: float
    current_latency_ms: float
    average_latency_ms: float
    average_confidence: float
    gpu_usage: float
    cpu_usage: float
    memory_usage: float
    inference_count: int
    dropped_frames: int
    average_processing_time_ms: float


# Prediction schemas
class BoundingBox(BaseModel):
    """Bounding box coordinates."""
    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    """Single detection result."""
    bbox: BoundingBox
    confidence: float = Field(ge=0.0, le=1.0)
    class_id: int = Field(ge=0)
    class_name: str


class ImagePredictRequest(BaseModel):
    """Image prediction request."""
    conf_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    iou_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    max_detections: Optional[int] = Field(default=None, ge=1, le=1000)


class ImagePredictResponse(BaseResponse):
    """Image prediction response."""
    latency_ms: float
    fps: float
    predictions: List[Detection]
    sentence: Optional[str] = None
    provider: str
    model_version: str


class VideoPredictRequest(BaseModel):
    """Video prediction request."""
    conf_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    iou_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    max_detections: Optional[int] = Field(default=None, ge=1, le=1000)
    sample_rate: Optional[int] = Field(default=1, ge=1, description="Process every N frames")


class VideoPredictResponse(BaseResponse):
    """Video prediction response."""
    video_info: Dict[str, Any]
    total_frames: int
    processed_frames: int
    predictions: List[List[Detection]]
    sentence: Optional[str] = None
    processing_time_ms: float
    download_url: Optional[str] = None


class CameraFrameRequest(BaseModel):
    """Camera frame request."""
    frame: str = Field(description="Base64 encoded frame")
    conf_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    iou_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    max_detections: Optional[int] = Field(default=None, ge=1, le=1000)


class CameraFrameResponse(BaseResponse):
    """Camera frame response."""
    latency_ms: float
    fps: float
    predictions: List[Detection]
    sentence: Optional[str] = None


# Sentence Builder schemas
class SentenceState(BaseModel):
    """Sentence builder state."""
    sentence: str
    sentence_rtl: str
    words: List[str]
    current_word: str
    total_letters: int
    avg_confidence: float
    can_undo: bool
    can_redo: bool


class SentenceResetResponse(BaseResponse):
    """Sentence reset response."""
    sentence: str


class SentenceExportResponse(BaseResponse):
    """Sentence export response."""
    format: str
    content: str
    filename: str


# History schemas
class HistoryEntry(BaseModel):
    """History entry."""
    id: str
    timestamp: datetime
    source: str  # "camera", "image", "video"
    source_name: str
    detections: List[Detection]
    sentence: str
    latency_ms: float
    fps: float
    confidence: float


class HistoryResponse(BaseResponse):
    """History response."""
    entries: List[HistoryEntry]
    total: int
    page: int
    page_size: int


class HistoryDeleteResponse(BaseResponse):
    """History delete response."""
    deleted_count: int


# Settings schemas
class SettingsResponse(BaseResponse):
    """Settings response."""
    conf_threshold: float
    iou_threshold: float
    max_detections: int
    bounding_box_color: str
    label_color: str
    font_size: int
    show_fps: bool
    show_latency: bool
    show_confidence: bool
    enable_sentence_builder: bool
    language: str
    theme: str


class SettingsUpdateRequest(BaseModel):
    """Settings update request."""
    conf_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    iou_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    max_detections: Optional[int] = Field(default=None, ge=1, le=1000)
    bounding_box_color: Optional[str] = None
    label_color: Optional[str] = None
    font_size: Optional[int] = Field(default=None, ge=8, le=32)
    show_fps: Optional[bool] = None
    show_latency: Optional[bool] = None
    show_confidence: Optional[bool] = None
    enable_sentence_builder: Optional[bool] = None
    language: Optional[str] = None
    theme: Optional[str] = None


class SettingsUpdateResponse(BaseResponse):
    """Settings update response."""
    settings: SettingsResponse


# Upload schemas
class UploadResponse(BaseResponse):
    """File upload response."""
    file_id: str
    filename: str
    size: int
    content_type: str
    url: str