"""
AI Inference Module for Arabic Sign Language Recognition

This module provides a production-ready inference pipeline for the YOLO26s model
exported to ONNX format. It includes preprocessing, inference, postprocessing,
temporal stabilization, duplicate filtering, and sentence building.

Architecture:
    ModelLoader -> InferenceEngine -> Preprocessor -> PostProcessor
                                    -> NMS -> TemporalStabilizer
                                    -> DuplicateFilter -> SentenceBuilder

All components are designed to be independent and testable.
"""

from ai.model_loader import ModelLoader, get_model_loader
from ai.inference_engine import InferenceEngine, get_inference_engine
from ai.preprocess import Preprocessor, LetterboxResize, get_preprocessor
from ai.postprocess import PostProcessor, get_post_processor
from ai.nms import NonMaxSuppression, get_nms
from ai.temporal_stabilizer import TemporalStabilizer, get_temporal_stabilizer
from ai.duplicate_filter import DuplicateFilter, get_duplicate_filter
from ai.sentence_builder import SentenceBuilder, get_sentence_builder
from ai.benchmark import BenchmarkRunner, run_benchmark

__all__ = [
    "ModelLoader",
    "get_model_loader",
    "InferenceEngine",
    "get_inference_engine",
    "Preprocessor",
    "LetterboxResize",
    "get_preprocessor",
    "PostProcessor",
    "get_post_processor",
    "NonMaxSuppression",
    "get_nms",
    "TemporalStabilizer",
    "get_temporal_stabilizer",
    "DuplicateFilter",
    "get_duplicate_filter",
    "SentenceBuilder",
    "get_sentence_builder",
    "BenchmarkRunner",
    "run_benchmark",
]

__version__ = "1.0.0"
__author__ = "Arabic Sign Language AI Team"