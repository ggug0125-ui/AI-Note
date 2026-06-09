"""File conversion helpers for Excel and HWPX documents."""

import re
import zipfile
from pathlib import Path
from typing import Literal
from xml.etree import ElementTree


TargetFormat = Literal["csv", "pdf", "txt"]


class ConversionError(Exception):
    """Raised when a file cannot be converted."""


class UnsupportedConversionError(ConversionError):
    """Raised for known but unsupported conversions."""


def safe_filename_part(value: str) -> str:
    stem = Path(value).stem or "converted"
    sanitized = re.sub(r"[^A-Za-z0-9가-힣._-]+", "_", stem).strip("._")
    return sanitized or "converted"


def convert_file(source_path: Path, original_filename: str, target_format: TargetFormat, output_dir: Path, unique_id: str) -> Path:
    suffix = source_path.suffix.lower()
    output_dir.mkdir(parents=True, exist_ok=True)
    output_base = f"{safe_filename_part(original_filename)}_{unique_id}"

    if suffix in {".xlsx", ".xls"} and target_format == "csv":
        output_path = output_dir / f"{output_base}.csv"
        excel_to_csv(source_path, output_path)
        return output_path

    if suffix in {".xlsx", ".xls"} and target_format == "pdf":
        output_path = output_dir / f"{output_base}.pdf"
        excel_to_pdf(source_path, output_path)
        return output_path

    if suffix == ".hwpx" and target_format == "txt":
        output_path = output_dir / f"{output_base}.txt"
        hwpx_to_txt(source_path, output_path)
        return output_path

    if suffix == ".hwp":
        raise UnsupportedConversionError("HWP 파일 변환은 지원 예정입니다. HWPX 파일을 TXT로 변환해 주세요.")

    raise UnsupportedConversionError("지원하지 않는 변환 조합입니다.")


def excel_to_csv(source_path: Path, output_path: Path) -> None:
    try:
        import pandas as pd
    except ImportError as exc:
        raise ConversionError("Excel 변환을 위해 pandas/openpyxl/xlrd 설치가 필요합니다.") from exc

    try:
        dataframe = pd.read_excel(source_path)
        dataframe.to_csv(output_path, index=False, encoding="utf-8-sig")
    except Exception as exc:
        raise ConversionError(f"Excel to CSV conversion failed: {exc}") from exc


def excel_to_pdf(source_path: Path, output_path: Path) -> None:
    try:
        import pandas as pd
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError as exc:
        raise ConversionError("PDF 변환을 위해 pandas/openpyxl/xlrd/reportlab 설치가 필요합니다.") from exc

    try:
        dataframe = pd.read_excel(source_path).fillna("")
        limited = dataframe.head(80)
        columns = [str(column) for column in limited.columns]
        rows = [[str(value) for value in row] for row in limited.values.tolist()]
        table_data = [columns] + rows if columns else [["No data"]]

        styles = getSampleStyleSheet()
        document = SimpleDocTemplate(
            str(output_path),
            pagesize=landscape(A4),
            leftMargin=24,
            rightMargin=24,
            topMargin=24,
            bottomMargin=24,
        )
        story = [
            Paragraph(f"Converted Excel Preview: {source_path.name}", styles["Title"]),
            Spacer(1, 12),
        ]
        table = Table(table_data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EF4444")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#DDDDDD")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 7),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F7F7")]),
                ]
            )
        )
        story.append(table)
        document.build(story)
    except Exception as exc:
        raise ConversionError(f"Excel to PDF conversion failed: {exc}") from exc


def hwpx_to_txt(source_path: Path, output_path: Path) -> None:
    try:
        with zipfile.ZipFile(source_path) as archive:
            section_names = sorted(
                name for name in archive.namelist()
                if name.startswith("Contents/section") and name.endswith(".xml")
            )
            if not section_names:
                section_names = sorted(name for name in archive.namelist() if name.endswith(".xml"))

            extracted_parts = []
            for section_name in section_names:
                xml_bytes = archive.read(section_name)
                root = ElementTree.fromstring(xml_bytes)
                texts = [
                    node.text.strip()
                    for node in root.iter()
                    if node.text and node.text.strip()
                ]
                if texts:
                    extracted_parts.append("\n".join(texts))

        text = "\n\n".join(extracted_parts).strip()
        if not text:
            raise ConversionError("HWPX에서 추출 가능한 텍스트를 찾지 못했습니다.")
        output_path.write_text(text, encoding="utf-8")
    except zipfile.BadZipFile as exc:
        raise ConversionError("올바른 HWPX 파일이 아닙니다.") from exc
    except ElementTree.ParseError as exc:
        raise ConversionError("HWPX XML을 파싱하지 못했습니다.") from exc
