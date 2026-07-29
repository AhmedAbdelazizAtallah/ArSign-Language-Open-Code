"""
Sentence Builder

Constructs Arabic sentences from filtered predictions with:
- RTL rendering support
- Word separation
- Duplicate removal
- Confidence averaging
- Undo/Redo functionality
- Export capabilities
"""

import json
import time
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from collections import deque

from ai.config import get_ai_config
from ai.duplicate_filter import FilteredPrediction


@dataclass
class SentenceWord:
    """Single word in the sentence."""
    letters: List[str]
    confidences: List[float]
    timestamps: List[float]
    is_complete: bool = False

    @property
    def text(self) -> str:
        return ''.join(self.letters)

    @property
    def avg_confidence(self) -> float:
        return sum(self.confidences) / len(self.confidences) if self.confidences else 0.0


@dataclass
class SentenceState:
    """Complete sentence state."""
    words: List[SentenceWord] = field(default_factory=list)
    current_word: Optional[SentenceWord] = None
    total_letters: int = 0
    avg_confidence: float = 0.0
    last_update: float = field(default_factory=time.time)

    @property
    def full_text(self) -> str:
        """Get full sentence text."""
        word_texts = [w.text for w in self.words if w.text]
        if self.current_word and self.current_word.text:
            word_texts.append(self.current_word.text)
        return ' '.join(word_texts)

    @property
    def full_text_rtl(self) -> str:
        """Get full sentence with RTL mark."""
        return '\u202B' + self.full_text + '\u202C'  # RLE + PDF


