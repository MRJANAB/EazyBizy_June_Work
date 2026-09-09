"""rules/cache.py — short-lived in-process cache for rule rows.

Rules change rarely (an admin edits a rate table), so a short TTL is safe
and keeps every PDF-generation request from adding a Supabase round-trip
per rule lookup (a single report touches ~5-10 rule keys).
"""

from __future__ import annotations

import time
from typing import Any

_DEFAULT_TTL_SECONDS = 300.0


class RulesCache:
    def __init__(self, ttl_seconds: float = _DEFAULT_TTL_SECONDS):
        self.ttl_seconds = ttl_seconds
        self._store: dict[tuple[str, str], tuple[float, list[dict[str, Any]]]] = {}

    def get(self, scheme_id: str, rule_key: str) -> list[dict[str, Any]] | None:
        entry = self._store.get((scheme_id, rule_key))
        if entry is None:
            return None
        expires_at, rows = entry
        if time.monotonic() > expires_at:
            del self._store[(scheme_id, rule_key)]
            return None
        return rows

    def set(self, scheme_id: str, rule_key: str, rows: list[dict[str, Any]]) -> None:
        self._store[(scheme_id, rule_key)] = (time.monotonic() + self.ttl_seconds, rows)

    def clear(self) -> None:
        self._store.clear()
