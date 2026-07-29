"""
Inference API Routes

Handles image, video, and camera frame predictions.
"""

import base64
import uuid
import logging
from typing import Optional, List

from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from backend.services.inference_service import InferenceService
from backend.services.history_service import HistoryService
from backend.services.sentence_service import SentenceService
from backend.core.dependencies import (
    get_inference_service,
    get_history_service,
    get_sentence_service
)
from backend.schemas import (
    ImagePredictResponse,
    VideoPredictResponse,
    CameraFrameResponse,
    Detection,
    BoundingBox
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/image", response_model=ImagePredictResponse)
async def predict_image(
    file: UploadFile = File(...),
    conf_threshold: Optional[float] = Form(None),
    iou_threshold: Optional[float] = Form(None),
    max_detections: Optional[int] = Form(None),
    inference_service: InferenceService = Depends(get_inference_service),
    history_service: HistoryService = Depends(get_history_service),
    sentence_service: SentenceService = Depends(get_sentence_service)
):
    """Predict on uploaded image."""
    # Validate file
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    # Read image
    contents = await file.read()
    import cv2
    import numpy as np
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(400, "Invalid image file")

    # Run inference
    result = inference_service.infer_image(
        image,
        conf_threshold=conf_threshold,
        iou_threshold=iou_threshold,
        max_detections=max_detections
    )

    # Build sentence from detections
    sentence_text = ""
    if sentence_service.state.current_word:
        sentence_text = sentence_service.get_display_text()

    # Save to history
    history_service.add_entry(
        source="image",
        source_name=file.filename or "unknown",
        detections=[
            DetectionModel(
                bbox=det.bbox,
                confidence=det.confidence,
                class_id=det.class_id,
                class_name=det.class_name
            )
            for det in result.detections
        ],
        sentence=sentence_text,
        latency_ms=result.total_ms,
        fps=result.fps,
        avg_confidence=sum(d.confidence for d in result.detections) / len(result.detections) if result.detections else 0
    )

    # Convert to response format
    detections = [
        Detection(
            bbox=BoundingBox(x1=d.bbox[0], y1=d.bbox[1], x2=d.bbox[2], y2=d.bbox[3]),
            confidence=d.confidence,
            class_id=d.class_id,
            class_name=d.class_name
        )
        for d in result.detections
    ]

    return ImagePredictResponse(
        success=True,
        timestamp=datetime.utcnow(),
        latency_ms=result.total_ms,
        fps=result.fps,
        predictions=detections,
        sentence=sentence_text,
        provider=result.provider,
        model_version="1.0.0"
    )


@router.post("/video", response_model=VideoPredictResponse)
async def predict_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    conf_threshold: Optional[float] = Form(None),
    iou_threshold: Optional[float] = Form(None),
    max_detections: Optional[int] = Form(None),
    sample_rate: int = Form(1),
    inference_service: InferenceService = Depends(get_inference_service),
    history_service: HistoryService = Depends(get_history_service)
):
    """Process uploaded video file."""
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(400, "File must be a video")

    # Save video temporarily
    import tempfile
    import os
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        contents = await file.read()
        tmp.write(contents)
        video_path = tmp.name

    try:
        # Process video
        result = await inference_service.infer_video(
            video_path,
            conf_threshold=conf_threshold,
            iou_threshold=iou_threshold,
            max_detections=max_detections,
            sample_rate=sample_rate
        )

        # Save to history
        sentence_text = ""  # Would build from frames

        history_service.add_entry(
            source="video",
            source_name=file.filename or "unknown",
            detections=[],
            sentence=sentence_text,
            latency_ms=0,
            fps=result["video_info"]["fps"],
            avg_confidence=0
        )

        return VideoPredictResponse(
            success=True,
            timestamp=datetime.utcnow(),
            video_info=result["video_info"],
            total_frames=result["video_info"]["total_frames"],
            processed_frames=result["processed_frames"],
            predictions=result["predictions"],
            sentence=sentence_text,
            processing_time_ms=0
        )

    finally:
        # Cleanup
        background_tasks.add_task(os.unlink, video_path)


@router.post("/camera", response_model=CameraFrameResponse)
async def predict_camera_frame(
    frame: str = Form(...),
    conf_threshold: Optional[float] = Form(None),
    iou_threshold: Optional[float] = Form(None),
    max_detections: Optional[int] = Form(None),
    inference_service: InferenceService = Depends(get_inference_service),
    sentence_service: SentenceService = Depends(get_sentence_service)
):
    """Process single camera frame (base64 encoded)."""
    try:
        # Decode base64
        frame_data = base64.b64decode(frame)
        import cv2
        import numpy as np
        nparr = np.frombuffer(frame_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(400, "Invalid frame data")

        # Run inference
        result = inference_service.infer_image(
            image,
            conf_threshold=conf_threshold,
            iou_threshold=iou_threshold,
            max_detections=max_detections
        )

        # Update sentence builder
        for det in result.detections:
            sentence_service.add_letter(det.class_name, det.confidence)

        sentence_text = sentence_service.get_display_text()

        detections = [
            Detection(
                bbox=BoundingBox(x1=d.bbox[0], y1=d.bbox[1], x2=d.bbox[2], y2=d.bbox[3]),
                confidence=d.confidence,
                class_id=d.class_id,
                class_name=d.class_name
            )
            for d in result.detections
        ]

        return CameraFrameResponse(
            success=True,
            timestamp=datetime.utcnow(),
            latency_ms=result.total_ms,
            fps=result.fps,
            predictions=detections,
            sentence=sentence_text
        )

    except Exception as e:
        logger.error(f"Camera frame error: {e}")
        raise HTTPException(500, f"Frame processing failed: {str(e)}")