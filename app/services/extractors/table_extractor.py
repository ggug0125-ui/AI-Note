"""Spreadsheet and CSV text extractors for upload analysis."""

from math import ceil
from pathlib import Path
from typing import Iterable

from app.services.extractors.base import BaseExtractor, ExtractedDocument, ExtractionError

ROWS_PER_ESTIMATED_PAGE = 40
EMPTY_DATA_MESSAGE = "데이터가 없습니다."


def _stringify_cell(value: object) -> str:
    if value is None:
        return ""

    text = str(value).strip()
    if text.lower() in {"nan", "nat", "none"}:
        return ""
    return text


def _estimated_pages(row_count: int) -> int:
    return max(1, ceil(row_count / ROWS_PER_ESTIMATED_PAGE))


def _clean_dataframe(dataframe: "object") -> "object":
    if dataframe is None or dataframe.empty:
        raise ExtractionError(EMPTY_DATA_MESSAGE)

    cleaned = dataframe.dropna(how="all")
    if cleaned.empty:
        raise ExtractionError(EMPTY_DATA_MESSAGE)

    return cleaned.fillna("")


def _dataframe_rows_to_text(dataframe: "object") -> tuple[str, int]:
    cleaned = _clean_dataframe(dataframe)
    columns: Iterable[object] = list(cleaned.columns)
    row_blocks: list[str] = []

    for row_number, (_, row) in enumerate(cleaned.iterrows(), start=1):
        lines = [f"행 {row_number}"]
        for column in columns:
            label = _stringify_cell(column)
            value = _stringify_cell(row[column])
            if not label or label.lower().startswith("unnamed:"):
                label = "값"
            if value:
                lines.append(f"{label} : {value}")
        if len(lines) > 1:
            row_blocks.append("\n".join(lines))

    if not row_blocks:
        raise ExtractionError(EMPTY_DATA_MESSAGE)

    return "\n\n------------------\n\n".join(row_blocks), len(row_blocks)


class XlsxExtractor(BaseExtractor):
    file_type = "XLSX"
    file_extension = ".xlsx"

    def extract(self, path: Path) -> ExtractedDocument:
        try:
            import pandas as pd
        except ImportError as exc:
            raise ExtractionError("Excel 업로드를 위해 pandas/openpyxl 설치가 필요합니다.") from exc

        try:
            sheets = pd.read_excel(path, sheet_name=None)
        except ValueError as exc:
            raise ExtractionError(EMPTY_DATA_MESSAGE) from exc

        text_parts: list[str] = []
        sheet_page_counts: list[dict[str, object]] = []

        for sheet_name, dataframe in sheets.items():
            try:
                rows_text, row_count = _dataframe_rows_to_text(dataframe)
            except ExtractionError:
                continue

            page_count = _estimated_pages(row_count)
            sheet_page_counts.append(
                {
                    "sheet_name": str(sheet_name),
                    "row_count": row_count,
                    "page_count": page_count,
                }
            )
            text_parts.append(f"=== Sheet : {sheet_name} ===\n\n{rows_text}")

        if not text_parts:
            raise ExtractionError(EMPTY_DATA_MESSAGE)

        total_pages = sum(int(item["page_count"]) for item in sheet_page_counts)
        return ExtractedDocument(
            text="\n\n====================\n\n".join(text_parts),
            file_type=self.file_type,
            page_count=max(1, total_pages),
            metadata={
                "basis_type": "estimated_pages",
                "basis_count": max(1, total_pages),
                "sheet_count": len(sheet_page_counts),
                "sheet_page_counts": sheet_page_counts,
            },
        )


class CsvExtractor(BaseExtractor):
    file_type = "CSV"
    file_extension = ".csv"

    def extract(self, path: Path) -> ExtractedDocument:
        try:
            import pandas as pd
            from pandas.errors import EmptyDataError
        except ImportError as exc:
            raise ExtractionError("CSV 업로드를 위해 pandas 설치가 필요합니다.") from exc

        last_error: Exception | None = None
        for encoding in ("utf-8-sig", "utf-8", "cp949"):
            try:
                dataframe = pd.read_csv(path, encoding=encoding)
                rows_text, row_count = _dataframe_rows_to_text(dataframe)
                page_count = _estimated_pages(row_count)
                sheet_page_counts = [
                    {
                        "sheet_name": "CSV",
                        "row_count": row_count,
                        "page_count": page_count,
                    }
                ]
                return ExtractedDocument(
                    text=f"=== CSV ===\n\n{rows_text}",
                    file_type=self.file_type,
                    page_count=page_count,
                    metadata={
                        "basis_type": "estimated_pages",
                        "basis_count": page_count,
                        "sheet_count": 1,
                        "sheet_page_counts": sheet_page_counts,
                    },
                )
            except EmptyDataError as exc:
                raise ExtractionError(EMPTY_DATA_MESSAGE) from exc
            except UnicodeDecodeError as exc:
                last_error = exc
                continue

        if last_error:
            raise ExtractionError("CSV 파일 인코딩을 읽지 못했습니다.") from last_error
        raise ExtractionError(EMPTY_DATA_MESSAGE)
