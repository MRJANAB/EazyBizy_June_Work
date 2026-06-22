"""
schemes/router.py — Master scheme router.

CA-Standard Project Finance Formula:
  Fixed Project Cost  = sum of fixed assets only (capex)
  Term Loan           = Fixed Project Cost × bank_finance_pct
  Promoter Fixed Eq.  = Fixed Project Cost − Term Loan
  Promoter WC Margin  = WC_Required × (1 − wc_loan_pct)
  WC Bank Loan        = WC_Required × wc_loan_pct
  Total Project Cost  = Fixed Project Cost + Promoter WC Margin
  Total Bank Exposure = Term Loan + WC Bank Loan

  WC Loan is a REVOLVING facility — never mixed with term loan or fixed project cost.

Scheme constants (never hardcoded in calculation functions):
  MUDRA_KISHOR:  TL=90%, Subsidy=0%,  Promoter=10%
  PMEGP:         TL=75%, Subsidy=15%, Promoter=10%
  CGTMSE:        TL=85%, Subsidy=0%,  Promoter=15%
"""

from models.input_schema import CMAReportInput, SchemeType, SocialCategory
from schemes.pmegp   import calculate_pmegp_finance, validate_pmegp
from schemes.mudra   import calculate_mudra_finance, validate_mudra
from schemes.cgtmse  import calculate_cgtmse_fee
from schemes.msme    import calculate_msme_finance

SPECIAL_CATEGORIES = {
    SocialCategory.SC, SocialCategory.ST, SocialCategory.OBC,
    SocialCategory.Minority, SocialCategory.Women,
    SocialCategory.ExServiceman, SocialCategory.PwD,
}

_MUDRA_SCHEMES = {
    SchemeType.Mudra_Shishu,
    SchemeType.Mudra_Kishor,
    SchemeType.Mudra_Tarun,
    SchemeType.Mudra_TarunPlus,
}


def route_scheme(data: CMAReportInput) -> dict:
    """
    Dispatch to the correct scheme calculator.
    Returns a dict with at minimum:
        promoter_amount, promoter_pct, term_loan, term_loan_pct,
        margin_money, margin_money_pct, project_cost,
        wc_loan, wc_loan_note,
        scheme, report_type, dscr_benchmark, moratorium_months
    """
    scheme                       = data.scheme
    fixed_pc, wc_margin, wc_loan = _compute_project_cost(data)
    total_pc                     = fixed_pc + wc_margin   # Total Project Cost for PDF display

    if scheme == SchemeType.PMEGP:
        validate_pmegp(fixed_pc, data.business.industry_type, data.business.business_status)
        cat     = "Special" if data.applicant.social_category in SPECIAL_CATEGORIES else "General"
        finance = calculate_pmegp_finance(fixed_pc, cat, data.applicant.area_type)
        return {
            **finance,
            "project_cost":      round(total_pc),
            "fixed_project_cost": round(fixed_pc),
            "wc_margin":         round(wc_margin),
            "wc_loan":           round(wc_loan),
            "wc_loan_note":      f"Working Capital Facility (Revolving): ₹{round(wc_loan):,} — not part of project cost",
            "scheme":            "PMEGP",
            "report_type":       "FULL_CMA",
            "dscr_benchmark":    1.25,
            "moratorium_months": data.assumptions.moratorium_months,
        }

    if scheme in _MUDRA_SCHEMES:
        validate_mudra(fixed_pc, scheme)
        finance = calculate_mudra_finance(fixed_pc, scheme)
        if scheme == SchemeType.Mudra_Shishu:
            report_type, dscr_bench, moratorium = "SIMPLIFIED", 1.10, 0
        elif scheme == SchemeType.Mudra_Kishor:
            report_type, dscr_bench, moratorium = "LIGHT_CMA",  1.10, 6
        else:
            report_type, dscr_bench, moratorium = "FULL_CMA",   1.25, 6
        return {
            **finance,
            "project_cost":      round(total_pc),
            "fixed_project_cost": round(fixed_pc),
            "wc_margin":         round(wc_margin),
            "wc_loan":           round(wc_loan),
            "wc_loan_note":      f"Working Capital Facility (Revolving): ₹{round(wc_loan):,} — not part of project cost",
            "scheme":            scheme.value,
            "report_type":       report_type,
            "dscr_benchmark":    dscr_bench,
            "moratorium_months": moratorium,
        }

    if scheme == SchemeType.CGTMSE:
        # CA standard: TL = 85% of fixed capital only, Promoter = 15% of fixed capital
        tl_pct   = 0.85
        loan     = round(fixed_pc * tl_pct)
        promoter = round(fixed_pc - loan)
        cgtmse   = calculate_cgtmse_fee(loan)
        return {
            "promoter_amount":     promoter,
            "promoter_pct":        round(promoter / fixed_pc * 100, 1) if fixed_pc else 0,
            "term_loan":           loan,
            "term_loan_pct":       round(tl_pct * 100, 1),
            "margin_money":        0,
            "margin_money_pct":    0,
            "cgtmse_annual_fee":   cgtmse["annual_fee"],
            "cgtmse_agf_pct":      cgtmse["agf_rate_pct"],
            "cgtmse_coverage_pct": cgtmse["coverage_pct"],
            "cgtmse_note":         cgtmse["note"],
            "project_cost":        round(total_pc),
            "fixed_project_cost":  round(fixed_pc),
            "wc_margin":           round(wc_margin),
            "wc_loan":             round(wc_loan),
            "wc_loan_note":        f"Working Capital Facility (Revolving): ₹{round(wc_loan):,} — not part of project cost",
            "scheme":              "CGTMSE",
            "report_type":         "FULL_CMA",
            "dscr_benchmark":      1.25,
            "moratorium_months":   6,
        }

    if scheme == SchemeType.MSME_PSU:
        finance = calculate_msme_finance(fixed_pc, data)
        return {
            **finance,
            "project_cost":      round(total_pc),
            "fixed_project_cost": round(fixed_pc),
            "wc_margin":         round(wc_margin),
            "wc_loan":           round(wc_loan),
            "wc_loan_note":      f"Working Capital Facility (Revolving): ₹{round(wc_loan):,} — not part of project cost",
            "scheme":            "MSME",
            "report_type":       "FULL_CMA",
            "dscr_benchmark":    1.25,
            "moratorium_months": data.assumptions.moratorium_months,
        }

    raise ValueError(f"Unsupported scheme: {scheme!r}")


