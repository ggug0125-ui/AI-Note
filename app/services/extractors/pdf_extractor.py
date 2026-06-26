"""PDF text extractor."""

from pathlib import Path
from typing import List

from pypdf import PdfReader

from app.services.extractors.base import BaseExtractor, ExtractedDocument


class PdfExtractor(BaseExtractor):
    file_type = "PDF"
    file_extension = ".pdf"

    def extract(self, path: Path) -> ExtractedDocument:
        reader = PdfReader(str(path))
        parts: List[str] = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return ExtractedDocument(
            text="\n".join(parts),
            file_type=self.file_type,
            page_count=len(reader.pages),
        )
