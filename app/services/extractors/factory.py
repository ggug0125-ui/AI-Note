"""Extractor selection for upload analysis."""

from pathlib import Path
from typing import Optional

from app.services.extractors.base import BaseExtractor
from app.services.extractors.pdf_extractor import PdfExtractor
from app.services.extractors.txt_extractor import TxtExtractor

SUPPORTED_ANALYSIS_EXTENSIONS = {".pdf", ".txt"}
UNSUPPORTED_ANALYSIS_MESSAGE = (
    "현재 분석 지원 파일은 PDF, TXT입니다. DOCX/XLSX/PPTX/HWPX는 준비 중입니다."
)


def get_extractor(filename: Optional[str], content_type: Optional[str]) -> BaseExtractor:
    suffix = Path(filename or "").suffix.lower()
    normalized_content_type = (content_type or "").split(";")[0].strip().lower()

    if suffix == ".pdf" or (not suffix and normalized_content_type == "application/pdf"):
        return PdfExtractor()
    if suffix == ".txt" or (not suffix and normalized_content_type == "text/plain"):
        return TxtExtractor()

    raise ValueError(UNSUPPORTED_ANALYSIS_MESSAGE)
