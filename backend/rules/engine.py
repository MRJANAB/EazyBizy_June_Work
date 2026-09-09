"""rules/engine.py — Loan Scheme Rules & Rates engine.

Single source of truth for scheme/bank-configurable financing-split
numbers (PMEGP subsidy tiers, promoter contribution minimums, bank
scorecard benchmarks incl. DSCR, default term-loan/working-capital
bank-finance %, default interest rate, scheme moratorium overrides).

Resolution order for `get_rule(scheme_id, rule_key)`:
  1. an active row for the exact scheme_id
  2. an active row for scheme_id='default' (generic fallback)
  3. raise MissingRuleError — never invent a value.

A caller that wants "no scheme override configured" to mean something
different from "missing configuration" (e.g. moratorium, where PMEGP/MSME
genuinely have no scheme-mandated override and should just use the user's
own input) passes `use_default_fallback=False` and catches MissingRuleError.

The engine depends only on the `RulesClient` protocol (see client.py), so
tests inject a fake client with canned rows instead of hitting Supabase.
"""

from __future__ import annotations

from typing import Any

from .cache import RulesCache
from .client import RulesClient, SupabaseRulesClient
from .exceptions import MissingRuleError

_KNOWN_SCHEMES = {
    "pmegp", "mudra_shishu", "mudra_kishor", "mudra_tarun", "mudra_tarunplus",
    "cgtmse", "msme_psu", "default",
}


def normalize_scheme_id(scheme_id: str) -> str:
    """Match the frontend's loose scheme-string variants to a canonical id."""
    key = (scheme_id or "default").strip().lower().replace("-", "_").replace(" ", "_")
    if key == "mudra":
        key = "mudra_kishor"  # legacy alias, matches schemes/router.py convention
    if key == "normal_msme":
        key = "msme_psu"
    return key if key in _KNOWN_SCHEMES else "default"


class RulesEngine:
    def __init__(self, client: RulesClient | None = None, cache: RulesCache | None = None):
        self.client = client or SupabaseRulesClient()
        self.cache = cache or RulesCache()

    def _fetch(self, scheme_id: str, rule_key: str) -> list[dict[str, Any]]:
        rows = self.cache.get(scheme_id, rule_key)
        if rows is None:
            rows = self.client.fetch_rows(scheme_id, rule_key)
            self.cache.set(scheme_id, rule_key, rows)
        return rows

    def get_rule(
        self,
        scheme_id: str,
        rule_key: str,
        *,
        use_default_fallback: bool = True,
    ) -> dict[str, Any]:
        scheme_id = normalize_scheme_id(scheme_id)
        rows = self._fetch(scheme_id, rule_key)

        exact = [r for r in rows if r.get("scheme_id") == scheme_id and r.get("active", True)]
        if exact:
            return exact[0]["value"]

        if use_default_fallback and scheme_id != "default":
            fallback = [r for r in rows if r.get("scheme_id") == "default" and r.get("active", True)]
            if fallback:
                return fallback[0]["value"]

        raise MissingRuleError(scheme_id, rule_key)

    # ── Typed getters ────────────────────────────────────────────────────────

    def get_scorecard_benchmarks(self, scheme_id: str) -> dict[str, float]:
        """dscr_avg, current_ratio, debt_equity, ebitda_margin, net_margin,
        interest_coverage, tol_tnw, promoter_pct."""
        return self.get_rule(scheme_id, "scorecard_benchmarks")

    def get_dscr_benchmark(self, scheme_id: str) -> float:
        return float(self.get_scorecard_benchmarks(scheme_id)["dscr_avg"])

    def get_margin_money_subsidy_pct(self, category_type: str, area_key: str, scheme_id: str = "pmegp") -> float:
        table = self.get_rule(scheme_id, "margin_money_subsidy_pct", use_default_fallback=False)
        key = f"{category_type.lower()}_{area_key.lower()}"
        if key not in table:
            raise MissingRuleError(scheme_id, f"margin_money_subsidy_pct[{key}]")
        return float(table[key]) / 100.0

    def get_promoter_contribution_pct(self, scheme_id: str, category_type: str | None = None) -> float:
        table = self.get_rule(scheme_id, "promoter_contribution_pct", use_default_fallback=False)
        if category_type is not None and category_type.lower() in table:
            return float(table[category_type.lower()]) / 100.0
        if "default" in table:
            return float(table["default"]) / 100.0
        raise MissingRuleError(scheme_id, "promoter_contribution_pct")

    def get_term_loan_pct_default(self, scheme_id: str) -> float:
        value = self.get_rule(scheme_id, "term_loan_pct_default", use_default_fallback=False)
        return float(value["default"]) / 100.0

    def get_wc_loan_pct_default(self, scheme_id: str = "default") -> float:
        value = self.get_rule(scheme_id, "wc_loan_pct_default")
        return float(value["default"]) / 100.0

    def get_interest_rate_pct_default(self, scheme_id: str = "default") -> float:
        value = self.get_rule(scheme_id, "interest_rate_pct_default")
        return float(value["default"])

    def get_moratorium_months_default(self, scheme_id: str) -> float | None:
        """None means the scheme has no mandated override — caller should
        use the user's own input rather than treating this as missing config."""
        try:
            value = self.get_rule(scheme_id, "moratorium_months_default", use_default_fallback=False)
        except MissingRuleError:
            return None
        return float(value["default"])

    def get_promoter_floor_pct(self, scheme_id: str) -> float:
        value = self.get_rule(scheme_id, "promoter_floor_pct", use_default_fallback=False)
        return float(value["default"]) / 100.0


_default_engine: RulesEngine | None = None


def get_default_engine() -> RulesEngine:
    """Process-wide singleton so all callers share one cache."""
    global _default_engine
    if _default_engine is None:
        _default_engine = RulesEngine()
    return _default_engine
