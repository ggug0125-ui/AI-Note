"""Plain text extractor."""

from pathlib import Path

from app.services.extractors.base import BaseExtractor, ExtractedDocument, ExtractionError


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

        return ExtractedDocument(text=text, file_type=self.file_type, page_count=None)
