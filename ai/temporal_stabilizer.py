"""
Temporal Stabilization Engine

Stabilizes predictions across frames using:
- Sliding window majority voting
- Confidence smoothing
- Prediction persistence/locking
- Configurable stability thresholds
"""

import numpy as np
from collections import deque, Counter
from typing import List, Optional, Dict, Tuple
from dataclasses import dataclass, field
from enum import Enum

from ai.config import get_ai_config
from ai.nms import Detection


class StabilizationMode(Enum):
    MAJORITY_VOTE = "majority_vote"
    CONFIDENCE_WEIGHTED = "confidence_weighted"
    EXPONENTIAL_SMOOTHING = "exponential_smoothing"


@dataclass
class StabilizedPrediction:
    """Stabilized prediction result."""
    class_id: int
    class_name: str
    confidence: float
    stability_score: float
    is_stable: bool
    frames_in_window: int
    bbox: Optional[np.ndarray] = None
    should_add_to_sentence: bool = False


class TemporalStabilizer:
    """
    Temporal stabilization for video/camera streams.

    Uses sliding window of recent frames to stabilize predictions,
    reducing flickering and false positives.
    """

    def __init__(self, config=None):
        self.config = config or get_ai_config()
        self.window_size = self.config.temporal.window_size
        self.min_votes = self.config.temporal.min_votes
        self.confidence_threshold = self.config.temporal.confidence_threshold
        self.stability_threshold = self.config.temporal.stability_threshold
        self.mode = StabilizationMode(self.config.temporal.mode)

        # Per-class sliding windows
        self._vote_windows: Dict[int, deque] = {}
        self._confidence_windows: Dict[int, deque] = {}
        self._bbox_windows: Dict[int, deque] = {}

        # State
        self._frame_count = 0
        self._last_stable_class: Optional[int] = None
        self._lock_frames = 0
        self._lock_duration = self.config.temporal.prediction_lock_frames

    def update(self, detections: List[Detection]) -> List[StabilizedPrediction]:
        """
        Update stabilizer with new frame detections.

        Args:
            detections: Current frame detections from NMS

        Returns:
            List of stabilized predictions
        """
        self._frame_count += 1

        # Aggregate detections by class
        class_votes = Counter()
        class_confidences = {}
        class_bboxes = {}

        for det in detections:
            class_votes[det.class_id] += 1
            if det.class_id not in class_confidences:
                class_confidences[det.class_id] = []
                class_bboxes[det.class_id] = []
            class_confidences[det.class_id].append(det.confidence)
            class_bboxes[det.class_id].append(det.bbox)

        # Update windows for all classes seen
        all_classes = set(class_votes.keys()) | set(self._vote_windows.keys())

        for class_id in all_classes:
            votes = class_votes.get(class_id, 0)
            confs = class_confidences.get(class_id, [0.0])
            bboxes = class_bboxes.get(class_id, [np.zeros(4)])

            # Initialize windows if needed
            if class_id not in self._vote_windows:
                self._vote_windows[class_id] = deque(maxlen=self.window_size)
                self._confidence_windows[class_id] = deque(maxlen=self.window_size)
                self._bbox_windows[class_id] = deque(maxlen=self.window_size)

            # Add to windows
            self._vote_windows[class_id].append(votes > 0)
            self._confidence_windows[class_id].append(np.mean(confs))
            self._bbox_windows[class_id].append(np.mean(bboxes, axis=0))

        # Compute stabilized predictions
        stabilized = []

        for class_id in all_classes:
            vote_window = self._vote_windows[class_id]
            conf_window = self._confidence_windows[class_id]
            bbox_window = self._bbox_windows[class_id]

            if len(vote_window) == 0:
                continue

            # Compute stability metrics
            positive_votes = sum(vote_window)
            total_frames = len(vote_window)
            vote_ratio = positive_votes / total_frames
            avg_confidence = np.mean(conf_window)
            avg_bbox = np.mean(bbox_window, axis=0)

            # Determine stability based on mode
            is_stable = self._compute_stability(vote_ratio, avg_confidence)

            # Check prediction lock
            if self._lock_frames > 0:
                if class_id == self._last_stable_class:
                    is_stable = True
                self._lock_frames -= 1

            # Should add to sentence?
            should_add = (is_stable and
                         avg_confidence >= self.confidence_threshold and
                         self._should_add_to_sentence(class_id))

            if should_add:
                self._last_stable_class = class_id
                self._lock_frames = self._lock_duration

            stabilized.append(StabilizedPrediction(
                class_id=class_id,
                class_name=self.config.model.classes[class_id],
                confidence=avg_confidence,
                stability_score=vote_ratio * avg_confidence,
                is_stable=is_stable,
                frames_in_window=total_frames,
                bbox=avg_bbox,
                should_add_to_sentence=should_add
            ))

        return stabilized

    def _compute_stability(self, vote_ratio: float, confidence: float) -> bool:
        """Compute if prediction is stable based on mode."""
        if self.mode == StabilizationMode.MAJORITY_VOTE:
            return vote_ratio >= self.stability_threshold
        elif self.mode == StabilizationMode.CONFIDENCE_WEIGHTED:
            return (vote_ratio * confidence) >= self.stability_threshold
        elif self.mode == StabilizationMode.EXPONENTIAL_SMOOTHING:
            # Use smoothed confidence
            return confidence >= self.confidence_threshold and vote_ratio >= 0.5
        return vote_ratio >= self.stability_threshold

    def _should_add_to_sentence(self, class_id: int) -> bool:
        """Check if letter should be added to sentence (not duplicate)."""
        # Basic duplicate check - enhanced by DuplicateFilter
        return True

    def reset(self):
        """Reset all windows and state."""
        self._vote_windows.clear()
        self._confidence_windows.clear()
        self._bbox_windows.clear()
        self._frame_count = 0
        self._last_stable_class = None
        self._lock_frames = 0

    def get_stats(self) -> Dict:
        """Get stabilizer statistics."""
        return {
            'window_size': self.window_size,
            'active_classes': len(self._vote_windows),
            'frame_count': self._frame_count,
            'lock_frames': self._lock_frames,
            'last_stable': self._last_stable_class
        }


_temporal_stabilizer_instance: Optional[TemporalStabilizer] = None


def get_temporal_stabilizer(config=None) -> TemporalStabilizer:
    """Get singleton temporal stabilizer instance."""
    global _temporal_stabilizer_instance
    if _temporal_stabilizer_instance is None:
        _temporal_stabilizer_instance = TemporalStabilizer(config)
    return _temporal_stabilizer_instance