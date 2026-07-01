"""Plain text extractor."""

from math import ceil
from pathlib import Path

from app.services.extractors.base import BaseExtractor, ExtractedDocument, ExtractionError

CHARS_PER_ESTIMATED_PAGE = 2000
LINES_PER_ESTIMATED_PAGE = 40


def _estimate_text_pages(text: str) -> int:
    stripped = text.strip()
    if not stripped:
        return 1

    non_empty_lines = [line for line in stripped.splitlines() if line.strip()]
    pages_by_chars = ceil(len(stripped) / CHARS_PER_ESTIMATED_PAGE)
    pages_by_lines = ceil(len(non_empty_lines) / LINES_PER_ESTIMATED_PAGE) if non_empty_lines else 1
    return max(1, pages_by_chars, pages_by_lines)


class TxtExtractor(BaseExtractor):
    file_type = "TXT"
    file_extension = ".txt"

    def extract(self, path: Path) -> ExtractedDocument:
        raw = path.read_bytes()

        text = ""
        for encoding in ("utf-8", "cp949"):
            try:
                text = raw.decode(encoding)
                break
            except UnicodeDecodeError:
                continue

        if not text:
            text = raw.decode("utf-8", errors="ignore")

        if not text.strip():
            raise ExtractionError("No readable text found in TXT.")

        page_count = _estimate_text_pages(text)
        return ExtractedDocument(
            text=text,
            file_type=self.file_type,
            page_count=page_count,
            metadata={
                "basis_type": "estimated_text_pages",
                "basis_count": page_count,
            },
        )
