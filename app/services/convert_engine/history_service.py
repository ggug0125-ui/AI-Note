"""History formatting helpers for converted documents."""

from pathlib import Path
from typing import Any, Dict, Iterable, List

from app.services.convert_engine.utils import normalize_type, safe_filename_part


def build_display_filename(original_filename: str, target_type: str) -> str:
    stem = safe_filename_part(original_filename)
    target = normalize_type(target_type) or "converted"
    return f"{stem}.{target}"


def unique_display_filename(base_filename: str, records: Iterable[Dict[str, Any]]) -> str:
    existing = {
        str(record.get("display_filename") or "").strip()
        for record in records
        if str(record.get("display_filename") or "").strip()
    }
    if base_filename not in existing:
        return base_filename

    path = Path(base_filename)
    stem = path.stem
    suffix = path.suffix
    index = 1
    while True:
        candidate = f"{stem} ({index}){suffix}"
        if candidate not in existing:
            return candidate
        index += 1


def next_display_filename(store: Any, user_id: str, user_email: str, original_filename: str, target_type: str) -> str:
    base_filename = build_display_filename(original_filename, target_type)
    records = store.list_for_user(user_id=user_id, user_email=user_email, limit=500)
    return unique_display_filename(base_filename, records)


def format_history(records: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    formatted = []
    for record in records:
        next_record = dict(record)
        next_record["display_filename"] = next_record.get("display_filename") or build_display_filename(
            str(next_record.get("original_filename") or "converted"),
            str(next_record.get("target_type") or next_record.get("target_format") or "bin"),
        )
        next_record["page_count"] = int(next_record.get("page_count") or 1)
        formatted.append(next_record)
    return sorted(formatted, key=lambda item: str(item.get("created_at") or ""), reverse=True)
