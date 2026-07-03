"""Converter factory for FILE-2."""

from typing import Dict, List, Type

from app.services.convert_engine.converters import BaseConverter, HwpxConverter, PdfConverter, TxtConverter, XlsxConverter
from app.services.convert_engine.utils import UnsupportedConversionError, normalize_type


class ConverterFactory:
    _converters: Dict[str, Type[BaseConverter]] = {
        "pdf": PdfConverter,
        "txt": TxtConverter,
        "xlsx": XlsxConverter,
        "hwpx": HwpxConverter,
    }

    @classmethod
    def get_converter(cls, source_type: str) -> BaseConverter:
        normalized = normalize_type(source_type)
        converter = cls._converters.get(normalized)
        if converter is None:
            raise UnsupportedConversionError(f"Unsupported file type: {source_type}")
        return converter()

    @classmethod
    def get_supported_targets(cls, source_type: str) -> List[str]:
        try:
            return cls.get_converter(source_type).supported_targets()
        except UnsupportedConversionError:
            return []
