"""
Duplicate Prediction Suppression

Prevents consecutive identical predictions from generating repeated letters.
Implements cooldown, letter lock, and state machine for smooth sentence building.
"""

import time
from typing import Optional, Dict, List
from dataclasses import dataclass, field
from enum import Enum
from collections import deque

from ai.config import get_ai_config
from ai.temporal_stabilizer import StabilizedPrediction


class FilterState(Enum):
    """Filter state machine states."""
    IDLE = "idle"
    DETECTED = "detected"
    COOLDOWN = "cooldown"
    LOCKED = "locked"


@dataclass
class FilteredPrediction:
    """Filtered prediction result."""
    class_id: int
    class_name: str
    confidence: float
    stability_score: float
    should_add_to_sentence: bool
    state: FilterState
    cooldown_remaining: int = 0
    bbox: Optional[np.ndarray] = None


class DuplicateFilter:
    """
    Duplicate prediction suppression filter.

    Features:
    - Cooldown period between same predictions
    - Letter lock mechanism
    - Configurable similarity threshold
    - State machine for smooth transitions
    """

    def __init__(self, config=None):
        self.config = config or get_ai_config()
        self.cooldown_frames = self.config.duplicate_filter.cooldown_frames
        self.similarity_threshold = self.config.duplicate_filter.similarity_threshold
        self.enable_letter_lock = self.config.duplicate_filter.enable_letter_lock
        self.lock_duration_frames = self.config.duplicate_filter.lock_duration_frames

        # State tracking
        self._last_class_id: Optional[int] = None
        self._last_class_time: float = 0
        self._cooldown_counter: int = 0
        self._lock_counter: int = 0
        self._lock_class: Optional[int] = None
        self._state = FilterState.IDLE
        self._frame_count = 0

        # History for similarity computation
        self._recent_predictions: deque = deque(maxlen=10)

    def filter(
        self,
        prediction: StabilizedPrediction
    ) -> FilteredPrediction:
        """
        Filter a stabilized prediction.

        Args:
            prediction: Stabilized prediction from temporal stabilizer

        Returns:
            Filtered prediction with decision on sentence addition
        """
        self._frame_count += 1

        # Check if we're in lock state
        if self._state == FilterState.LOCKED:
            self._lock_counter -= 1
            if self._lock_counter <= 0:
                self._state = FilterState.IDLE
                self._lock_class = None

        # Check cooldown
        if self._cooldown_counter > 0:
            self._cooldown_counter -= 1

        # Determine if should add to sentence
        should_add = self._should_add(prediction)

        # Update state
        self._update_state(prediction, should_add)

        result = FilteredPrediction(
            class_id=prediction.class_id,
            class_name=prediction.class_name,
            confidence=prediction.confidence,
            stability_score=prediction.stability_score,
            should_add_to_sentence=should_add,
            state=self._state,
            cooldown_remaining=self._cooldown_counter,
            bbox=prediction.bbox
        )

        self._recent_predictions.append({
            'class_id': prediction.class_id,
            'time': time.time(),
            'confidence': prediction.confidence
        })

        return result

    def _should_add(self, prediction: StabilizedPrediction) -> bool:
        """Determine if prediction should be added to sentence."""
        class_id = prediction.class_id

        # If locked to different class, don't add
        if self._state == FilterState.LOCKED and self._lock_class != class_id:
            return False

        # If in cooldown for same class, don't add
        if self._cooldown_counter > 0 and self._last_class_id == class_id:
            return False

        # Check similarity with recent predictions
        if self._is_similar_to_recent(class_id):
            return False

        # Must have good confidence
        if prediction.confidence < self.config.duplicate_filter.min_confidence:
            return False

        return True

    def _is_similar_to_recent(self, class_id: int) -> bool:
        """Check if class_id is similar to recent predictions."""
        for pred in self._recent_predictions:
            if pred['class_id'] == class_id:
                return True
        return False

    def _update_state(self, prediction: StabilizedPrediction, should_add: bool):
        """Update filter state machine."""
        class_id = prediction.class_id

        if should_add:
            # New letter detected
            if self._state == FilterState.IDLE or self._last_class_id != class_id:
                self._state = FilterState.DETECTED
                self._last_class_id = class_id
                self._last_class_time = time.time()

                # Start cooldown
                self._cooldown_counter = self.cooldown_frames

                # Start letter lock if enabled
                if self.enable_letter_lock:
                    self._state = FilterState.LOCKED
                    self._lock_class = class_id
                    self._lock_counter = self.lock_duration_frames

            elif self._state == FilterState.DETECTED:
                # Same class detected again - extend lock
                if self.enable_letter_lock and self._lock_class == class_id:
                    self._lock_counter = self.lock_duration_frames

        else:
            # No addition - transition states
            if self._state == FilterState.DETECTED:
                self._state = FilterState.COOLDOWN
            elif self._state == FilterState.COOLDOWN and self._cooldown_counter <= 0:
                self._state = FilterState.IDLE

    def reset(self):
        """Reset filter state."""
        self._last_class_id = None
        self._last_class_time = 0
        self._cooldown_counter = 0
        self._lock_counter = 0
        self._lock_class = None
        self._state = FilterState.IDLE
        self._frame_count = 0
        self._recent_predictions.clear()

    def get_state_info(self) -> Dict:
        """Get current filter state info."""
        return {
            'state': self._state.value,
            'last_class': self._last_class_id,
            'cooldown_remaining': self._cooldown_counter,
            'lock_remaining': self._lock_counter,
            'lock_class': self._lock_class
        }


_duplicate_filter_instance: Optional[DuplicateFilter] = None


def get_duplicate_filter(config=None) -> DuplicateFilter:
    """Get singleton duplicate filter instance."""
    global _duplicate_filter_instance
    if _duplicate_filter_instance is None:
        _duplicate_filter_instance = DuplicateFilter(config)
    return _duplicate_filter_instance