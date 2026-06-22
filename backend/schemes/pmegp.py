# PMEGP rules
"""
PMEGP Finance Calculator
========================
Prime Minister's Employment Generation Programme — scheme-specific
financing split: Promoter Equity, Margin Money Subsidy, and Term Loan.

Exports
-------
calculate_pmegp_finance(project_cost, social_category, area_type, industry, business_status)
validate_pmegp(project_cost, industry_type, business_status)
PMEGPValidationError
"""

# ── Scheme Constants ──────────────────────────────────────────────────────────

PROMOTER_CONTRIBUTION = {
    "General": 0.10,
    "Special": 0.05,   # SC/ST/OBC/Women/Minority/Ex-Serviceman/PwD
}

MARGIN_MONEY = {
    ("General", "Urban"): 0.15,
    ("General", "Rural"): 0.25,
    ("Special", "Urban"): 0.25,
    ("Special", "Rural"): 0.35,
}

# Raw social category strings that qualify as "Special"
_SPECIAL_RAW = {
    "sc", "st", "obc", "minority", "women", "ex-serviceman",
    "ex serviceman", "ex_serviceman", "exserviceman",
    "pwd", "pw_d", "persons with disability",
}

# ── Validation Limits ─────────────────────────────────────────────────────────

MAX_PROJECT_COST_MANUFACTURING  = 5_000_000   # Rs. 50 Lakh
MAX_PROJECT_COST_SERVICE_TRADING = 2_000_000  # Rs. 20 Lakh


class PMEGPValidationError(ValueError):
    """Raised when input violates PMEGP scheme eligibility rules."""
    pass


# ── Internal helpers ──────────────────────────────────────────────────────────

def _resolve_category_type(social_category: str) -> str:
    """
    Return "Special" or "General" from any of:
      - raw category strings ("OBC", "sc", "Women" …)
      - pre-computed labels ("Special", "General")
      - SocialCategory enum value strings
    """
    s = social_category.strip()
    # Already resolved
    if s in ("Special", "General"):
        return s
    return "Special" if s.lower().replace(" ", "_") in _SPECIAL_RAW else "General"


def _resolve_area_key(area_type: str) -> str:
    a = area_type.strip().lower()
    return "Urban" if a in ("urban", "semi-urban", "semi_urban") else "Rural"


# ── Public API ────────────────────────────────────────────────────────────────

def validate_pmegp(
    project_cost: float,
    industry_type: str,
    business_status: str,
) -> None:
    """
    Validate PMEGP eligibility.  Raises PMEGPValidationError on failure.

    Parameters
    ----------
    project_cost   : Fixed capital project cost (excluding WC bank loan).
    industry_type  : "manufacturing", "service", "trading", etc.
    business_status: Must not contain "existing".
    """
    if "existing" in business_status.lower():
        raise PMEGPValidationError(
            "PMEGP is only for new businesses. "
            "Existing businesses are not eligible under this scheme."
        )

    ind = industry_type.strip().lower()
    if "manufactur" in ind and project_cost > MAX_PROJECT_COST_MANUFACTURING:
        raise PMEGPValidationError(
            f"PMEGP max project cost is Rs.50L for Manufacturing. "
            f"Submitted: Rs.{project_cost:,.0f}"
        )
    if ("service" in ind or "trading" in ind) and project_cost > MAX_PROJECT_COST_SERVICE_TRADING:
        raise PMEGPValidationError(
            f"PMEGP max project cost is Rs.20L for Service/Trading. "
            f"Submitted: Rs.{project_cost:,.0f}"
        )


def calculate_pmegp_finance(
    fixed_project_cost: float,
    social_category: str,
    area_type: str,
    industry: str = "",
    business_status: str = "",
) -> dict:
    """
    Calculate PMEGP financing split.

    Validates eligibility first (validate_pmegp), then returns the three-way
    split of the fixed capital project cost.

    Parameters
    ----------
    fixed_project_cost : Fixed capital cost only (land + P&M + fixtures + prelim).
                         WC margin is handled separately — not included here.
    social_category    : Raw category ("OBC", "SC" …) OR pre-resolved ("Special"/"General").
    area_type          : "Urban" or "Rural" (case-insensitive).
    industry           : Used for cap validation (optional when validate_pmegp called first).
    business_status    : Used for new-business validation (optional when called first).

    Returns
    -------
    dict with keys: promoter_amount, promoter_pct, margin_money, margin_money_pct,
                    term_loan, term_loan_pct, category_type, area_type, tdr_note
    """
    # Run validation (safe to call even if validate_pmegp already ran)
    if industry or business_status:
        validate_pmegp(fixed_project_cost, industry, business_status)

    category_type = _resolve_category_type(social_category)
    area_key      = _resolve_area_key(area_type)

    promoter_pct  = PROMOTER_CONTRIBUTION[category_type]
    subsidy_pct   = MARGIN_MONEY[(category_type, area_key)]
    bank_loan_pct = 1.0 - promoter_pct - subsidy_pct

    return {
        "promoter_amount":  round(fixed_project_cost * promoter_pct),
        "promoter_pct":     round(promoter_pct * 100, 1),
        "margin_money":     round(fixed_project_cost * subsidy_pct),
        "margin_money_pct": round(subsidy_pct * 100, 1),
        "term_loan":        round(fixed_project_cost * bank_loan_pct),
        "term_loan_pct":    round(bank_loan_pct * 100, 1),
        "category_type":    category_type,
        "area_type":        area_key,
        "tdr_note": (
            "Margin Money held as TDR for 3 years as per PMEGP guidelines. "
            "Adjusted against loan after lock-in."
        ),
    }
