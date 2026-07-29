"""
Metrics API Routes
"""

import psutil
import time
from fastapi import APIRouter, Depends

from backend.services.inference_service import InferenceService
from backend.services.model_service import ModelService
from backend.core.dependencies import get_inference_service, get_model_service

router = APIRouter()

_start_time = time.time()


@router.get("")
async def get_metrics(
    inference_service: InferenceService = Depends(get_inference_service),
    model_service: ModelService = Depends(get_model_service)
):
    """Get system and inference metrics."""
    # System metrics
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')

    # Inference stats
    inf_stats = inference_service.get_stats()

    # Model info
    model_loaded = model_service.is_loaded
    provider = model_service.session.get_providers()[0] if model_service.session else None

    return {
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_used_mb": memory.used / (1024 * 1024),
            "memory_total_mb": memory.total / (1024 * 1024),
            "disk_percent": disk.percent,
            "disk_free_gb": disk.free / (1024 * 1024 * 1024),
            "uptime_seconds": time.time() - _start_time
        },
        "inference": {
            "total_inferences": inf_stats["total_inferences"],
            "avg_preprocess_ms": inf_stats.get("avg_preprocess_ms", 0),
            "avg_inference_ms": inf_stats.get("avg_inference_ms", 0),
            "avg_nms_ms": inf_stats.get("avg_nms_ms", 0),
            "avg_total_ms": inf_stats.get("avg_total_ms", 0),
            "avg_fps": 1000 / inf_stats.get("avg_total_ms", 1) if inf_stats.get("avg_total_ms", 0) > 0 else 0,
            "errors": inf_stats["errors"]
        },
        "model": {
            "loaded": model_loaded,
            "execution_provider": provider,
            "load_time_ms": getattr(model_service, '_load_time', 0),
            "warmup_time_ms": getattr(model_service, '_warmup_time', 0)
        }
    }


@router.get("/prometheus")
async def get_prometheus_metrics(
    inference_service: InferenceService = Depends(get_inference_service),
    model_service: ModelService = Depends(get_model_service)
):
    """Get metrics in Prometheus format."""
    inf_stats = inference_service.get_stats()
    cpu = psutil.cpu_percent()
    mem = psutil.virtual_memory()

    metrics = [
        "# HELP asl_cpu_percent Current CPU usage percent",
        "# TYPE asl_cpu_percent gauge",
        f"asl_cpu_percent {cpu}",
        "",
        "# HELP asl_memory_percent Current memory usage percent",
        "# TYPE asl_memory_percent gauge",
        f"asl_memory_percent {mem.percent}",
        "",
        "# HELP asl_total_inferences Total number of inferences",
        "# TYPE asl_total_inferences counter",
        f"asl_total_inferences {inf_stats['total_inferences']}",
        "",
        "# HELP asl_avg_inference_ms Average inference time in milliseconds",
        "# TYPE asl_avg_inference_ms gauge",
        f"asl_avg_inference_ms {inf_stats.get('avg_inference_ms', 0)}",
        "",
        "# HELP asl_avg_fps Average FPS",
        "# TYPE asl_avg_fps gauge",
        f"asl_avg_fps {1000 / inf_stats.get('avg_total_ms', 1) if inf_stats.get('avg_total_ms', 0) > 0 else 0}",
        "",
        "# HELP asl_model_loaded Model loaded status",
        "# TYPE asl_model_loaded gauge",
        f"asl_model_loaded {1 if model_service.is_loaded else 0}",
        "",
        "# HELP asl_errors Total inference errors",
        "# TYPE asl_errors counter",
        f"asl_errors {inf_stats['errors']}"
    ]

    return "\n".join(metrics), 200, {"Content-Type": "text/plain"}