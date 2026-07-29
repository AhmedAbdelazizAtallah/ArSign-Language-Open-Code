"""
Sentence Builder Service

Manages Arabic sentence construction with RTL support.
"""

import json
import time
from typing import List, Dict, Any, Optional
from collections import deque

from backend.logging.config import get_logger

logger = get_logger(__name__)


class SentenceService:
    """Service for building Arabic sentences from predictions."""

    def __init__(self):
        self.words: List[List[str]] = []
        self.current_word: List[str] = []
        self.current_confidences: List[float] = []
        self._undo_stack: deque = deque(maxlen=20)
        self._redo_stack: deque = deque(maxlen=20)
        self._last_letter: Optional[str] = None
        self._letter_cooldown = 0

    def add_letter(self, letter: str, confidence: float) -> bool:
        """Add letter to current word."""
        # Skip duplicate consecutive letters
        if letter == self._last_letter and self._letter_cooldown > 0:
            self._letter_cooldown -= 1
            return False

        self.current_word.append(letter)
        self.current_confidences.append(confidence)
        self._last_letter = letter
        self._letter_cooldown = 3

        self._save_state()
        return True

    def add_space(self) -> bool:
        """Complete current word and start new one."""
        if self.current_word:
            self.words.append(self.current_word.copy())
            self.current_word = []
            self.current_confidences = []
            self._save_state()
            return True
        return False

    def undo(self) -> bool:
        """Undo last action."""
        if not self._undo_stack:
            return False

        self._redo_stack.append(self._serialize())
        state = self._undo_stack.pop()
        self._deserialize(state)
        return True

    def redo(self) -> bool:
        """Redo last undone action."""
        if not self._redo_stack:
            return False

        self._undo_stack.append(self._serialize())
        state = self._redo_stack.pop()
        self._deserialize(state)
        return True

    def clear(self):
        """Clear entire sentence."""
        self._save_state()
        self.words = []
        self.current_word = []
        self.current_confidences = []
        self._last_letter = None
        self._letter_cooldown = 0

    def _save_state(self):
        """Save current state to undo stack."""
        self._undo_stack.append(self._serialize())
        self._redo_stack.clear()

    def _serialize(self) -> Dict:
        """Serialize current state."""
        return {
            "words": [w.copy() for w in self.words],
            "current_word": self.current_word.copy(),
            "current_confidences": self.current_confidences.copy(),
            "last_letter": self._last_letter,
            "letter_cooldown": self._letter_cooldown
        }

    def _deserialize(self, state: Dict):
        """Deserialize state."""
        self.words = [w.copy() for w in state["words"]]
        self.current_word = state["current_word"].copy()
        self.current_confidences = state["current_confidences"].copy()
        self._last_letter = state["last_letter"]
        self._letter_cooldown = state["letter_cooldown"]

    def get_state(self) -> Dict[str, Any]:
        """Get current state for frontend."""
        full_text = ' '.join(''.join(w) for w in self.words if w)
        if self.current_word:
            full_text += ' ' + ''.join(self.current_word)

        return {
            "sentence": full_text,
            "sentence_rtl": '\u202B' + full_text + '\u202C' if full_text else "",
            "words": [''.join(w) for w in self.words if w],
            "current_word": ''.join(self.current_word),
            "total_letters": sum(len(w) for w in self.words) + len(self.current_word),
            "avg_confidence": self._avg_confidence(),
            "can_undo": len(self._undo_stack) > 0,
            "can_redo": len(self._redo_stack) > 0
        }

    def _avg_confidence(self) -> float:
        """Calculate average confidence."""
        all_conf = []
        for w in self.words:
            all_conf.extend([1.0] * len(w))  # Placeholder
        if self.current_confidences:
            all_conf.extend(self.current_confidences)
        return sum(all_conf) / len(all_conf) if all_conf else 0.0

    def export_json(self) -> str:
        """Export as JSON."""
        data = {
            "sentence": self.get_state()["sentence"],
            "words": [''.join(w) for w in self.words if w],
            "current_word": ''.join(self.current_word),
            "stats": self.get_state()
        }
        return json.dumps(data, ensure_ascii=False, indent=2)

    def export_txt(self) -> str:
        """Export as plain text."""
        return self.get_state()["sentence"]