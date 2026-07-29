"""
History Service

Manages prediction history with persistence.
"""

import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from collections import deque

from backend.models.domain import HistoryEntry, DetectionModel
from backend.logging.config import get_logger

logger = get_logger(__name__)


class HistoryService:
    """Service for managing prediction history."""

    def __init__(self):
        self._history: deque = deque(maxlen=1000)
        self._history_file = Path("data/history.json")
        self._history_file.parent.mkdir(parents=True, exist_ok=True)
        self._load_history()

    def _load_history(self):
        """Load history from file."""
        if self._history_file.exists():
            try:
                with open(self._history_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for entry in data:
                        self._history.append(HistoryEntry(**entry))
                logger.info(f"Loaded {len(self._history)} history entries")
            except Exception as e:
                logger.warning(f"Failed to load history: {e}")

    def _save_history(self):
        """Save history to file."""
        try:
            data = [entry.model_dump() for entry in self._history]
            with open(self._history_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save history: {e}")

    def add_entry(
        self,
        source: str,
        source_name: str,
        detections: List[DetectionModel],
        sentence: str,
        latency_ms: float,
        fps: float,
        avg_confidence: float
    ) -> HistoryEntry:
        """Add new history entry."""
        entry = HistoryEntry(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            source=source,
            source_name=source_name,
            detections=detections,
            sentence=sentence,
            latency_ms=latency_ms,
            fps=fps,
            avg_confidence=avg_confidence
        )

        self._history.appendleft(entry)
        self._save_history()
        return entry

    def get_history(
        self,
        page: int = 1,
        page_size: int = 20,
        source: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get paginated history."""
        entries = list(self._history)

        if source:
            entries = [e for e in entries if e.source == source]

        total = len(entries)
        start = (page - 1) * page_size
        end = start + page_size

        return {
            "entries": [e.model_dump() for e in entries[start:end]],
            "total": total,
            "page": page,
            "page_size": page_size
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get history statistics."""
        entries = list(self._history)
        if not entries:
            return {"total": 0, "by_source": {}, "avg_latency": 0, "avg_fps": 0}

        by_source = {}
        for e in entries:
            by_source[e.source] = by_source.get(e.source, 0) + 1

        return {
            "total": len(entries),
            "by_source": by_source,
            "avg_latency": sum(e.latency_ms for e in entries) / len(entries),
            "avg_fps": sum(e.fps for e in entries) / len(entries),
            "avg_confidence": sum(e.avg_confidence for e in entries) / len(entries)
        }

    def delete_entry(self, entry_id: str) -> bool:
        """Delete specific entry."""
        for i, entry in enumerate(self._history):
            if entry.id == entry_id:
                del self._history[i]
                self._save_history()
                return True
        return False

    def clear_history(self) -> int:
        """Clear all history."""
        count = len(self._history)
        self._history.clear()
        self._save_history()
        return count

    def export_history(self, format: str) -> str:
        """Export history in specified format."""
        entries = [e.model_dump() for e in self._history]

        if format == "json":
            return json.dumps(entries, ensure_ascii=False, indent=2)
        elif format == "csv":
            import csv
            import io
            output = io.StringIO()
            if entries:
                writer = csv.DictWriter(output, fieldnames=entries[0].keys())
                writer.writeheader()
                writer.writerows(entries)
            return output.getvalue()
        elif format == "txt":
            lines = []
            for e in entries:
                lines.append(f"{e['timestamp']} | {e['source']} | {e['sentence']} | {e['latency_ms']:.1f}ms | {e['fps']:.1f}fps")
            return '\n'.join(lines)
        else:
            raise ValueError(f"Unsupported format: {format}")