"""rules/seed_defaults.py — offline bootstrap for the Rules & Rates engine.

Used ONLY when SUPABASE_URL/SUPABASE_ANON_KEY are not configured (local
dev, automated tests, or a fresh deploy before the backend's Supabase env
vars are set on Render) — i.e. "the rules service was never wired up",
which is a different failure mode from "the rules service is wired up but
a specific rule is genuinely missing" (that case still raises
MissingRuleError, per the "never invent a rate" requirement).

These values MUST match the seed INSERT statements in
supabase/migrations/20260909190000_loan_scheme_rules_master.sql exactly —
this is the one intentional duplication in the Rules Master design, and
exists only so the app keeps working with zero infra before the DB is
wired up. Once SUPABASE_URL/ANON_KEY are set and the migration is applied,
the live DB rows are the only source consulted; this module is dead code
in that state.
"""

from __future__ import annotations

from typing import Any

_S = "scorecard_benchmarks"


def _sb_row(scheme_id: str, value: dict[str, float]) -> dict[str, Any]:
    return {"scheme_id": scheme_id, "bank_name": None, "value": value, "active": True}


SEED_ROWS: dict[tuple[str, str], list[dict[str, Any]]] = {
    ("pmegp", _S): [_sb_row("pmegp", {
        "dscr_avg": 1.25, "current_ratio": 1.33, "debt_equity": 3.0, "ebitda_margin": 20.0,
        "net_margin": 10.0, "interest_coverage": 2.0, "tol_tnw": 4.0, "promoter_pct": 10.0,
    })],
    ("mudra_shishu", _S): [_sb_row("mudra_shishu", {
        "dscr_avg": 1.10, "current_ratio": 1.20, "debt_equity": 4.0, "ebitda_margin": 15.0,
        "net_margin": 8.0, "interest_coverage": 1.5, "tol_tnw": 5.0, "promoter_pct": 10.0,
    })],
    ("mudra_kishor", _S): [_sb_row("mudra_kishor", {
        "dscr_avg": 1.10, "current_ratio": 1.20, "debt_equity": 4.0, "ebitda_margin": 15.0,
        "net_margin": 8.0, "interest_coverage": 1.5, "tol_tnw": 5.0, "promoter_pct": 10.0,
    })],
    ("mudra_tarun", _S): [_sb_row("mudra_tarun", {
        "dscr_avg": 1.25, "current_ratio": 1.33, "debt_equity": 3.0, "ebitda_margin": 20.0,
        "net_margin": 10.0, "interest_coverage": 2.0, "tol_tnw": 4.0, "promoter_pct": 10.0,
    })],
    ("mudra_tarunplus", _S): [_sb_row("mudra_tarunplus", {
        "dscr_avg": 1.25, "current_ratio": 1.33, "debt_equity": 3.0, "ebitda_margin": 20.0,
        "net_margin": 10.0, "interest_coverage": 2.0, "tol_tnw": 4.0, "promoter_pct": 10.0,
    })],
    ("cgtmse", _S): [_sb_row("cgtmse", {
        "dscr_avg": 1.25, "current_ratio": 1.33, "debt_equity": 3.0, "ebitda_margin": 20.0,
        "net_margin": 10.0, "interest_coverage": 2.0, "tol_tnw": 4.0, "promoter_pct": 10.0,
    })],
    ("msme_psu", _S): [_sb_row("msme_psu", {
        "dscr_avg": 1.25, "current_ratio": 1.33, "debt_equity": 3.0, "ebitda_margin": 20.0,
        "net_margin": 10.0, "interest_coverage": 2.0, "tol_tnw": 4.0, "promoter_pct": 20.0,
    })],
    ("default", _S): [_sb_row("default", {
        "dscr_avg": 1.25, "current_ratio": 1.33, "debt_equity": 3.0, "ebitda_margin": 20.0,
        "net_margin": 10.0, "interest_coverage": 2.0, "tol_tnw": 4.0, "promoter_pct": 10.0,
    })],

    ("pmegp", "margin_money_subsidy_pct"): [_sb_row("pmegp", {
        "general_urban": 15, "general_rural": 25, "special_urban": 25, "special_rural": 35,
    })],

    ("pmegp", "promoter_contribution_pct"): [_sb_row("pmegp", {"general": 10, "special": 5})],
    ("mudra_shishu", "promoter_contribution_pct"): [_sb_row("mudra_shishu", {"default": 10})],
    ("mudra_kishor", "promoter_contribution_pct"): [_sb_row("mudra_kishor", {"default": 10})],
    ("mudra_tarun", "promoter_contribution_pct"): [_sb_row("mudra_tarun", {"default": 10})],
    ("mudra_tarunplus", "promoter_contribution_pct"): [_sb_row("mudra_tarunplus", {"default": 10})],

    ("cgtmse", "term_loan_pct_default"): [_sb_row("cgtmse", {"default": 85})],
    ("msme_psu", "term_loan_pct_default"): [_sb_row("msme_psu", {"default": 75})],

    ("default", "wc_loan_pct_default"): [_sb_row("default", {"default": 60})],

    ("default", "interest_rate_pct_default"): [_sb_row("default", {"default": 10.5})],

    ("mudra_shishu", "moratorium_months_default"): [_sb_row("mudra_shishu", {"default": 0})],
    ("mudra_kishor", "moratorium_months_default"): [_sb_row("mudra_kishor", {"default": 6})],
    ("mudra_tarun", "moratorium_months_default"): [_sb_row("mudra_tarun", {"default": 6})],
    ("mudra_tarunplus", "moratorium_months_default"): [_sb_row("mudra_tarunplus", {"default": 6})],
    ("cgtmse", "moratorium_months_default"): [_sb_row("cgtmse", {"default": 6})],

    ("msme_psu", "promoter_floor_pct"): [_sb_row("msme_psu", {"default": 10})],
}


def fetch_seed_rows(scheme_id: str, rule_key: str) -> list[dict[str, Any]]:
    rows = list(SEED_ROWS.get((scheme_id, rule_key), []))
    if scheme_id != "default":
        rows += SEED_ROWS.get(("default", rule_key), [])
    return rows
