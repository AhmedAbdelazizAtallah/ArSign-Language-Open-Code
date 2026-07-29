"""
Settings Service

Manages application settings with persistence.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional

from backend.config.settings import get_settings
from backend.logging.config import get_logger

logger = get_logger(__name__)


class SettingsService:
    """Service for managing user settings."""

    def __init__(self):
        self.settings = get_settings()
        self._settings_file = Path("data/user_settings.json")
        self._settings_file.parent.mkdir(parents=True, exist_ok=True)
        self._user_settings = self._load_settings()

    def _load_settings(self) -> Dict[str, Any]:
        """Load user settings from file."""
        if self._settings_file.exists():
            try:
                with open(self._settings_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load user settings: {e}")
        return {}

    def _save_settings(self):
        """Save user settings to file."""
        try:
            with open(self._settings_file, 'w', encoding='utf-8') as f:
                json.dump(self._user_settings, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save user settings: {e}")

    def get_all(self) -> Dict[str, Any]:
        """Get all settings (defaults + user overrides)."""
        # Default settings
        defaults = {
            "conf_threshold": self.settings.conf_threshold,
            "iou_threshold": self.settings.iou_threshold,
            "max_detections": self.settings.max_detections,
            "bounding_box_color": "#00ff00",
            "label_color": "#ffffff",
            "font_size": 14,
            "show_fps": True,
            "show_latency": True,
            "show_confidence": True,
            "enable_sentence_builder": self.settings.enable_sentence_builder,
            "language": "ar",
            "theme": "system"
        }

        # Merge with user settings
        result = defaults.copy()
        result.update(self._user_settings)
        return result

    def update(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user settings."""
        # Validate and filter allowed settings
        allowed = {
            "conf_threshold": (float, 0.0, 1.0),
            "iou_threshold": (float, 0.0, 1.0),
            "max_detections": (int, 1, 1000),
            "bounding_box_color": (str,),
            "label_color": (str,),
            "font_size": (int, 8, 32),
            "show_fps": (bool,),
            "show_latency": (bool,),
            "show_confidence": (bool,),
            "enable_sentence_builder": (bool,),
            "language": (str, "ar", "en"),
            "theme": (str, "light", "dark", "system")
        }

        for key, value in updates.items():
            if key not in allowed:
                continue

            validator = allowed[key]
            if isinstance(validator, tuple):
                expected_type = validator[0]
                if not isinstance(value, expected_type):
                    continue

                if expected_type == float and len(validator) > 2:
                    if not (validator[1] <= value <= validator[2]):
                        continue
                elif expected_type == int and len(validator) > 2:
                    if not (validator[1] <= value <= validator[2]):
                        continue
                elif expected_type == str and len(validator) > 1:
                    if value not in validator[1:]:
                        continue

            self._user_settings[key] = value

        self._save_settings()
        return self.get_all()

    def reset(self) -> Dict[str, Any]:
        """Reset to defaults."""
        self._user_settings.clear()
        self._save_settings()
        return self.get_all()

    def export(self) -> str:
        """Export settings as JSON."""
        return json.dumps(self._user_settings, ensure_ascii=False, indent=2)

    def import_settings(self, json_str: str) -> Dict[str, Any]:
        """Import settings from JSON."""
        try:
            data = json.loads(json_str)
            if isinstance(data, dict):
                self.update(data)
        except Exception as e:
            logger.error(f"Failed to import settings: {e}")
            raise ValueError("Invalid settings JSON")
        return self.get_all()