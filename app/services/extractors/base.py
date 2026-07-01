"""Base types for document text extractors."""

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional


class ExtractionError(ValueError):
    """Raised when a supported file cannot produce readable text."""


@dataclass(frozen=True)
class ExtractedDocument:
    text: str
    file_type: str
    page_count: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class BaseExtractor:
    file_type = "FILE"
    file_extension = ".bin"

    def extract(self, path: Path) -> ExtractedDocument:
        raise NotImplementedError
