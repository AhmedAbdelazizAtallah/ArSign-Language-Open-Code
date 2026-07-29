"""
Domain Models
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class DetectionModel(BaseModel):
    """Detection result model."""
    bbox: List[float] = Field(..., description="[x1, y1, x2, y2]")
    confidence: float = Field(..., ge=0.0, le=1.0)
    class_id: int = Field(..., ge=0)
    class_name: str


class InferenceResult(BaseModel):
    """Inference result with timing."""
    detections: List[DetectionModel]
    preprocess_ms: float
    inference_ms: float
    nms_ms: float
    total_ms: float
    fps: float
    provider: str


class HistoryEntry(BaseModel):
    """History entry."""
    id: str
    timestamp: datetime
    source: str
    source_name: str
    detections: List[DetectionModel]
    sentence: str
    latency_ms: float
    fps: float
    avg_confidence: float


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