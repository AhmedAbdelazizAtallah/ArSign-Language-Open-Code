"""
Image Preprocessing Pipeline

Implements the exact preprocessing pipeline used during YOLO training:
Letterbox Resize -> RGB -> Normalize -> Float32 -> CHW -> Batch

This must match the Ultralytics preprocessing exactly to avoid
accuracy degradation between PyTorch and ONNX Runtime.
"""

import cv2
import numpy as np
from typing import Tuple, Optional, Union
from pathlib import Path

from ai.config import PreprocessConfig, get_ai_config


class LetterboxResize:
    """
    Letterbox resize preserving aspect ratio with padding.

    Matches Ultralytics letterbox implementation exactly.
    """

    def __init__(
        self,
        new_shape: Tuple[int, int] = (640, 640),
        color: Tuple[int, int, int] = (114, 114, 114),
        auto: bool = True,
        scale_fill: bool = False,
        scaleup: bool = True,
        stride: int = 32
    ):
        self.new_shape = new_shape
        self.color = color
        self.auto = auto
        self.scale_fill = scale_fill
        self.scaleup = scaleup
        self.stride = stride

    def __call__(self, image: np.ndarray) -> Tuple[np.ndarray, Tuple[float, float], Tuple[float, float]]:
        """
        Apply letterbox resize.

        Args:
            image: Input image (H, W, C) in BGR or RGB

        Returns:
            Tuple of (resized_image, ratio, (dw, dh))
            - resized_image: Padded image (new_shape[0], new_shape[1], C)
            - ratio: Scaling ratio (min of height/width ratios)
            - (dw, dh): Padding widths
        """
        shape = image.shape[:2]  # h, w
        if isinstance(self.new_shape, int):
            self.new_shape = (self.new_shape, self.new_shape)

        # Scale ratio (new / old)
        r = min(self.new_shape[0] / shape[0], self.new_shape[1] / shape[1])
        if not self.scaleup:
            r = min(r, 1.0)

        # Compute padding
        ratio = r, r
        new_unpad = int(round(shape[1] * r)), int(round(shape[0] * r))
        dw, dh = self.new_shape[1] - new_unpad[0], self.new_shape[0] - new_unpad[1]

        if self.auto:
            dw, dh = np.mod(dw, self.stride), np.mod(dh, self.stride)
        elif self.scale_fill:
            dw, dh = 0.0, 0.0
            new_unpad = (self.new_shape[1], self.new_shape[0])
            ratio = self.new_shape[1] / shape[1], self.new_shape[0] / shape[0]

        dw /= 2
        dh /= 2

        if shape[::-1] != new_unpad:
            image = cv2.resize(image, new_unpad, interpolation=cv2.INTER_LINEAR)

        top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
        left, right = int(round(dw - 0.1)), int(round(dw + 0.1))

        image = cv2.copyMakeBorder(
            image, top, bottom, left, right,
            cv2.BORDER_CONSTANT, value=self.color
        )

        return image, ratio, (dw, dh)


class Preprocessor:
    """
    Complete preprocessing pipeline for YOLO inference.

    Pipeline:
    1. Load image (BGR)
    2. Letterbox resize (preserve aspect ratio)
    3. BGR -> RGB conversion
    4. Normalize to [0, 1] then apply mean/std
    5. Convert to float32
    6. HWC -> CHW
    7. Add batch dimension
    """

    def __init__(self, config: Optional[PreprocessConfig] = None):
        self.config = config or get_ai_config().preprocess
        self.letterbox = LetterboxResize(
            new_shape=self.config.new_shape,
            stride=32
        )
        self._mean = np.array(self.config.mean, dtype=np.float32).reshape(1, 1, 3)
        self._std = np.array(self.config.std, dtype=np.float32).reshape(1, 1, 3)

    def preprocess(
        self,
        image: Union[np.ndarray, str, Path],
        return_meta: bool = False
    ) -> Union[np.ndarray, Tuple[np.ndarray, dict]]:
        """
        Preprocess image for model inference.

        Args:
            image: Input image as numpy array (H, W, C) BGR, or file path
            return_meta: If True, return preprocessing metadata

        Returns:
            Preprocessed tensor (1, 3, 640, 640) float32
            Optional metadata dict with ratio, padding info
        """
        # Load image if path provided
        if isinstance(image, (str, Path)):
            image = self._load_image(image)

        # Validate input
        if image is None:
            raise ValueError("Failed to load image")
        if image.ndim != 3 or image.shape[2] != 3:
            raise ValueError(f"Expected 3-channel image, got shape {image.shape}")

        original_shape = image.shape[:2]

        # Letterbox resize
        image, ratio, (dw, dh) = self.letterbox(image)

        # BGR to RGB
        if self.config.swap_rb:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Normalize to [0, 1]
        image = image.astype(np.float32) / 255.0

        # Apply mean/std normalization
        image = (image - self._mean) / self._std

        # HWC -> CHW
        image = image.transpose(2, 0, 1)

        # Add batch dimension
        image = np.expand_dims(image, axis=0)

        # Ensure contiguous array
        image = np.ascontiguousarray(image, dtype=np.float32)

        if return_meta:
            meta = {
                "original_shape": original_shape,
                "resized_shape": image.shape[2:],
                "ratio": ratio,
                "padding": (dw, dh),
            }
            return image, meta

        return image

    def preprocess_batch(
        self,
        images: list[Union[np.ndarray, str, Path]]
    ) -> Tuple[np.ndarray, list[dict]]:
        """
        Preprocess multiple images as a batch.

        Args:
            images: List of images or paths

        Returns:
            Batched tensor (N, 3, 640, 640) and metadata list
        """
        tensors = []
        metas = []
        for img in images:
            tensor, meta = self.preprocess(img, return_meta=True)
            tensors.append(tensor)
            metas.append(meta)
        return np.concatenate(tensors, axis=0), metas

    def _load_image(self, path: Union[str, Path]) -> Optional[np.ndarray]:
        """Load image from file."""
        path = str(path)
        image = cv2.imread(path)
        if image is None:
            raise ValueError(f"Failed to load image: {path}")
        return image

    def reverse_letterbox(
        self,
        boxes: np.ndarray,
        meta: dict
    ) -> np.ndarray:
        """
        Convert boxes from letterboxed coordinates to original image coordinates.

        Args:
            boxes: Bounding boxes in letterboxed space (x1, y1, x2, y2)
            meta: Metadata from preprocess()

        Returns:
            Boxes in original image coordinates
        """
        if len(boxes) == 0:
            return boxes

        ratio = meta["ratio"]
        dw, dh = meta["padding"]
        orig_h, orig_w = meta["original_shape"]

        boxes = boxes.copy()
        boxes[:, [0, 2]] -= dw
        boxes[:, [1, 3]] -= dh
        boxes[:, :4] /= np.array([ratio[0], ratio[1], ratio[0], ratio[1]])

        # Clip to original image bounds
        boxes[:, [0, 2]] = np.clip(boxes[:, [0, 2]], 0, orig_w)
        boxes[:, [1, 3]] = np.clip(boxes[:, [1, 3]], 0, orig_h)

        return boxes


_preprocessor_instance: Optional[Preprocessor] = None


def get_preprocessor(config: Optional[PreprocessConfig] = None) -> Preprocessor:
    """Get singleton preprocessor instance."""
    global _preprocessor_instance
    if _preprocessor_instance is None:
        _preprocessor_instance = Preprocessor(config)
    return _preprocessor_instance