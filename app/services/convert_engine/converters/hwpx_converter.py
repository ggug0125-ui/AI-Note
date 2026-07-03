"""HWPX converter."""

import zipfile
from html import escape
from pathlib import Path
from typing import List
from xml.etree import ElementTree

from app.services.convert_engine.converters.base import BaseConverter
from app.services.convert_engine.utils import ConversionError, non_empty_lines


class HwpxConverter(BaseConverter):
    file_type = "hwpx"

    def supported_targets(self) -> List[str]:
        return ["pdf", "txt", "xlsx"]

    def extract_text(self, source_path: Path) -> str:
        try:
            with zipfile.ZipFile(source_path) as archive:
                names = sorted(name for name in archive.namelist() if name.endswith(".xml"))
                sections = [name for name in names if name.startswith("Contents/section")] or names
                parts = []
                for name in sections:
                    root = ElementTree.fromstring(archive.read(name))
                    texts = [node.text.strip() for node in root.iter() if node.text and node.text.strip()]
                    if texts:
                        parts.append("\n".join(texts))
                return "\n\n".join(parts).strip()
        except zipfile.BadZipFile as exc:
            raise ConversionError("Invalid HWPX package.") from exc
        except ElementTree.ParseError as exc:
            raise ConversionError("HWPX XML parsing failed.") from exc

    def write_text(self, text: str, output_path: Path, title: str = "") -> None:
        paragraph_xml = "\n".join(f"<p><run><t>{escape(line)}</t></run></p>" for line in non_empty_lines(text))
        section_xml = f'<?xml version="1.0" encoding="UTF-8"?><section>{paragraph_xml}</section>'
        manifest_xml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<manifest><file-entry full-path="Contents/section0.xml" media-type="application/xml"/></manifest>'
        )
        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("mimetype", "application/hwp+zip")
            archive.writestr("META-INF/manifest.xml", manifest_xml)
            archive.writestr("Contents/section0.xml", section_xml)