def _compute_project_cost(data: CMAReportInput) -> tuple:
    """
    CA-Standard: compute fixed project cost, WC margin, and WC bank loan separately.

    Fixed Project Cost = Land + Building + (P&M × (1+contingency)) + Fixtures + Prelim
    Promoter WC Margin = WC_Required × (1 − wc_loan_pct)
    WC Bank Loan       = WC_Required × wc_loan_pct
    Total Project Cost = Fixed Project Cost + Promoter WC Margin  (caller computes this)

    Returns (fixed_project_cost, wc_margin, wc_loan)
    """
    contingency_pct = float(getattr(data.assumptions, "contingency_pct", 0) or 0) / 100
    wc_loan_pct     = float(getattr(data.assumptions, "wc_loan_pct", 60) or 60) / 100

    machinery_base = sum(
        float(m.quantity) * float(m.unit_price)
        for m in data.project.machinery_items
    ) + float(data.project.tools_installation or 0)

    pm_with_contingency = machinery_base * (1 + contingency_pct)

    fixtures = (
        float(getattr(data.project, "computers_cost",       0) or 0)
        + float(getattr(data.project, "furniture_cost",     0) or 0)
        + float(getattr(data.project, "electrification_cost", 0) or 0)
        + float(getattr(data.project, "racks_storage_cost", 0) or 0)
        + float(getattr(data.project, "transportation_cost", 0) or 0)
    )
    fixed_project_cost = (
        float(data.project.land_cost           or 0)
        + float(data.project.building_cost     or 0)
        + pm_with_contingency
        + fixtures
        + float(data.project.preliminary_expenses or 0)
    )

    wc_total  = _estimate_initial_wc(data)
    wc_margin = wc_total * (1 - wc_loan_pct)   # promoter's WC contribution
    wc_loan   = wc_total * wc_loan_pct          # bank's revolving WC facility

    return fixed_project_cost, wc_margin, wc_loan


def _estimate_initial_wc(data: CMAReportInput) -> float:
    """Estimate Year-1 WC requirement using 1.5 months of 50%-capacity revenue."""
    from core.engine import annual_revenue_from_prod
    annual_rev = annual_revenue_from_prod(data.production)
    if annual_rev <= 0:
        return 0.0
    cap_y1 = float(getattr(data.assumptions, "capacity_y1_pct", 50) or 50) / 100
    return annual_rev * cap_y1 / 12 * 1.5
