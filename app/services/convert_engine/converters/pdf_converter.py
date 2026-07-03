"""PDF converter."""

from html import escape
from pathlib import Path
from typing import List

from app.services.convert_engine.converters.base import BaseConverter
from app.services.convert_engine.utils import ConversionError, estimate_text_pages, paragraphs, register_pdf_font


class PdfConverter(BaseConverter):
    file_type = "pdf"

    def supported_targets(self) -> List[str]:
        return ["txt", "xlsx", "hwpx"]

    def extract_text(self, source_path: Path) -> str:
        try:
            from pypdf import PdfReader

            reader = PdfReader(str(source_path))
            return "\n\n".join((page.extract_text() or "").strip() for page in reader.pages).strip()
        except Exception as exc:
            raise ConversionError(f"PDF text extraction failed: {exc}") from exc

    def write_text(self, text: str, output_path: Path, title: str = "") -> None:
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
        except ImportError as exc:
            raise ConversionError("PDF conversion requires reportlab.") from exc

        font_name = register_pdf_font()
        styles = getSampleStyleSheet()
        for style_name in ("Title", "BodyText"):
            styles[style_name].fontName = font_name

        document = SimpleDocTemplate(
            str(output_path),
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36,
        )
        story = []
        if title:
            story.extend([Paragraph(escape(Path(title).name), styles["Title"]), Spacer(1, 12)])
        for block in paragraphs(text):
            story.append(Paragraph(escape(block).replace("\n", "<br/>"), styles["BodyText"]))
            story.append(Spacer(1, 8))
        document.build(story)

    def page_count(self, source_path: Path, text: str) -> int:
        try:
            from pypdf import PdfReader

            return max(1, len(PdfReader(str(source_path)).pages))
        except Exception:
            return estimate_text_pages(text)
