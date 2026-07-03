"""Download validation service for converted documents."""

from pathlib import Path
from typing import Any

from app.services.convert_engine.models import DownloadFile
from app.services.convert_engine.history_service import build_display_filename
from app.services.convert_engine.utils import DownloadNotFoundError


def resolve_converted_download(store: Any, conversion_id: str, user_id: str, user_email: str) -> DownloadFile:
    record = store.get_for_user(
        conversion_id=conversion_id,
        user_id=user_id,
        user_email=user_email,
    )
    if not record:
        raise DownloadNotFoundError("Converted file not found")

    file_path = Path(str(record.get("output_path") or ""))
    if not file_path.exists() or not file_path.is_file():
        raise DownloadNotFoundError("Converted file not found")

    return DownloadFile(
        path=file_path,
        filename=str(
            record.get("display_filename")
            or build_display_filename(
                str(record.get("original_filename") or file_path.stem),
                str(record.get("target_type") or file_path.suffix.lstrip(".")),
            )
        ),
        record=record,
    )
