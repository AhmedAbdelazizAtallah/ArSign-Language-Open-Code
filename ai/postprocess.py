"""
Post-Processing Pipeline

Combines NMS, confidence filtering, and coordinate transformation
to produce final detection results ready for temporal stabilization.
"""

import numpy as np
from typing import List, Optional, Tuple
from dataclasses import dataclass

from ai.config import get_ai_config
from ai.nms import NonMaxSuppression, Detection, get_nms
from ai.preprocess import Preprocessor, get_preprocessor


@dataclass
class ProcessedDetection:
    """Final processed detection with all metadata."""
    bbox: np.ndarray          # [x1, y1, x2, y2] in original image coordinates
    confidence: float
    class_id: int
    class_name: str
    original_bbox: np.ndarray # [x1, y1, x2, y2] in letterboxed coordinates


class PostProcessor:
    """
    Complete post-processing pipeline.

    Pipeline:
    1. Non-Maximum Suppression
    2. Confidence filtering
    3. Coordinate transformation (letterbox -> original)
    4. Result formatting
    """

    def __init__(
        self,
        nms: Optional[NonMaxSuppression] = None,
        preprocessor: Optional[Preprocessor] = None
    ):
        self.config = get_ai_config()
        self.nms = nms or get_nms()
        self.preprocessor = preprocessor or get_preprocessor()

    def process(
        self,
        predictions: np.ndarray,
        meta: dict,
        conf_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
        max_detections: Optional[int] = None
    ) -> List[ProcessedDetection]:
        """
        Process raw model predictions into final detections.

        Args:
            predictions: Raw model output
            meta: Preprocessing metadata (ratio, padding, original_shape)
            conf_threshold: Override confidence threshold
            iou_threshold: Override IoU threshold
            max_detections: Override max detections

        Returns:
            List of processed detections
        """
        # Apply NMS
        detections = self.nms(
            predictions,
            conf_threshold=conf_threshold,
            iou_threshold=iou_threshold,
            max_detections=max_detections
        )

        if not detections:
            return []

        # Convert boxes back to original image coordinates
        processed = []
        for det in detections:
            original_bbox = det.bbox.copy()
            bbox_orig = self.preprocessor.reverse_letterbox(
                det.bbox.reshape(1, 4), meta
            )[0]

            processed.append(ProcessedDetection(
                bbox=bbox_orig,
                confidence=det.confidence,
                class_id=det.class_id,
                class_name=det.class_name,
                original_bbox=original_bbox
            ))

        return processed

    def process_batch(
        self,
        predictions_batch: np.ndarray,
        metas: List[dict],
        conf_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
        max_detections: Optional[int] = None
    ) -> List[List[ProcessedDetection]]:
        """Process a batch of predictions."""
        results = []
        for i, (preds, meta) in enumerate(zip(predictions_batch, metas)):
            results.append(self.process(
                preds, meta, conf_threshold, iou_threshold, max_detections
            ))
        return results


_post_processor_instance: Optional[PostProcessor] = None


def get_post_processor() -> PostProcessor:
    """Get singleton post-processor instance."""
    global _post_processor_instance
    if _post_processor_instance is None:
        _post_processor_instance = PostProcessor()
    return _post_processor_instance