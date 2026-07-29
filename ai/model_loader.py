"""
ONNX Model Loader

Responsible for loading the ONNX model, selecting execution providers,
warming up the model, and managing the inference session lifecycle.
"""

import os
import time
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path

import onnxruntime as ort
import numpy as np

from ai.config import ModelConfig

logger = logging.getLogger(__name__)


class ModelLoader:
    """
    Loads and manages the ONNX model inference session.

    Features:
    - Automatic execution provider selection (CUDA -> CPU)
    - Model warming with dummy inferences
    - Session reuse for performance
    - Health checks and monitoring
    """

    def __init__(self, config: ModelConfig):
        self.config = config
        self.session: Optional[ort.InferenceSession] = None
        self.input_name: Optional[str] = None
        self.output_names: List[str] = []
        self.is_warmed_up: bool = False
        self.load_time_ms: float = 0.0
        self.warmup_time_ms: float = 0.0
        self._provider: str = "CPUExecutionProvider"

    def load(self) -> ort.InferenceSession:
        """
        Load the ONNX model and create inference session.

        Returns:
            Initialized ONNX Runtime InferenceSession

        Raises:
            FileNotFoundError: If model file doesn't exist
            RuntimeError: If model loading fails
        """
        model_path = Path(self.config.model_path)
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")

        logger.info(f"Loading model from {model_path}")

        start_time = time.perf_counter()

        providers = self._get_execution_providers()
        session_options = self._create_session_options()

        try:
            self.session = ort.InferenceSession(
                str(model_path),
                sess_options=session_options,
                providers=providers
            )
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise RuntimeError(f"Model loading failed: {e}") from e

        self.load_time_ms = (time.perf_counter() - start_time) * 1000
        self._provider = self.session.get_providers()[0]

        self.input_name = self.session.get_inputs()[0].name
        self.output_names = [output.name for output in self.session.get_outputs()]

        logger.info(
            f"Model loaded successfully in {self.load_time_ms:.2f}ms "
            f"using {self._provider}"
        )
        logger.info(f"Input: {self.input_name}, Outputs: {self.output_names}")

        return self.session

    def _get_execution_providers(self) -> List[str]:
        """Determine execution providers based on availability and config."""
        if self.config.use_gpu and "CUDAExecutionProvider" in ort.get_available_providers():
            return ["CUDAExecutionProvider", "CPUExecutionProvider"]
        return ["CPUExecutionProvider"]

    def _create_session_options(self) -> ort.SessionOptions:
        """Create optimized session options."""
        options = ort.SessionOptions()
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        options.enable_mem_pattern = True
        options.enable_cpu_mem_arena = True
        options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        options.intra_op_num_threads = self.config.intra_op_threads
        options.inter_op_num_threads = self.config.inter_op_threads
        return options

    def warmup(self, num_iterations: int = 5) -> float:
        """
        Warm up the model with dummy inferences.

        Args:
            num_iterations: Number of warmup iterations

        Returns:
            Warmup time in milliseconds
        """
        if self.session is None:
            raise RuntimeError("Model not loaded. Call load() first.")

        if self.is_warmed_up:
            logger.info("Model already warmed up")
            return self.warmup_time_ms

        logger.info(f"Warming up model with {num_iterations} iterations...")

        dummy_input = np.random.randn(1, 3, 640, 640).astype(np.float32)

        start_time = time.perf_counter()
        for _ in range(num_iterations):
            _ = self.session.run(self.output_names, {self.input_name: dummy_input})
        self.warmup_time_ms = (time.perf_counter() - start_time) * 1000

        self.is_warmed_up = True
        logger.info(f"Model warmed up in {self.warmup_time_ms:.2f}ms")

        return self.warmup_time_ms

    def infer(self, input_tensor: np.ndarray) -> List[np.ndarray]:
        """
        Run inference on preprocessed input tensor.

        Args:
            input_tensor: Preprocessed input (1, 3, 640, 640) float32

        Returns:
            List of output tensors from the model
        """
        if self.session is None:
            raise RuntimeError("Model not loaded. Call load() first.")

        if not self.is_warmed_up:
            self.warmup()

        return self.session.run(self.output_names, {self.input_name: input_tensor})

    def get_model_info(self) -> Dict[str, Any]:
        """Get model metadata and session info."""
        if self.session is None:
            return {"status": "not_loaded"}

        return {
            "status": "loaded",
            "provider": self._provider,
            "input_name": self.input_name,
            "output_names": self.output_names,
            "input_shape": self.session.get_inputs()[0].shape,
            "load_time_ms": self.load_time_ms,
            "warmup_time_ms": self.warmup_time_ms,
            "warmed_up": self.is_warmed_up,
            "model_path": str(self.config.model_path),
        }

    def health_check(self) -> bool:
        """Check if model session is healthy."""
        if self.session is None:
            return False
        try:
            dummy = np.zeros((1, 3, 640, 640), dtype=np.float32)
            self.session.run(None, {self.input_name: dummy})
            return True
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False


_model_loader_instance: Optional[ModelLoader] = None


def get_model_loader(config: Optional[ModelConfig] = None) -> ModelLoader:
    """Get singleton model loader instance."""
    global _model_loader_instance
    if _model_loader_instance is None:
        if config is None:
            config = ModelConfig()
        _model_loader_instance = ModelLoader(config)
    return _model_loader_instance


def reset_model_loader() -> None:
    """Reset singleton instance (for testing)."""
    global _model_loader_instance
    _model_loader_instance = None