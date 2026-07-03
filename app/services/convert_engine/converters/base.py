"""Base converter contracts."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List

from app.services.convert_engine.utils import ConversionError, UnsupportedConversionError, estimate_text_pages, normalize_type


class BaseConverter(ABC):
    file_type = "file"

    @abstractmethod
    def supported_targets(self) -> List[str]:
        raise NotImplementedError

    def convert(self, source_path: Path, target_type: str, output_path: Path, original_filename: str) -> str:
        target = normalize_type(target_type)
        if target not in self.supported_targets():
            raise UnsupportedConversionError(f"Unsupported conversion: {self.file_type.upper()} -> {target.upper()}")

        text = self.extract_text(source_path)
        if not text.strip():
            raise ConversionError("No readable text was found in the source file.")

        from app.services.convert_engine.factory import ConverterFactory

        target_converter = ConverterFactory.get_converter(target)
        target_converter.write_text(text, output_path, title=original_filename)
        return text

    @abstractmethod
    def extract_text(self, source_path: Path) -> str:
        raise NotImplementedError

    @abstractmethod
    def write_text(self, text: str, output_path: Path, title: str = "") -> None:
        raise NotImplementedError

    def page_count(self, source_path: Path, text: str) -> int:
        return estimate_text_pages(text)
