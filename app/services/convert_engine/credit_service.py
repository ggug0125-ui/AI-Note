"""Credit policy for FILE-2 conversions."""

from typing import Optional


def calculate_conversion_credits(page_count: Optional[int]) -> float:
    pages = max(1, int(page_count or 1))
    if pages <= 2:
        return 1
    return pages * 0.5
