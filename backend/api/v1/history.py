"""
History API Routes
"""

from fastapi import APIRouter, Depends, Query

from backend.services.history_service import HistoryService
from backend.core.dependencies import get_history_service

router = APIRouter()


@router.get("")
async def get_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source: str = Query(None),
    history_service: HistoryService = Depends(get_history_service)
):
    """Get prediction history."""
    return history_service.get_history(page=page, page_size=page_size, source=source)


@router.get("/stats")
async def get_history_stats(
    history_service: HistoryService = Depends(get_history_service)
):
    """Get history statistics."""
    return history_service.get_stats()


@router.delete("")
async def clear_history(
    history_service: HistoryService = Depends(get_history_service)
):
    """Clear all history."""
    count = history_service.clear_history()
    return {"success": True, "deleted_count": count}


@router.delete("/{entry_id}")
async def delete_history_entry(
    entry_id: str,
    history_service: HistoryService = Depends(get_history_service)
):
    """Delete specific history entry."""
    success = history_service.delete_entry(entry_id)
    if not success:
        return {"success": False, "error": "Entry not found"}
    return {"success": True}


@router.get("/export")
async def export_history(
    format: str = Query("json", pattern="^(json|csv|txt)$"),
    history_service: HistoryService = Depends(get_history_service)
):
    """Export history."""
    try:
        content = history_service.export_history(format)
        filename = f"history.{format}"
        return {
            "success": True,
            "format": format,
            "content": content,
            "filename": filename
        }
    except ValueError as e:
        return {"success": False, "error": str(e)}