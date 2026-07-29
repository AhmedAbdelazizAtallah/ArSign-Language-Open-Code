"""
Model Service

Manages ONNX model lifecycle.
"""

import time
import psutil
import onnxruntime as ort
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any

from backend.config.settings import get_settings
from backend.core.exceptions import ModelLoadError
from backend.logging.config import get_logger

logger = get_logger(__name__)


class ModelService:
    """Service for model management."""

    def __init__(self):
        self.settings = get_settings()
        self._session: Optional[ort.InferenceSession] = None
        self._input_name: Optional[str] = None
        self._output_names: Optional[list] = None
        self._loaded = False
        self._load_time = 0.0
        self._warmup_time = 0.0
        self._start_time = time.time()

    async def initialize(self):
        """Initialize model."""
        await self.load()

    async def load(self) -> ort.InferenceSession:
        """Load ONNX model."""
        if self._loaded:
            return self._session

        model_path = Path(self.settings.model_path)
        if not model_path.exists():
            raise ModelLoadError(f"Model file not found: {model_path}")

        logger.info(f"Loading model from {model_path}")

        start = time.perf_counter()

        providers = self.settings.execution_providers
        available = ort.get_available_providers()
        providers = [p for p in providers if p in available]

        if not providers:
            providers = ["CPUExecutionProvider"]

        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.enable_cpu_mem_arena = True
        sess_options.enable_mem_pattern = True
        sess_options.intra_op_num_threads = self.settings.intra_op_threads
        sess_options.inter_op_num_threads = self.settings.inter_op_threads

        self._session = ort.InferenceSession(
            str(model_path),
            sess_options=sess_options,
            providers=providers
        )

        self._input_name = self._session.get_inputs()[0].name
        self._output_names = [o.name for o in self._session.get_outputs()]
        self._load_time = (time.perf_counter() - start) * 1000

        # Warmup
        await self.warmup()

        self._loaded = True
        logger.info(
            f"Model loaded in {self._load_time:.2f}ms using {self._session.get_providers()[0]}"
        )
        return self._session

    async def warmup(self, runs: int = 5):
        """Warmup model with dummy inputs."""
        if self._session is None:
            return

        logger.info(f"Warming up model with {runs} runs...")
        dummy_input = np.random.randn(1, 3, 640, 640).astype(np.float32)

        start = time.perf_counter()
        for _ in range(runs):
            self._session.run(self._output_names, {self._input_name: dummy_input})
        self._warmup_time = (time.perf_counter() - start) * 1000

        logger.info(f"Warmup completed in {self._warmup_time:.2f}ms")

    def infer(self, input_tensor: np.ndarray) -> list:
        """Run inference."""
        if self._session is None:
            raise ModelLoadError("Model not loaded")

        return self._session.run(self._output_names, {self._input_name: input_tensor})

    @property
    def session(self) -> Optional[ort.InferenceSession]:
        return self._session

    @property
    def input_name(self) -> Optional[str]:
        return self._input_name

    @property
    def output_names(self) -> Optional[list]:
        return self._output_names

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def health_check(self) -> Dict[str, Any]:
        """Health check."""
        gpu_available = "CUDAExecutionProvider" in ort.get_available_providers()

        process = psutil.Process()
        memory = process.memory_info()

        return {
            "status": "healthy" if self._loaded else "degraded",
            "version": self.settings.app_version,
            "model_loaded": self._loaded,
            "model_path": str(self.settings.model_path),
            "gpu_available": gpu_available,
            "execution_provider": self._session.get_providers()[0] if self._session else None,
            "cpu_usage": psutil.cpu_percent(),
            "memory_usage": memory.rss / (1024 * 1024),
            "uptime_seconds": time.time() - self._start_time
        }

    async def shutdown(self):
        """Shutdown service."""
        self._session = None
        self._loaded = False
        logger.info("Model service shutdown")