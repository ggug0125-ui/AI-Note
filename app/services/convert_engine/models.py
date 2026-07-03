"""Models for the FILE-2 conversion engine."""

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ConversionRequest:
    source_path: Path
    source_type: str
    target_type: str
    user_id: str
    filename: str


@dataclass(frozen=True)
class ConversionResult:
    conversion_id: str
    original_filename: str
    output_path: Path
    output_filename: str
    display_filename: str
    original_type: str
    target_type: str
    target_format: str
    page_count: int
    credit_cost: float
    status: str
    message: str
    text: str


@dataclass(frozen=True)
class SupportedTarget:
    source_type: str
    target_type: str
    label: str


@dataclass(frozen=True)
class DownloadFile:
    path: Path
    filename: str
    record: dict