class SentenceBuilder:
    """
    Intelligent sentence builder for Arabic Sign Language.

    Features:
    - RTL text rendering
    - Automatic word separation
    - Duplicate letter suppression
    - Confidence tracking
    - Undo/Redo stack
    - Export to JSON, TXT
    """

    def __init__(self, config=None):
        self.config = config or get_ai_config()
        self.max_length = self.config.sentence_builder.max_sentence_length
        self.word_separator = self.config.sentence_builder.word_separator
        self.auto_space = self.config.sentence_builder.auto_space
        self.rtl_rendering = self.config.sentence_builder.rtl_rendering
        self.confidence_threshold = self.config.sentence_builder.confidence_threshold
        self.undo_stack_size = self.config.sentence_builder.undo_stack_size

        self.state = SentenceState()
        self._undo_stack: deque = deque(maxlen=self.undo_stack_size)
        self._redo_stack: deque = deque(maxlen=self.undo_stack_size)
        self._last_letter: Optional[str] = None
        self._letter_cooldown = 0

    def add_letter(self, prediction: FilteredPrediction) -> bool:
        """
        Add a letter to the sentence.

        Args:
            prediction: Filtered prediction with letter info

        Returns:
            True if letter was added, False otherwise
        """
        if not prediction.should_add_to_sentence:
            return False

        letter = prediction.class_name
        confidence = prediction.confidence

        # Skip duplicate consecutive letters
        if letter == self._last_letter and self._letter_cooldown > 0:
            self._letter_cooldown -= 1
            return False

        # Initialize current word if needed
        if self.state.current_word is None:
            self.state.current_word = SentenceWord([], [], [])

        # Add letter to current word
        self.state.current_word.letters.append(letter)
        self.state.current_word.confidences.append(confidence)
        self.state.current_word.timestamps.append(time.time())

        self.state.total_letters += 1
        self._last_letter = letter
        self._letter_cooldown = 3  # Cooldown frames

        self._save_state()
        self._update_avg_confidence()

        return True

    def add_space(self) -> bool:
        """Manually add a space (complete current word)."""
        if self.state.current_word and self.state.current_word.letters:
            self.state.current_word.is_complete = True
            self.state.words.append(self.state.current_word)
            self.state.current_word = SentenceWord([], [], [])
            self._save_state()
            return True
        return False

    def undo(self) -> bool:
        """Undo last action."""
        if not self._undo_stack:
            return False

        self._redo_stack.append(self._serialize_state())
        self.state = self._undo_stack.pop()
        self._last_letter = self.state.current_word.letters[-1] if self.state.current_word and self.state.current_word.letters else None
        return True

    def redo(self) -> bool:
        """Redo last undone action."""
        if not self._redo_stack:
            return False

        self._undo_stack.append(self._serialize_state())
        self.state = self._deserialize_state(self._redo_stack.pop())
        self._last_letter = self.state.current_word.letters[-1] if self.state.current_word and self.state.current_word.letters else None
        return True

    def clear(self):
        """Clear entire sentence."""
        self._save_state()
        self.state = SentenceState()
        self._last_letter = None
        self._letter_cooldown = 0

    def _save_state(self):
        """Save current state to undo stack."""
        self._undo_stack.append(self._serialize_state())
        self._redo_stack.clear()

    def _serialize_state(self) -> Dict:
        """Serialize state for undo stack."""
        return {
            'words': [
                {
                    'letters': w.letters,
                    'confidences': w.confidences,
                    'timestamps': w.timestamps,
                    'is_complete': w.is_complete
                }
                for w in self.state.words
            ],
            'current_word': {
                'letters': self.state.current_word.letters if self.state.current_word else [],
                'confidences': self.state.current_word.confidences if self.state.current_word else [],
                'timestamps': self.state.current_word.timestamps if self.state.current_word else [],
                'is_complete': self.state.current_word.is_complete if self.state.current_word else False
            } if self.state.current_word else None,
            'total_letters': self.state.total_letters,
            'avg_confidence': self.state.avg_confidence,
            'last_update': self.state.last_update
        }

    def _deserialize_state(self, data: Dict) -> SentenceState:
        """Deserialize state from undo stack."""
        words = [
            SentenceWord(
                letters=w['letters'],
                confidences=w['confidences'],
                timestamps=w['timestamps'],
                is_complete=w['is_complete']
            )
            for w in data['words']
        ]

        current_word = None
        if data['current_word']:
            current_word = SentenceWord(
                letters=data['current_word']['letters'],
                confidences=data['current_word']['confidences'],
                timestamps=data['current_word']['timestamps'],
                is_complete=data['current_word']['is_complete']
            )

        return SentenceState(
            words=words,
            current_word=current_word,
            total_letters=data['total_letters'],
            avg_confidence=data['avg_confidence'],
            last_update=data['last_update']
        )

    def _update_avg_confidence(self):
        """Update average confidence across all letters."""
        all_confidences = []
        for w in self.state.words:
            all_confidences.extend(w.confidences)
        if self.state.current_word:
            all_confidences.extend(self.state.current_word.confidences)

        self.state.avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
        self.state.last_update = time.time()

    def get_display_text(self) -> str:
        """Get text for display (with RTL if enabled)."""
        text = self.state.full_text
        if self.rtl_rendering and text:
            return '\u202B' + text + '\u202C'  # RLE + PDF
        return text

    def get_raw_text(self) -> str:
        """Get raw text without RTL marks."""
        return self.state.full_text

    def get_words(self) -> List[str]:
        """Get list of completed words."""
        return [w.text for w in self.state.words if w.is_complete]

    def get_current_word(self) -> str:
        """Get current incomplete word."""
        return self.state.current_word.text if self.state.current_word else ""

    def get_stats(self) -> Dict[str, Any]:
        """Get sentence statistics."""
        return {
            'total_letters': self.state.total_letters,
            'total_words': len(self.state.words) + (1 if self.state.current_word and self.state.current_word.letters else 0),
            'completed_words': len(self.state.words),
            'current_word_length': len(self.state.current_word.letters) if self.state.current_word else 0,
            'avg_confidence': self.state.avg_confidence,
            'can_undo': len(self._undo_stack) > 0,
            'can_redo': len(self._redo_stack) > 0
        }

    def export_json(self) -> str:
        """Export sentence as JSON."""
        data = {
            'sentence': self.state.full_text,
            'words': [
                {
                    'text': w.text,
                    'letters': w.letters,
                    'avg_confidence': w.avg_confidence,
                    'is_complete': w.is_complete
                }
                for w in self.state.words
            ],
            'current_word': {
                'text': self.state.current_word.text,
                'letters': self.state.current_word.letters,
                'avg_confidence': self.state.current_word.avg_confidence
            } if self.state.current_word else None,
            'stats': self.get_stats(),
            'timestamp': time.time()
        }
        return json.dumps(data, ensure_ascii=False, indent=2)

    def export_txt(self) -> str:
        """Export sentence as plain text."""
        return self.state.full_text

    def can_undo(self) -> bool:
        return len(self._undo_stack) > 0

    def can_redo(self) -> bool:
        return len(self._redo_stack) > 0


_sentence_builder_instance: Optional[SentenceBuilder] = None


def get_sentence_builder(config=None) -> SentenceBuilder:
    """Get singleton sentence builder instance."""
    global _sentence_builder_instance
    if _sentence_builder_instance is None:
        _sentence_builder_instance = SentenceBuilder(config)
    return _sentence_builder_instance