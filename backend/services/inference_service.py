"""
Inference Service

Orchestrates the complete inference pipeline.
"""

import time
import logging
import numpy as np
import cv2
import base64
from typing import List, Optional, Dict, Any
from pathlib import Path

from backend.config.settings import get_settings
from backend.services.model_service import ModelService
from backend.models.domain import InferenceResult, DetectionModel
from backend.logging.config import get_logger

logger = get_logger(__name__)


class InferenceService:
    """Main inference orchestration service."""

    def __init__(self):
        self.settings = get_settings()
        self.model_service = ModelService()
        self._stats = {
            "total_inferences": 0,
            "total_preprocess_ms": 0.0,
            "total_inference_ms": 0.0,
            "total_nms_ms": 0.0,
            "errors": 0
        }

    async def initialize(self):
        """Initialize service."""
        logger.info("Initializing inference service...")
        await self.model_service.initialize()
        logger.info("Inference service initialized")

    async def shutdown(self):
        """Shutdown service."""
        await self.model_service.shutdown()
        logger.info("Inference service shutdown")

    def preprocess(self, image: np.ndarray) -> tuple:
        """Preprocess image for model."""
        h, w = image.shape[:2]
        scale = min(640 / h, 640 / w)
        new_w, new_h = int(w * scale), int(h * scale)

        # Resize
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        # Pad
        padded = np.full((640, 640, 3), 114, dtype=np.uint8)
        top = (640 - new_h) // 2
        left = (640 - new_w) // 2
        padded[top:top+new_h, left:left+new_w] = resized

        # BGR to RGB
        rgb = cv2.cvtColor(padded, cv2.COLOR_BGR2RGB)

        # Normalize
        normalized = rgb.astype(np.float32) / 255.0

        # HWC to CHW
        chw = normalized.transpose(2, 0, 1)

        # Batch dimension
        tensor = np.expand_dims(chw, axis=0).astype(np.float32)

        meta = {
            "original_shape": (h, w),
            "scale": scale,
            "padding": (top, left),
            "resized_shape": (new_h, new_w)
        }

        return tensor, meta

    def postprocess(
        self,
        outputs: np.ndarray,
        meta: Dict,
        conf_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
        max_detections: Optional[int] = None
    ) -> List[DetectionModel]:
        """Postprocess model outputs."""
        conf = conf_threshold or self.settings.conf_threshold
        iou = iou_threshold or self.settings.iou_threshold
        max_det = max_detections or self.settings.max_detections

        predictions = outputs[0] if outputs.ndim == 3 else outputs

        # Filter by confidence
        if predictions.ndim == 2:
            obj_conf = predictions[:, 4]
            mask = obj_conf >= conf
            predictions = predictions[mask]

        if len(predictions) == 0:
            return []

        # xywh to xyxy
        boxes = predictions[:, :4].copy()
        boxes[:, 0] = predictions[:, 0] - predictions[:, 2] / 2
        boxes[:, 1] = predictions[:, 1] - predictions[:, 3] / 2
        boxes[:, 2] = predictions[:, 0] + predictions[:, 2] / 2
        boxes[:, 3] = predictions[:, 1] + predictions[:, 3] / 2

        scores = predictions[:, 4] * predictions[:, 5:].max(axis=1)
        class_ids = predictions[:, 5:].argmax(axis=1)

        # NMS
        keep = self._nms(boxes, scores, class_ids, iou, max_det)

        detections = []
        for idx in keep:
            box = boxes[idx]
            # Convert to original coordinates
            box[0] = (box[0] - meta["padding"][1]) / meta["scale"]
            box[1] = (box[1] - meta["padding"][0]) / meta["scale"]
            box[2] = (box[2] - meta["padding"][1]) / meta["scale"]
            box[3] = (box[3] - meta["padding"][0]) / meta["scale"]

            h, w = meta["original_shape"]
            box[0] = np.clip(box[0], 0, w)
            box[1] = np.clip(box[1], 0, h)
            box[2] = np.clip(box[2], 0, w)
            box[3] = np.clip(box[3], 0, h)

            detections.append(DetectionModel(
                bbox=box.tolist(),
                confidence=float(scores[idx]),
                class_id=int(class_ids[idx]),
                class_name=self._get_class_name(int(class_ids[idx]))
            ))

        return detections

    def _nms(self, boxes, scores, class_ids, iou_threshold, max_detections):
        """Non-maximum suppression."""
        order = scores.argsort()[::-1]
        keep = []

        while len(order) > 0 and len(keep) < max_detections:
            i = order[0]
            keep.append(i)

            if len(order) == 1:
                break

            x1 = np.maximum(boxes[i, 0], boxes[order[1:], 0])
            y1 = np.maximum(boxes[i, 1], boxes[order[1:], 1])
            x2 = np.minimum(boxes[i, 2], boxes[order[1:], 2])
            y2 = np.minimum(boxes[i, 3], boxes[order[1:], 3])

            inter = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
            area_i = (boxes[i, 2] - boxes[i, 0]) * (boxes[i, 3] - boxes[i, 1])
            area_others = (boxes[order[1:], 2] - boxes[order[1:], 0]) * \
                          (boxes[order[1:], 3] - boxes[order[1:], 1])

            iou = inter / (area_i + area_others - inter + 1e-6)

            order = order[1:][iou <= iou_threshold]

        return np.array(keep)

    def _get_class_name(self, class_id: int) -> str:
        classes = [
            "ain", "al", "aleff", "bb", "dal", "dha", "dhad", "fa",
            "gaaf", "ghain", "ha", "haa", "jeem", "kaaf", "khaa", "la",
            "laam", "meem", "nun", "ra", "saad", "seen", "sheen", "ta",
            "taa", "thaa", "thal", "toot", "waw", "ya", "yaa", "zay"
        ]
        if 0 <= class_id < len(classes):
            return classes[class_id]
        return f"class_{class_id}"

    def infer_image(
        self,
        image: np.ndarray,
        conf_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
        max_detections: Optional[int] = None
    ) -> InferenceResult:
        """Run inference on image."""
        start_total = time.perf_counter()

        # Preprocess
        pre_start = time.perf_counter()
        tensor, meta = self.preprocess(image)
        pre_time = (time.perf_counter() - pre_start) * 1000

        # Inference
        inf_start = time.perf_counter()
        outputs = self.model_service.infer(tensor)
        inf_time = (time.perf_counter() - inf_start) * 1000

        # Postprocess
        nms_start = time.perf_counter()
        detections = self.postprocess(
            outputs[0],
            meta,
            conf_threshold,
            iou_threshold,
            max_detections
        )
        nms_time = (time.perf_counter() - nms_start) * 1000

        total_time = (time.perf_counter() - start_total) * 1000
        fps = 1000 / total_time if total_time > 0 else 0

        # Update stats
        self._stats["total_inferences"] += 1
        self._stats["total_preprocess_ms"] += pre_time
        self._stats["total_inference_ms"] += inf_time
        self._stats["total_nms_ms"] += nms_time

        return InferenceResult(
            detections=detections,
            preprocess_ms=pre_time,
            inference_ms=inf_time,
            nms_ms=nms_time,
            total_ms=total_time,
            fps=fps,
            provider=self.model_service.session.get_providers()[0]
        )

    async def infer_video(
        self,
        video_path: str,
        conf_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
        max_detections: Optional[int] = None,
        sample_rate: int = 1
    ) -> Dict[str, Any]:
        """Process video file."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        all_predictions = []
        frame_idx = 0
        processed = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_rate == 0:
                result = self.infer_image(frame, conf_threshold, iou_threshold, max_detections)
                all_predictions.append([
                    {
                        "bbox": det.bbox,
                        "confidence": det.confidence,
                        "class_id": det.class_id,
                        "class_name": det.class_name
                    }
                    for det in result.detections
                ])
                processed += 1
            else:
                all_predictions.append([])

            frame_idx += 1

        cap.release()

        return {
            "video_info": {
                "total_frames": total_frames,
                "fps": fps,
                "width": width,
                "height": height,
                "duration_seconds": total_frames / fps if fps > 0 else 0
            },
            "processed_frames": processed,
            "sample_rate": sample_rate,
            "predictions": all_predictions
        }

    def infer_base64(
        self,
        base64_str: str,
        conf_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
        max_detections: Optional[int] = None
    ) -> InferenceResult:
        """Infer from base64 encoded image."""
        # Decode base64
        img_data = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Invalid image data")

        return self.infer_image(image, conf_threshold, iou_threshold, max_detections)

    def get_stats(self) -> Dict[str, Any]:
        """Get inference statistics."""
        stats = self._stats.copy()
        if stats["total_inferences"] > 0:
            stats["avg_preprocess_ms"] = stats["total_preprocess_ms"] / stats["total_inferences"]
            stats["avg_inference_ms"] = stats["total_inference_ms"] / stats["total_inferences"]
            stats["avg_nms_ms"] = stats["total_nms_ms"] / stats["total_inferences"]
            stats["avg_total_ms"] = (stats["total_preprocess_ms"] +
                                     stats["total_inference_ms"] +
                                     stats["total_nms_ms"]) / stats["total_inferences"]
        return stats