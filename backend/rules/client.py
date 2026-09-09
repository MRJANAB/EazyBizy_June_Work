"""rules/client.py — read-only Supabase REST client for loan_scheme_rules.

Talks to Supabase's PostgREST endpoint directly over HTTPS (no supabase-py
dependency needed for a handful of read-only GET queries). Configured via
the same SUPABASE_URL / SUPABASE_ANON_KEY the frontend already uses — the
`loan_scheme_rules` table is public-read (see the migration), so the anon
key is sufficient; no service-role secret is needed on the backend.
"""

from __future__ import annotations

import os
from typing import Any, Protocol

import httpx

from .seed_defaults import fetch_seed_rows

_TABLE = "loan_scheme_rules"


class RulesClient(Protocol):
    """Minimal interface the RulesEngine depends on — lets tests inject a fake."""

    def fetch_rows(self, scheme_id: str, rule_key: str) -> list[dict[str, Any]]:
        ...


class SupabaseRulesClient:
    """Fetches active rule rows for a given scheme_id + rule_key from Supabase."""

    def __init__(self, base_url: str | None = None, api_key: str | None = None, timeout: float = 5.0):
        self.base_url = (base_url or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self.api_key = api_key or os.environ.get("SUPABASE_ANON_KEY") or ""
        self.timeout = timeout

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    def fetch_rows(self, scheme_id: str, rule_key: str) -> list[dict[str, Any]]:
        """
        Return active rows matching (scheme_id OR 'default') AND rule_key,
        newest effective_date first. Caller resolves the scheme-vs-default
        fallback precedence — this just returns candidates.
        """
        if not self.is_configured:
            # SUPABASE_URL/SUPABASE_ANON_KEY not set — dev/test/pre-setup
            # environment. Fall back to the offline bootstrap seed rather
            # than failing every scheme calculation; see seed_defaults.py.
            return fetch_seed_rows(scheme_id, rule_key)

        url = f"{self.base_url}/rest/v1/{_TABLE}"
        params = {
            "select": "scheme_id,bank_name,value,effective_date,source_reference,active",
            "scheme_id": f"in.({scheme_id},default)",
            "rule_key": f"eq.{rule_key}",
            "active": "eq.true",
            "order": "effective_date.desc",
        }
        headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
        }
        try:
            resp = httpx.get(url, params=params, headers=headers, timeout=self.timeout)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError:
            return []
