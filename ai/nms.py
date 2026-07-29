"""
Optimized Non-Maximum Suppression (NMS)

Implements fast NMS with configurable thresholds, supporting both
class-agnostic and per-class suppression.
"""

import numpy as np
from typing import List, Optional, Tuple
from dataclasses import dataclass

from ai.config import get_ai_config


@dataclass
class Detection:
    """Single detection result."""
    bbox: np.ndarray          # [x1, y1, x2, y2] in letterboxed coordinates
    confidence: float
    class_id: int
    class_name: str


class NonMaxSuppression:
    """
    Optimized Non-Maximum Suppression.

    Features:
    - Vectorized IoU computation
    - Class-agnostic and per-class modes
    - Configurable thresholds
    - Multi-label support
    """

    def __init__(self, config=None):
        self.config = config or get_ai_config()
        self.class_names = self.config.model.classes

    def __call__(
        self,
        predictions: np.ndarray,
        conf_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
        max_detections: Optional[int] = None,
        class_agnostic: Optional[bool] = None,
        multi_label: Optional[bool] = None
    ) -> List[Detection]:
        """
        Apply NMS to raw predictions.

        Args:
            predictions: Raw model output (N, 5 + num_classes) or (N, 4 + num_classes)
            conf_threshold: Confidence threshold
            iou_threshold: IoU threshold for suppression
            max_detections: Maximum detections to keep
            class_agnostic: Use class-agnostic NMS
            multi_label: Allow multiple labels per box

        Returns:
            List of Detection objects
        """
        conf_thresh = conf_threshold or self.config.nms.conf_threshold
        iou_thresh = iou_threshold or self.config.nms.iou_threshold
        max_det = max_detections or self.config.nms.max_detections
        cls_agnostic = class_agnostic if class_agnostic is not None else self.config.nms.class_agnostic
        multi_lbl = multi_label if multi_label is not None else self.config.nms.multi_label

        # Parse predictions
        # YOLO format: [x_center, y_center, width, height, obj_conf, class_probs...]
        # or: [x1, y1, x2, y2, obj_conf, class_probs...]

        # Filter by confidence
        if predictions.ndim == 3:
            predictions = predictions[0]  # Batch size 1

        # Extract boxes and scores
        boxes = predictions[:, :4]
        obj_conf = predictions[:, 4]
        class_probs = predictions[:, 5:]

        # Apply object confidence
        scores = obj_conf * class_probs.max(axis=1)
        mask = scores >= conf_thresh
        if not mask.any():
            return []

        boxes = boxes[mask]
        scores = scores[mask]
        class_ids = class_probs[mask].argmax(axis=1)
        class_scores = class_probs[mask].max(axis=1)

        # Convert to x1y1x2y2 if needed
        if self.config.nms.box_format == "xywh":
            boxes = self._xywh_to_xyxy(boxes)

        # Apply NMS
        keep_indices = self._nms(
            boxes, scores, class_ids,
            iou_thresh, max_det, cls_agnostic, multi_lbl
        )

        # Build detections
        detections = []
        for idx in keep_indices:
            detections.append(Detection(
                bbox=boxes[idx],
                confidence=float(scores[idx]),
                class_id=int(class_ids[idx]),
                class_name=self.class_names[class_ids[idx]]
            ))

        return detections

    def _xywh_to_xyxy(self, boxes: np.ndarray) -> np.ndarray:
        """Convert center-x, center-y, width, height to x1, y1, x2, y2."""
        x_c, y_c, w, h = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
        x1 = x_c - w / 2
        y1 = y_c - h / 2
        x2 = x_c + w / 2
        y2 = y_c + h / 2
        return np.stack([x1, y1, x2, y2], axis=1)

    def _nms(
        self,
        boxes: np.ndarray,
        scores: np.ndarray,
        class_ids: np.ndarray,
        iou_threshold: float,
        max_detections: int,
        class_agnostic: bool,
        multi_label: bool
    ) -> np.ndarray:
        """
        Core NMS implementation.

        Returns indices of kept boxes.
        """
        if len(boxes) == 0:
            return np.array([], dtype=int)

        if class_agnostic:
            return self._nms_class_agnostic(boxes, scores, iou_threshold, max_detections)
        else:
            return self._nms_per_class(boxes, scores, class_ids, iou_threshold, max_detections, multi_label)

    def _nms_class_agnostic(
        self,
        boxes: np.ndarray,
        scores: np.ndarray,
        iou_threshold: float,
        max_detections: int
    ) -> np.ndarray:
        """Class-agnostic NMS - suppress all overlapping boxes regardless of class."""
        # Sort by score descending
        order = scores.argsort()[::-1]

        keep = []
        while len(order) > 0 and len(keep) < max_detections:
            i = order[0]
            keep.append(i)

            if len(order) == 1:
                break

            # Compute IoU of remaining boxes with the kept box
            ious = self._compute_ious(boxes[i:i+1], boxes[order[1:]])
            # Keep boxes with IoU below threshold
            order = order[1:][ious < iou_threshold]

        return np.array(keep, dtype=int)

    def _nms_per_class(
        self,
        boxes: np.ndarray,
        scores: np.ndarray,
        class_ids: np.ndarray,
        iou_threshold: float,
        max_detections: int,
        multi_label: bool
    ) -> np.ndarray:
        """Per-class NMS - suppress overlapping boxes within each class."""
        unique_classes = np.unique(class_ids)
        all_keep = []

        for cls in unique_classes:
            cls_mask = class_ids == cls
            cls_boxes = boxes[cls_mask]
            cls_scores = scores[cls_mask]
            cls_indices = np.where(cls_mask)[0]

            # Sort by score
            order = cls_scores.argsort()[::-1]

            keep = []
            while len(order) > 0 and len(keep) < max_detections:
                i = order[0]
                keep.append(cls_indices[i])

                if len(order) == 1:
                    break

                ious = self._compute_ious(cls_boxes[i:i+1], cls_boxes[order[1:]])
                order = order[1:][ious < iou_threshold]

            all_keep.extend(keep)

        # Sort all kept boxes by score
        if all_keep:
            all_keep = np.array(all_keep)
            all_scores = scores[all_keep]
            all_keep = all_keep[all_scores.argsort()[::-1]]
            return all_keep[:max_detections]

        return np.array([], dtype=int)

    def _compute_ious(
        self,
        boxes1: np.ndarray,
        boxes2: np.ndarray
    ) -> np.ndarray:
        """
        Compute IoU between two sets of boxes.

        Args:
            boxes1: (N, 4) boxes
            boxes2: (M, 4) boxes

        Returns:
            (N, M) IoU matrix
        """
        # boxes1: (N, 4), boxes2: (M, 4)
        # Expand dims for broadcasting
        b1_x1 = boxes1[:, 0:1]
        b1_y1 = boxes1[:, 1:2]
        b1_x2 = boxes1[:, 2:3]
        b1_y2 = boxes1[:, 3:4]

        b2_x1 = boxes2[:, 0:1].T
        b2_y1 = boxes2[:, 1:2].T
        b2_x2 = boxes2[:, 2:3].T
        b2_y2 = boxes2[:, 3:4].T

        # Intersection
        inter_x1 = np.maximum(b1_x1, b2_x1)
        inter_y1 = np.maximum(b1_y1, b2_y1)
        inter_x2 = np.minimum(b1_x2, b2_x2)
        inter_y2 = np.minimum(b1_y2, b2_y2)

        inter_w = np.maximum(0, inter_x2 - inter_x1)
        inter_h = np.maximum(0, inter_y2 - inter_y1)
        inter_area = inter_w * inter_h

        # Union
        area1 = (b1_x2 - b1_x1) * (b1_y2 - b1_y1)
        area2 = (b2_x2 - b2_x1) * (b2_y2 - b2_y1)
        union_area = area1 + area2 - inter_area

        iou = inter_area / (union_area + 1e-6)
        return iou


_nms_instance: Optional[NonMaxSuppression] = None


def get_nms(config=None) -> NonMaxSuppression:
    """Get singleton NMS instance."""
    global _nms_instance
    if _nms_instance is None:
        _nms_instance = NonMaxSuppression(config)
    return _nms_instance