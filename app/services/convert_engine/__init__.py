"""FILE-2 conversion engine public API."""

from app.services.convert_engine.download_service import resolve_converted_download
from app.services.convert_engine.engine import convert_file, get_supported_targets
from app.services.convert_engine.history_service import format_history, next_display_filename
from app.services.convert_engine.models import ConversionRequest, ConversionResult, DownloadFile, SupportedTarget
from app.services.convert_engine.utils import (
    ConversionError,
    DownloadNotFoundError,
    UnsupportedConversionError,
    calculate_conversion_credits,
    is_supported_type,
    normalize_type,
    source_type_from_filename,
)

__all__ = [
    "ConversionError",
    "ConversionRequest",
    "ConversionResult",
    "DownloadFile",
    "DownloadNotFoundError",
    "SupportedTarget",
    "UnsupportedConversionError",
    "calculate_conversion_credits",
    "convert_file",
    "format_history",
    "get_supported_targets",
    "is_supported_type",
    "next_display_filename",
    "normalize_type",
    "resolve_converted_download",
    "source_type_from_filename",
]
