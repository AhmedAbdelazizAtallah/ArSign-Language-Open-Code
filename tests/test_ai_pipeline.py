import pytest
import numpy as np
from pathlib import Path

from ai.preprocess import Preprocessor, LetterboxResize
from ai.nms import NonMaxSuppression
from ai.temporal_stabilizer import TemporalStabilizer, StabilizationMode
from ai.duplicate_filter import DuplicateFilter
from ai.sentence_builder import SentenceBuilder


class TestLetterboxResize:
    """Test letterbox resize preprocessing."""

    def test_letterbox_square_image(self):
        """Test letterbox on square image."""
        letterbox = LetterboxResize(new_shape=(640, 640))
        image = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
        result, ratio, (dw, dh) = letterbox(image)

        assert result.shape == (640, 640, 3)
        assert ratio == (1.0, 1.0)
        assert dw == 0 and dh == 0

    def test_letterbox_landscape_image(self):
        """Test letterbox on landscape image."""
        letterbox = LetterboxResize(new_shape=(640, 640))
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        result, ratio, (dw, dh) = letterbox(image)

        assert result.shape == (640, 640, 3)
        assert ratio[0] == ratio[1]  # Aspect ratio preserved

    def test_letterbox_portrait_image(self):
        """Test letterbox on portrait image."""
        letterbox = LetterboxResize(new_shape=(640, 640))
        image = np.random.randint(0, 255, (640, 480, 3), dtype=np.uint8)
        result, ratio, (dw, dh) = letterbox(image)

        assert result.shape == (640, 640, 3)
        assert ratio[0] == ratio[1]


class TestPreprocessor:
    """Test image preprocessing pipeline."""

    def setup_method(self):
        self.preprocessor = Preprocessor()

    def test_preprocess_numpy_array(self):
        """Test preprocessing numpy array."""
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        tensor = self.preprocessor.preprocess(image)

        assert tensor.shape == (1, 3, 640, 640)
        assert tensor.dtype == np.float32
        assert tensor.min() >= -1 and tensor.max() <= 1

    def test_preprocess_with_metadata(self):
        """Test preprocessing with metadata return."""
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        tensor, meta = self.preprocessor.preprocess(image, return_meta=True)

        assert 'original_shape' in meta
        assert 'ratio' in meta
        assert 'padding' in meta
        assert meta['original_shape'] == (480, 640)

    def test_reverse_letterbox(self):
        """Test reversing letterbox coordinates."""
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        tensor, meta = self.preprocessor.preprocess(image, return_meta=True)

        # Create dummy boxes in letterboxed space
        boxes = np.array([[100, 100, 200, 200]], dtype=np.float32)
        original_boxes = self.preprocessor.reverse_letterbox(boxes, meta)

        # Boxes should be scaled back to original image coordinates
        assert original_boxes.shape == boxes.shape


class TestNonMaxSuppression:
    """Test Non-Maximum Suppression."""

    def setup_method(self):
        self.nms = NonMaxSuppression()

    def test_nms_no_detections(self):
        """Test NMS with no detections."""
        predictions = np.zeros((1, 10, 5 + 32))  # 10 boxes, 32 classes
        detections = self.nms(predictions, conf_threshold=0.5)
        assert len(detections) == 0

    def test_nms_single_detection(self):
        """Test NMS with single detection."""
        predictions = np.zeros((1, 1, 5 + 32))
        predictions[0, 0, :4] = [320, 320, 100, 100]  # x, y, w, h
        predictions[0, 0, 4] = 0.9  # object confidence
        predictions[0, 0, 5] = 0.9  # class 0 confidence

        detections = self.nms(predictions, conf_threshold=0.5)
        assert len(detections) == 1
        assert detections[0].class_id == 0
        assert detections[0].confidence > 0.8

    def test_nms_multiple_detections_same_class(self):
        """Test NMS suppresses overlapping boxes of same class."""
        predictions = np.zeros((1, 2, 5 + 32))
        # Two overlapping boxes
        predictions[0, 0, :4] = [320, 320, 100, 100]
        predictions[0, 0, 4] = 0.9
        predictions[0, 0, 5] = 0.9

        predictions[0, 1, :4] = [325, 325, 100, 100]  # Slightly offset
        predictions[0, 1, 4] = 0.8
        predictions[0, 1, 5] = 0.8

        detections = self.nms(predictions, conf_threshold=0.5, iou_threshold=0.5)
        assert len(detections) == 1  # Should suppress one


class TestTemporalStabilizer:
    """Test temporal stabilization."""

    def setup_method(self):
        self.stabilizer = TemporalStabilizer(
            window_size=5,
            min_votes=3,
            confidence_threshold=0.5,
            stability_threshold=0.6,
            mode=StabilizationMode.MAJORITY_VOTE
        )

    def test_stabilizer_empty(self):
        """Test stabilizer with no detections."""
        result = self.stabilizer.update([])
        assert len(result) == 0

    def test_stabilizer_stable_detection(self):
        """Test stabilizer confirms stable detection."""
        from ai.nms import Detection

        detections = [
            Detection(bbox=np.array([100, 100, 200, 200]), confidence=0.9, class_id=0, class_name='ain'),
            Detection(bbox=np.array([100, 100, 200, 200]), confidence=0.9, class_id=0, class_name='ain'),
            Detection(bbox=np.array([100, 100, 200, 200]), confidence=0.9, class_id=0, class_name='ain'),
        ]

        for _ in range(3):
            result = self.stabilizer.update(detections)

        stable = [r for r in result if r.is_stable]
        assert len(stable) == 1
        assert stable[0].class_id == 0

    def test_stabilizer_unstable_detection(self):
        """Test stabilizer rejects unstable detection."""
        from ai.nms import Detection

        # Different class each frame
        for i in range(3):
            detections = [Detection(
                bbox=np.array([100, 100, 200, 200]),
                confidence=0.9,
                class_id=i,
                class_name=f'class_{i}'
            )]
            self.stabilizer.update(detections)

        # No stable predictions
        result = self.stabilizer.update([])
        stable = [r for r in result if r.is_stable]
        assert len(stable) == 0


