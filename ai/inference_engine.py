"""
ONNX Model Loader and Inference Engine

Handles model loading, warmup, execution provider selection,
and high-performance inference with ONNX Runtime.
"""

import os
import time
import logging
from pathlib import Path
from typing import Optional, List, Tuple, Dict, Any
from dataclasses import dataclass

import numpy as np
import onnxruntime as ort

from ai.config import get_ai_config


logger = logging.getLogger(__name__)


@dataclass
class ModelMetadata:
    """Model metadata from ONNX file."""
    input_name: str
    input_shape: Tuple[int, ...]
    output_names: List[str]
    output_shapes: List[Tuple[int, ...]]
    model_path: str
    providers: List[str]
    ir_version: int
    opset_version: int
    producer_name: str
    domain: str
    model_version: int
    doc_string: str


class ModelLoader:
    """
    ONNX model loader with automatic execution provider selection.

    Features:
    - Auto GPU/CPU detection
    - Model warmup
    - Metadata extraction
    - Session reuse
    """

    def __init__(self, config=None):
        self.config = config or get_ai_config()
        self._session: Optional[ort.InferenceSession] = None
        self._metadata: Optional[ModelMetadata] = None
        self._input_name: Optional[str] = None
        self._output_names: Optional[List[str]] = None

    def load(self, model_path: Optional[str] = None) -> ort.InferenceSession:
        """
        Load ONNX model and create inference session.

        Args:
            model_path: Path to ONNX model file

        Returns:
            Configured InferenceSession
        """
        path = model_path or self.config.model.path
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model not found: {path}")

        logger.info(f"Loading model from {path}")

        # Determine execution providers
        providers = self._get_providers()
        logger.info(f"Using execution providers: {providers}")

        # Create session options
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.enable_cpu_mem_arena = True
        sess_options.enable_mem_pattern = True
        sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        sess_options.intra_op_num_threads = self.config.model.intra_op_threads
        sess_options.inter_op_num_threads = self.config.model.inter_op_threads

        # Load model
        self._session = ort.InferenceSession(
            path,
            sess_options=sess_options,
            providers=providers
        )

        # Extract metadata
        self._metadata = self._extract_metadata(path)
        self._input_name = self._session.get_inputs()[0].name
        self._output_names = [o.name for o in self._session.get_outputs()]

        logger.info(f"Model loaded successfully: {self._metadata.input_shape}")
        logger.info(f"Output names: {self._output_names}")

        return self._session

    def _get_providers(self) -> List[str]:
        """Get available execution providers in priority order."""
        available = ort.get_available_providers()
        preferred = self.config.model.execution_providers

        providers = []
        for p in preferred:
            if p in available:
                providers.append(p)

        # Fallback to CPU if nothing else available
        if 'CPUExecutionProvider' in available and 'CPUExecutionProvider' not in providers:
            providers.append('CPUExecutionProvider')

        return providers

    def _extract_metadata(self, model_path: str) -> ModelMetadata:
        """Extract metadata from ONNX model."""
        session = self._session
        model = session.get_modelmeta()

        input_info = session.get_inputs()[0]
        output_infos = session.get_outputs()

        return ModelMetadata(
            input_name=input_info.name,
            input_shape=tuple(input_info.shape),
            output_names=[o.name for o in output_infos],
            output_shapes=[tuple(o.shape) for o in output_infos],
            model_path=model_path,
            providers=session.get_providers(),
            ir_version=model.ir_version,
            opset_version=model.opset_version,
            producer_name=model.producer_name,
            domain=model.domain,
            model_version=model.version,
            doc_string=model.doc_string
        )

    def warmup(self, num_runs: int = 5) -> Dict[str, float]:
        """
        Warm up model with dummy inputs.

        Args:
            num_runs: Number of warmup runs

        Returns:
            Warmup timing statistics
        """
        if self._session is None:
            raise RuntimeError("Model not loaded. Call load() first.")

        logger.info(f"Warming up model with {num_runs} runs...")

        # Create dummy input
        dummy_input = np.random.randn(*self._metadata.input_shape).astype(np.float32)

        times = []
        for i in range(num_runs):
            start = time.perf_counter()
            self._session.run(self._output_names, {self._input_name: dummy_input})
            elapsed = (time.perf_counter() - start) * 1000  # ms
            times.append(elapsed)

        stats = {
            'runs': num_runs,
            'avg_ms': np.mean(times),
            'min_ms': np.min(times),
            'max_ms': np.max(times),
            'std_ms': np.std(times)
        }

        logger.info(f"Warmup complete: avg={stats['avg_ms']:.2f}ms")
        return stats

    @property
    def session(self) -> ort.InferenceSession:
        """Get inference session."""
        if self._session is None:
            raise RuntimeError("Model not loaded. Call load() first.")
        return self._session

    @property
    def metadata(self) -> ModelMetadata:
        """Get model metadata."""
        if self._metadata is None:
            raise RuntimeError("Model not loaded. Call load() first.")
        return self._metadata

    @property
    def input_name(self) -> str:
        return self._input_name

    @property
    def output_names(self) -> List[str]:
        return self._output_names


