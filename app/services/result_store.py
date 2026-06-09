"""JSON-backed result history store for NoteFlow AI."""

import json
import threading
from pathlib import Path
from typing import Any, Dict, List


DEFAULT_RESULTS: Dict[str, List[Dict[str, Any]]] = {
    "summary_results": [],
    "keyword_results": [],
    "chat_results": [],
}


class ResultStore:
    """Persist summary, keyword, and chat results to a local JSON file."""

    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load(self) -> Dict[str, List[Dict[str, Any]]]:
        with self._lock:
            return self._load_unlocked()

    def append(self, category: str, item: Dict[str, Any]) -> None:
        with self._lock:
            data = self._load_unlocked()
            data.setdefault(category, [])
            data[category].append(item)
            self._write_unlocked(data)

    def get_by_file_id(self, file_id: str) -> Dict[str, List[Dict[str, Any]]]:
        data = self.load()
        return {
            "summaries": [
                item for item in data.get("summary_results", [])
                if item.get("file_id") == file_id
            ],
            "keywords": [
                item for item in data.get("keyword_results", [])
                if item.get("file_id") == file_id
            ],
            "chats": [
                item for item in data.get("chat_results", [])
                if item.get("file_id") == file_id
            ],
        }

    def delete_by_file_id(self, file_id: str) -> Dict[str, int]:
        with self._lock:
            data = self._load_unlocked()
            before_counts = {
                "summaries": len(data.get("summary_results", [])),
                "keywords": len(data.get("keyword_results", [])),
                "chats": len(data.get("chat_results", [])),
            }

            data["summary_results"] = [
                item for item in data.get("summary_results", [])
                if item.get("file_id") != file_id
            ]
            data["keyword_results"] = [
                item for item in data.get("keyword_results", [])
                if item.get("file_id") != file_id
            ]
            data["chat_results"] = [
                item for item in data.get("chat_results", [])
                if item.get("file_id") != file_id
            ]

            deleted_counts = {
                "summaries": before_counts["summaries"] - len(data["summary_results"]),
                "keywords": before_counts["keywords"] - len(data["keyword_results"]),
                "chats": before_counts["chats"] - len(data["chat_results"]),
            }
            self._write_unlocked(data)
            return deleted_counts

    def _load_unlocked(self) -> Dict[str, List[Dict[str, Any]]]:
        if not self.path.exists():
            return {key: list(value) for key, value in DEFAULT_RESULTS.items()}

        try:
            with self.path.open("r", encoding="utf-8") as file:
                raw = json.load(file)
        except (json.JSONDecodeError, OSError):
            return {key: list(value) for key, value in DEFAULT_RESULTS.items()}

        return {
            "summary_results": list(raw.get("summary_results", [])),
            "keyword_results": list(raw.get("keyword_results", [])),
            "chat_results": list(raw.get("chat_results", [])),
        }

    def _write_unlocked(self, data: Dict[str, List[Dict[str, Any]]]) -> None:
        with self.path.open("w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
