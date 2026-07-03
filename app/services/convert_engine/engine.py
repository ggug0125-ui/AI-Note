"""Public conversion engine functions."""

from pathlib import Path
from typing import List

from app.services.convert_engine.factory import ConverterFactory
from app.services.convert_engine.credit_service import calculate_conversion_credits
from app.services.convert_engine.history_service import build_display_filename
from app.services.convert_engine.models import ConversionRequest, ConversionResult
from app.services.convert_engine.utils import build_output_path, conversion_id_for_user, normalize_type


def get_supported_targets(source_type: str) -> List[str]:
    return ConverterFactory.get_supported_targets(source_type)


def _get_pdf_page_count(pdf_path: Path) -> int:
    from pypdf import PdfReader

    return max(1, len(PdfReader(str(pdf_path)).pages))


def convert_file(source_path: Path, source_type: str, target_type: str, user_id: str, filename: str) -> ConversionResult:
    request = ConversionRequest(
        source_path=source_path,
        source_type=normalize_type(source_type),
        target_type=normalize_type(target_type),
        user_id=user_id,
        filename=filename,
    )
    converter = ConverterFactory.get_converter(request.source_type)
    conversion_id = conversion_id_for_user(request.user_id)
    output_path = build_output_path(conversion_id, request.target_type)

    text = converter.convert(
        source_path=request.source_path,
        target_type=request.target_type,
        output_path=output_path,
        original_filename=request.filename,
    )
    page_count = converter.page_count(request.source_path, text)
    if request.target_type == "pdf":
        page_count = _get_pdf_page_count(output_path)
    credit_cost = calculate_conversion_credits(page_count)

    return ConversionResult(
        conversion_id=conversion_id,
        original_filename=request.filename,
        output_path=output_path,
        output_filename=output_path.name,
        display_filename=build_display_filename(request.filename, request.target_type),
        original_type=request.source_type,
        target_type=request.target_type,
        target_format=request.target_type,
        page_count=page_count,
        credit_cost=credit_cost,
        status="success",
        message="Conversion completed",
        text=text,
    )
