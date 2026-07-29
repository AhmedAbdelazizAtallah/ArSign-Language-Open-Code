"""
Benchmarking utilities for AI inference pipeline.
"""

import time
import statistics
import numpy as np
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from ai.inference_engine import get_inference_engine
from ai.config import get_ai_config


@dataclass
class BenchmarkResult:
    """Benchmark results."""
    total_runs: int
    warmup_runs: int
    preprocess_times: List[float]
    inference_times: List[float]
    nms_times: List[float]
    total_times: List[float]
    avg_preprocess_ms: float
    avg_inference_ms: float
    avg_nms_ms: float
    avg_total_ms: float
    fps: float
    memory_mb: float


class BenchmarkRunner:
    """
    Benchmark runner for inference pipeline.
    """

    def __init__(self, config=None):
        self.config = config or get_ai_config()
        self.engine = get_inference_engine(config)

    def run(
        self,
        image: np.ndarray,
        warmup_runs: int = 10,
        benchmark_runs: int = 100
    ) -> BenchmarkResult:
        """
        Run full benchmark.

        Args:
            image: Test image
            warmup_runs: Number of warmup runs
            benchmark_runs: Number of benchmark runs

        Returns:
            BenchmarkResult with statistics
        """
        print(f"Running benchmark: {warmup_runs} warmup + {benchmark_runs} runs")

        # Warmup
        for _ in range(warmup_runs):
            self.engine.infer(image)

        # Benchmark
        preprocess_times = []
        inference_times = []
        nms_times = []
        total_times = []

        for i in range(benchmark_runs):
            result = self.engine.infer(image)
            stats = result['stats']

            preprocess_times.append(stats['preprocess_ms'])
            inference_times.append(stats['inference_ms'])
            nms_times.append(stats['nms_ms'])
            total_times.append(stats['total_ms'])

            if (i + 1) % 20 == 0:
                print(f"  Completed {i + 1}/{benchmark_runs} runs")

        return BenchmarkResult(
            total_runs=benchmark_runs,
            warmup_runs=warmup_runs,
            preprocess_times=preprocess_times,
            inference_times=inference_times,
            nms_times=nms_times,
            total_times=total_times,
            avg_preprocess_ms=statistics.mean(preprocess_times),
            avg_inference_ms=statistics.mean(inference_times),
            avg_nms_ms=statistics.mean(nms_times),
            avg_total_ms=statistics.mean(total_times),
            fps=1000 / statistics.mean(total_times),
            memory_mb=0.0  # Would need memory profiling
        )

    def print_results(self, result: BenchmarkResult):
        """Print formatted benchmark results."""
        print("\n" + "=" * 60)
        print("BENCHMARK RESULTS")
        print("=" * 60)
        print(f"Warmup runs:     {result.warmup_runs}")
        print(f"Benchmark runs:  {result.total_runs}")
        print()
        print(f"Preprocessing:   {result.avg_preprocess_ms:.2f} ms (avg)")
        print(f"Inference:       {result.avg_inference_ms:.2f} ms (avg)")
        print(f"NMS/Postprocess: {result.avg_nms_ms:.2f} ms (avg)")
        print(f"Total:           {result.avg_total_ms:.2f} ms (avg)")
        print()
        print(f"FPS:             {result.fps:.1f}")
        print("=" * 60)


def run_benchmark(
    image_path: str,
    warmup: int = 10,
    runs: int = 100,
    config=None
) -> BenchmarkResult:
    """
    Quick benchmark function.

    Args:
        image_path: Path to test image
        warmup: Warmup runs
        runs: Benchmark runs

    Returns:
        BenchmarkResult
    """
    import cv2

    # Load test image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not load image: {image_path}")

    runner = BenchmarkRunner(config)
    runner.engine.initialize()
    result = runner.run(image, warmup_runs=warmup, benchmark_runs=runs)
    runner.print_results(result)
    return result