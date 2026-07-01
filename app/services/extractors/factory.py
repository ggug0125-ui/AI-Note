"""Extractor selection for upload analysis."""

from pathlib import Path
from typing import Optional

from app.services.extractors.base import BaseExtractor
from app.services.extractors.pdf_extractor import PdfExtractor
from app.services.extractors.table_extractor import CsvExtractor, XlsxExtractor
from app.services.extractors.txt_extractor import TxtExtractor

SUPPORTED_ANALYSIS_EXTENSIONS = {".pdf", ".txt", ".xlsx", ".csv"}
UNSUPPORTED_ANALYSIS_MESSAGE = "지원하지 않는 파일 형식입니다. PDF, TXT, XLSX, CSV 파일을 업로드해주세요."


def get_extractor(filename: Optional[str], content_type: Optional[str]) -> BaseExtractor:
    suffix = Path(filename or "").suffix.lower()
    normalized_content_type = (content_type or "").split(";")[0].strip().lower()

    if suffix == ".pdf" or (not suffix and normalized_content_type == "application/pdf"):
        return PdfExtractor()
    if suffix == ".txt" or (not suffix and normalized_content_type == "text/plain"):
        return TxtExtractor()
    if suffix == ".xlsx" or (
        not suffix and normalized_content_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ):
        return XlsxExtractor()
    if suffix == ".csv" or (not suffix and normalized_content_type in {"text/csv", "application/csv"}):
        return CsvExtractor()

    raise ValueError(UNSUPPORTED_ANALYSIS_MESSAGE)
