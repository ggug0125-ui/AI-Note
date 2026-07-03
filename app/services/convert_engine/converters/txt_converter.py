"""TXT converter."""

from pathlib import Path
from typing import List

from app.services.convert_engine.converters.base import BaseConverter


class TxtConverter(BaseConverter):
    file_type = "txt"

    def supported_targets(self) -> List[str]:
        return ["pdf", "xlsx", "hwpx"]

    def extract_text(self, source_path: Path) -> str:
        for encoding in ("utf-8", "utf-8-sig", "cp949", "euc-kr"):
            try:
                return source_path.read_text(encoding=encoding)
            except UnicodeDecodeError:
                continue
        return source_path.read_text(encoding="utf-8", errors="replace")

    def write_text(self, text: str, output_path: Path, title: str = "") -> None:
        output_path.write_text(text, encoding="utf-8")
