"""
MUDRA Finance Calculator
========================
Pradhan Mantri MUDRA Yojana — collateral-free micro-enterprise loans.

Tiers
-----
Shishu    : up to Rs. 50,000
Kishor    : Rs. 50,001 – Rs. 5,00,000
Tarun     : Rs. 5,00,001 – Rs. 10,00,000
TarunPlus : Rs. 10,00,001 – Rs. 20,00,000  (RBI circular 2023)

Promoter-contribution % per tier is read from the Rules & Rates engine
(rules/engine.py) rather than hardcoded here.

Exports
-------
calculate_mudra_finance(project_cost, scheme_type) -> dict
validate_mudra(project_cost, scheme_type) -> None
MudraValidationError
"""

from rules import get_default_engine

# ── Tier definitions (loan-amount ceilings — these are RBI/scheme
#    eligibility BANDS, not a financing-split rate, so they stay here) ────────

MUDRA_TIERS = {
    "mudra_shishu":    {"label": "Shishu",     "min": 0,          "max": 50_000},
    "mudra_kishor":    {"label": "Kishor",      "min": 50_001,     "max": 500_000},
    "mudra_tarun":     {"label": "Tarun",       "min": 500_001,    "max": 1_000_000},
    "mudra_tarunplus": {"label": "Tarun Plus",  "min": 1_000_001,  "max": 2_000_000},
}


def _promoter_pct(key: str) -> float:
    return get_default_engine().get_promoter_contribution_pct(key)


class MudraValidationError(ValueError):
    """Raised when project cost exceeds the selected MUDRA tier limit."""
    pass


def _tier_key(scheme_type) -> str:
    """Normalise scheme_type (enum or string) to a lower-case tier key."""
    raw = scheme_type.value if hasattr(scheme_type, "value") else str(scheme_type)
    return raw.strip().lower().replace("-", "_").replace(" ", "_")


def validate_mudra(project_cost: float, scheme_type) -> None:
    """
    Validate that project cost is within the selected MUDRA tier.

    Raises MudraValidationError on failure.
    """
    key = _tier_key(scheme_type)
    tier = MUDRA_TIERS.get(key)
    if not tier:
        raise MudraValidationError(
            f"Unknown MUDRA tier: '{scheme_type}'. "
            f"Valid tiers: {', '.join(MUDRA_TIERS.keys())}"
        )
    loan_estimate = project_cost * (1 - _promoter_pct(key))
    if loan_estimate > tier["max"]:
        raise MudraValidationError(
            f"MUDRA {tier['label']} max bank loan is Rs.{tier['max']:,}. "
            f"Estimated loan of Rs.{loan_estimate:,.0f} exceeds this limit. "
            f"Consider MUDRA {list(MUDRA_TIERS.values())[list(MUDRA_TIERS.keys()).index(key) + 1]['label'] if key != 'mudra_tarunplus' else 'Tarun Plus (max tier)'}."
        )


def calculate_mudra_finance(fixed_project_cost: float, scheme_type) -> dict:
    """
    Calculate MUDRA financing split for a given fixed project cost and tier.

    Parameters
    ----------
    fixed_project_cost : Fixed capital only (land + P&M + fixtures + prelim).
                         WC margin is NOT included — it is handled separately in router.
    scheme_type        : SchemeType enum or string, e.g. "mudra_kishor".

    Returns
    -------
    dict with promoter_amount, term_loan, margin_money (always 0 for MUDRA),
    tier details, and collateral note.
    """
    key  = _tier_key(scheme_type)
    tier = MUDRA_TIERS.get(key, MUDRA_TIERS["mudra_kishor"])

    promoter_pct    = _promoter_pct(key)
    promoter_amount = round(fixed_project_cost * promoter_pct)
    raw_loan        = fixed_project_cost - promoter_amount
    # Cap bank loan at tier ceiling
    term_loan       = round(min(raw_loan, tier["max"]))
    # If fixed_project_cost > tier max + promoter share, promoter must make up the diff
    effective_promoter = round(fixed_project_cost - term_loan)

    collateral_note = (
        "No collateral required for loans up to Rs.10L under CGTMSE coverage."
        if tier["max"] <= 1_000_000
        else "Collateral as per bank's discretion for loans above Rs.10L."
    )

    return {
        "promoter_amount":  effective_promoter,
        "promoter_pct":     round(effective_promoter / fixed_project_cost * 100, 1) if fixed_project_cost else 0,
        "term_loan":        term_loan,
        "term_loan_pct":    round(term_loan / fixed_project_cost * 100, 1) if fixed_project_cost else 0,
        "margin_money":     0,
        "margin_money_pct": 0,
        "mudra_tier":       tier["label"],
        "tier_max_loan":    tier["max"],
        "collateral_note":  collateral_note,
    }
