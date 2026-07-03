"""Shared helpers for FILE-2 conversion."""

import math
import re
import uuid
from pathlib import Path
from typing import Iterable, List, Optional


SUPPORTED_TYPES = {"pdf", "txt", "xlsx", "hwpx"}
TEXT_CHARS_PER_PAGE = 2000
ROWS_PER_PAGE = 40


class ConversionError(Exception):
    """Raised when a supported conversion cannot be completed."""


class UnsupportedConversionError(ConversionError):
    """Raised for unsupported source/target pairs."""


class DownloadNotFoundError(FileNotFoundError):
    """Raised when a converted file or its metadata cannot be found."""


def normalize_type(value: str) -> str:
    normalized = str(value or "").strip().lower().lstrip(".")
    return "xlsx" if normalized == "xls" else normalized


def is_supported_type(value: str) -> bool:
    return normalize_type(value) in SUPPORTED_TYPES


def source_type_from_filename(filename: str) -> str:
    return normalize_type(Path(filename or "").suffix)


def safe_filename_part(value: str) -> str:
    stem = Path(value).stem or "converted"
    sanitized = re.sub(r"[^A-Za-z0-9가-힣 _-]+", "_", stem).strip(" ._")
    return sanitized or "converted"


def conversion_id_for_user(user_id: str) -> str:
    safe_user = re.sub(r"[^a-zA-Z0-9]+", "", str(user_id))[:8] or "user"
    return f"conv_{safe_user}_{uuid.uuid4().hex}"


def converted_output_dir() -> Path:
    output_dir = Path(__file__).resolve().parents[3] / "backend" / "data" / "converted"
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def build_output_path(conversion_id: str, target_type: str) -> Path:
    target = normalize_type(target_type)
    return converted_output_dir() / f"{conversion_id}.{target}"


def calculate_conversion_credits(page_count: Optional[int]) -> float:
    from app.services.convert_engine.credit_service import calculate_conversion_credits as calculate

    return calculate(page_count)


def estimate_text_pages(text: str) -> int:
    stripped = text.strip()
    if not stripped:
        return 1
    line_count = len(non_empty_lines(stripped))
    return max(1, math.ceil(len(stripped) / TEXT_CHARS_PER_PAGE), math.ceil(line_count / ROWS_PER_PAGE))


def estimate_row_pages(row_count: int) -> int:
    return max(1, math.ceil(max(1, row_count) / ROWS_PER_PAGE))


def non_empty_lines(text: str) -> List[str]:
    lines = [line.rstrip() for line in text.splitlines() if line.strip()]
    return lines or [text.strip() or " "]


def paragraphs(text: str) -> Iterable[str]:
    blocks = [block.strip() for block in re.split(r"\n\s*\n", text) if block.strip()]
    return blocks or non_empty_lines(text)


def register_pdf_font() -> str:
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        candidates = [
            Path("C:/Windows/Fonts/malgun.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            Path("/System/Library/Fonts/AppleSDGothicNeo.ttc"),
        ]
        for font_path in candidates:
            if font_path.exists():
                font_name = "NoteFlowUnicode"
                if font_name not in pdfmetrics.getRegisteredFontNames():
                    pdfmetrics.registerFont(TTFont(font_name, str(font_path)))
                return font_name
    except Exception:
        pass
    return "Helvetica"