class TestDuplicateFilter:
    """Test duplicate prediction filtering."""

    def setup_method(self):
        self.filter = DuplicateFilter(
            cooldown_frames=10,
            similarity_threshold=0.85,
            enable_letter_lock=True,
            lock_duration_frames=15
        )

    def test_filter_allows_first_detection(self):
        """Test filter allows first detection."""
        from ai.temporal_stabilizer import StabilizedPrediction

        pred = StabilizedPrediction(
            class_id=0, class_name='ain', confidence=0.9,
            stability_score=0.8, is_stable=True, frames_in_window=5
        )

        result = self.filter.filter(pred)
        assert result.should_add_to_sentence is True

    def test_filter_suppresses_duplicate(self):
        """Test filter suppresses duplicate detection."""
        from ai.temporal_stabilizer import StabilizedPrediction

        pred = StabilizedPrediction(
            class_id=0, class_name='ain', confidence=0.9,
            stability_score=0.8, is_stable=True, frames_in_window=5
        )

        self.filter.filter(pred)
        result = self.filter.filter(pred)

        assert result.should_add_to_sentence is False
        assert result.cooldown_remaining > 0

    def test_filter_allows_different_class(self):
        """Test filter allows different class."""
        from ai.temporal_stabilizer import StabilizedPrediction

        pred1 = StabilizedPrediction(
            class_id=0, class_name='ain', confidence=0.9,
            stability_score=0.8, is_stable=True, frames_in_window=5
        )
        pred2 = StabilizedPrediction(
            class_id=1, class_name='al', confidence=0.9,
            stability_score=0.8, is_stable=True, frames_in_window=5
        )

        self.filter.filter(pred1)
        result = self.filter.filter(pred2)

        assert result.should_add_to_sentence is True


class TestSentenceBuilder:
    """Test Arabic sentence builder."""

    def setup_method(self):
        self.builder = SentenceBuilder(
            max_length=500,
            word_separator=' ',
            auto_space=True,
            rtl_rendering=True,
            confidence_threshold=0.5
        )

    def test_add_letter(self):
        """Test adding letters to sentence."""
        from ai.duplicate_filter import FilteredPrediction
        from ai.temporal_stabilizer import StabilizedPrediction

        pred = FilteredPrediction(
            class_id=0, class_name='ain', confidence=0.9,
            stability_score=0.8, should_add_to_sentence=True,
            state='detected', cooldown_remaining=0
        )

        added = self.builder.add_letter(pred)
        assert added is True
        assert 'ain' in self.builder.get_raw_text()

    def test_add_space(self):
        """Test adding space (word separator)."""
        from ai.duplicate_filter import FilteredPrediction
        from ai.temporal_stabilizer import StabilizedPrediction

        pred = FilteredPrediction(
            class_id=0, class_name='ain', confidence=0.9,
            stability_score=0.8, should_add_to_sentence=True,
            state='detected', cooldown_remaining=0
        )

        self.builder.add_letter(pred)
        self.builder.add_space()

        assert 'ain ' in self.builder.get_raw_text()

    def test_undo_redo(self):
        """Test undo and redo functionality."""
        from ai.duplicate_filter import FilteredPrediction
        from ai.temporal_stabilizer import StabilizedPrediction

        pred = FilteredPrediction(
            class_id=0, class_name='ain', confidence=0.9,
            stability_score=0.8, should_add_to_sentence=True,
            state='detected', cooldown_remaining=0
        )

        self.builder.add_letter(pred)
        self.builder.undo()
        assert self.builder.get_raw_text() == ''

        self.builder.redo()
        assert 'ain' in self.builder.get_raw_text()

    def test_clear(self):
        """Test clearing sentence."""
        from ai.duplicate_filter import FilteredPrediction
        from ai.temporal_stabilizer import StabilizedPrediction

        pred = FilteredPrediction(
            class_id=0, class_name='ain', confidence=0.9,
            stability_score=0.8, should_add_to_sentence=True,
            state='detected', cooldown_remaining=0
        )

        self.builder.add_letter(pred)
        self.builder.clear()

        assert self.builder.get_raw_text() == ''

    def test_export_json(self):
        """Test JSON export."""
        from ai.duplicate_filter import FilteredPrediction
        from ai.temporal_stabilizer import StabilizedPrediction

        pred = FilteredPrediction(
            class_id=0, class_name='ain', confidence=0.9,
            stability_score=0.8, should_add_to_sentence=True,
            state='detected', cooldown_remaining=0
        )

        self.builder.add_letter(pred)
        json_str = self.builder.export_json()

        import json
        data = json.loads(json_str)
        assert 'sentence' in data
        assert 'words' in data
        assert 'stats' in data

    def test_rtl_rendering(self):
        """Test RTL text rendering."""
        from ai.duplicate_filter import FilteredPrediction
        from ai.temporal_stabilizer import StabilizedPrediction

        pred = FilteredPrediction(
            class_id=0, class_name='ain', confidence=0.9,
            stability_score=0.8, should_add_to_sentence=True,
            state='detected', cooldown_remaining=0
        )

        self.builder.add_letter(pred)
        display = self.builder.get_display_text()

        # Should contain RTL marks
        assert '\u202B' in display or '\u202C' in display


if __name__ == '__main__':
    pytest.main([__file__, '-v'])