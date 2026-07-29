"""
Sentence Builder API Routes
"""

from fastapi import APIRouter, Depends

from backend.services.sentence_service import SentenceService
from backend.core.dependencies import get_sentence_service

router = APIRouter()


@router.get("/state")
async def get_sentence_state(
    sentence_service: SentenceService = Depends(get_sentence_service)
):
    """Get current sentence state."""
    return sentence_service.get_state()


@router.post("/add")
async def add_letter(
    letter: str,
    confidence: float,
    sentence_service: SentenceService = Depends(get_sentence_service)
):
    """Add letter to sentence."""
    added = sentence_service.add_letter(letter, confidence)
    return {"success": True, "added": added, "state": sentence_service.get_state()}


@router.post("/space")
async def add_space(
    sentence_service: SentenceService = Depends(get_sentence_service)
):
    """Add space (complete word)."""
    added = sentence_service.add_space()
    return {"success": True, "added": added, "state": sentence_service.get_state()}


@router.post("/undo")
async def undo(
    sentence_service: SentenceService = Depends(get_sentence_service)
):
    """Undo last action."""
    success = sentence_service.undo()
    return {"success": success, "state": sentence_service.get_state()}


@router.post("/redo")
async def redo(
    sentence_service: SentenceService = Depends(get_sentence_service)
):
    """Redo last undone action."""
    success = sentence_service.redo()
    return {"success": success, "state": sentence_service.get_state()}


@router.post("/reset")
async def reset_sentence(
    sentence_service: SentenceService = Depends(get_sentence_service)
):
    """Reset sentence builder."""
    sentence_service.clear()
    return {"success": True, "state": sentence_service.get_state()}


@router.post("/export")
async def export_sentence(
    format: str = "json",
    sentence_service: SentenceService = Depends(get_sentence_service)
):
    """Export sentence."""
    if format == "json":
        content = sentence_service.export_json()
        filename = "sentence.json"
    elif format == "txt":
        content = sentence_service.export_txt()
        filename = "sentence.txt"
    else:
        return {"success": False, "error": "Unsupported format"}

    return {
        "success": True,
        "format": format,
        "content": content,
        "filename": filename
    }