class InferenceEngine:
    """
    High-performance inference engine.

    Features:
    - Model session reuse
    - Preprocessing integration
    - Async inference support
    - Performance monitoring
    - Batch processing
    """

    def __init__(self, config=None):
        self.config = config or get_ai_config()
        self.loader = ModelLoader(config)
        self._preprocessor = None
        self._nms = None
        self._stabilizer = None
        self._duplicate_filter = None
        self._sentence_builder = None
        self._stats = {
            'total_inferences': 0,
            'total_preprocess_ms': 0.0,
            'total_inference_ms': 0.0,
            'total_postprocess_ms': 0.0,
            'total_nms_ms': 0.0,
            'errors': 0
        }

    def initialize(self, model_path: Optional[str] = None):
        """Initialize all components."""
        logger.info("Initializing inference engine...")

        # Load model
        self.loader.load(model_path)

        # Warmup
        self.loader.warmup(self.config.model.warmup_runs)

        # Initialize pipeline components
        from ai.preprocess import get_preprocessor
        from ai.nms import get_nms
        from ai.temporal_stabilizer import get_temporal_stabilizer
        from ai.duplicate_filter import get_duplicate_filter
        from ai.sentence_builder import get_sentence_builder

        self._preprocessor = get_preprocessor()
        self._nms = get_nms()
        self._stabilizer = get_temporal_stabilizer()
        self._duplicate_filter = get_duplicate_filter()
        self._sentence_builder = get_sentence_builder()

        logger.info("Inference engine initialized")

    def infer(
        self,
        image: np.ndarray,
        conf_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
        max_detections: Optional[int] = None,
        return_meta: bool = False
    ) -> Dict[str, Any]:
        """
        Run complete inference pipeline.

        Args:
            image: Input image (H, W, 3) BGR
            conf_threshold: Override confidence threshold
            iou_threshold: Override IoU threshold
            max_detections: Override max detections
            return_meta: Include preprocessing metadata

        Returns:
            Dictionary with predictions, sentence, metadata
        """
        if self.loader.session is None:
            raise RuntimeError("Engine not initialized. Call initialize() first.")

        result = {
            'success': True,
            'predictions': [],
            'sentence': '',
            'stats': {},
            'timestamp': time.time()
        }

        try:
            # Preprocessing
            pre_start = time.perf_counter()
            tensor, meta = self._preprocessor.preprocess(image, return_meta=True)
            pre_time = (time.perf_counter() - pre_start) * 1000

            # Inference
            inf_start = time.perf_counter()
            outputs = self.loader.session.run(
                self.loader.output_names,
                {self.loader.input_name: tensor}
            )
            inf_time = (time.perf_counter() - inf_start) * 1000

            # Postprocessing (NMS)
            nms_start = time.perf_counter()
            raw_predictions = outputs[0]
            detections = self._nms(
                raw_predictions,
                conf_threshold=conf_threshold,
                iou_threshold=iou_threshold,
                max_detections=max_detections
            )
            nms_time = (time.perf_counter() - nms_start) * 1000

            # Convert to original image coordinates
            for det in detections:
                det.bbox = self._preprocessor.reverse_letterbox(det.bbox, meta)

            # Temporal stabilization
            stabilized = self._stabilizer.update(detections)

            # Duplicate filtering
            filtered = []
            for pred in stabilized:
                filtered.append(self._duplicate_filter.filter(pred))

            # Build sentence
            for fp in filtered:
                if fp.should_add_to_sentence:
                    self._sentence_builder.add_letter(fp)

            # Prepare output
            result['predictions'] = [
                {
                    'bbox': fp.bbox.tolist() if fp.bbox is not None else [],
                    'confidence': fp.confidence,
                    'class_id': fp.class_id,
                    'class_name': fp.class_name,
                    'stability': fp.stability_score,
                    'should_add': fp.should_add_to_sentence
                }
                for fp in filtered
            ]
            result['sentence'] = self._sentence_builder.get_display_text()
            result['raw_sentence'] = self._sentence_builder.get_raw_text()
            result['stats'] = {
                'preprocess_ms': pre_time,
                'inference_ms': inf_time,
                'nms_ms': nms_time,
                'postprocess_ms': 0,  # Included in nms_time
                'total_ms': pre_time + inf_time + nms_time,
                'num_detections': len(detections),
                'num_stabilized': len(stabilized),
                'sentence_stats': self._sentence_builder.get_stats()
            }

            # Update global stats
            self._stats['total_inferences'] += 1
            self._stats['total_preprocess_ms'] += pre_time
            self._stats['total_inference_ms'] += inf_time
            self._stats['total_nms_ms'] += nms_time

            if return_meta:
                result['meta'] = meta

        except Exception as e:
            logger.error(f"Inference error: {e}")
            self._stats['errors'] += 1
            result['success'] = False
            result['error'] = str(e)

        return result

    def infer_batch(
        self,
        images: List[np.ndarray],
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Run inference on batch of images."""
        results = []
        for img in images:
            results.append(self.infer(img, **kwargs))
        return results

    def get_stats(self) -> Dict[str, Any]:
        """Get engine statistics."""
        stats = self._stats.copy()
        if stats['total_inferences'] > 0:
            stats['avg_preprocess_ms'] = stats['total_preprocess_ms'] / stats['total_inferences']
            stats['avg_inference_ms'] = stats['total_inference_ms'] / stats['total_inferences']
            stats['avg_nms_ms'] = stats['total_nms_ms'] / stats['total_inferences']
        return stats

    def reset_stats(self):
        """Reset statistics."""
        for k in self._stats:
            self._stats[k] = 0 if isinstance(self._stats[k], int) else 0.0

    def reset_pipeline(self):
        """Reset temporal components."""
        self._stabilizer.reset()
        self._duplicate_filter.reset()
        self._sentence_builder.clear()


_inference_engine_instance: Optional[InferenceEngine] = None


def get_inference_engine(config=None) -> InferenceEngine:
    """Get singleton inference engine instance."""
    global _inference_engine_instance
    if _inference_engine_instance is None:
        _inference_engine_instance = InferenceEngine(config)
    return _inference_engine_instance