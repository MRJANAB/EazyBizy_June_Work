"""
MSME Finance Calculator
=======================
Standard MSME / PSU-bank finance split with no central subsidy.

CA-Standard Rules
-----------------
- Term Loan    : term_loan_pct % of FIXED capital only (default 75 %)
- Promoter     : remaining fixed capital (= fixed_project_cost − term_loan)
- WC Loan      : wc_loan_pct % of working capital requirement (revolving, separate)
- No margin money / government subsidy

Exports
-------
calculate_msme_finance(fixed_project_cost, data) -> dict
"""

from __future__ import annotations


def calculate_msme_finance(fixed_project_cost: float, data) -> dict:
    """
    Calculate standard MSME financing split.

    Parameters
    ----------
    fixed_project_cost : Fixed capital only (land + building + P&M + fixtures + prelim).
                         WC margin is NOT included here — it is handled separately.
    data               : CMAReportInput — used for assumption overrides
                         (term_loan_pct, wc_loan_pct, interest_rate_pct).

    Returns
    -------
    dict with promoter_amount, term_loan, margin_money (0), and metadata.
    """
    a        = getattr(data, "assumptions", None)
    tl_pct   = float(getattr(a, "term_loan_pct", 75) or 75) / 100
    wc_pct   = float(getattr(a, "wc_loan_pct",   60) or 60) / 100
    int_rate = float(getattr(a, "interest_rate_pct", 10.5) or 10.5)
    sub_pct  = float(getattr(a, "capital_subsidy_pct", 0) or 0) / 100

    # Capital-investment subsidy on FIXED ASSETS only (land + building + P&M),
    # excluding preliminary / pre-operative / contingency / fixtures.
    p = getattr(data, "project", None)
    machinery = sum(float(m.quantity) * float(m.unit_price) for m in getattr(p, "machinery_items", []) or []) \
        + float(getattr(p, "tools_installation", 0) or 0)
    fixed_assets = float(getattr(p, "land_cost", 0) or 0) + float(getattr(p, "building_cost", 0) or 0) + machinery
    subsidy = round(fixed_assets * sub_pct)

    # Subsidy is a source of finance → reduces the amount to be split by debt:equity.
    # Term loan on the fixed side only (WC margin stays promoter-funded).
    net             = max(fixed_project_cost - subsidy, 0)
    term_loan       = round(net * tl_pct)
    promoter_amount = round(fixed_project_cost - subsidy - term_loan)

    # Promoter minimum: 10% of fixed project cost. If breached, top up promoter,
    # reduce term loan (keeps promoter + subsidy + term loan = fixed_project_cost).
    floor = round(fixed_project_cost * 0.10)
    if promoter_amount < floor:
        promoter_amount = floor
        term_loan       = round(fixed_project_cost - subsidy - promoter_amount)

    return {
        "promoter_amount":  promoter_amount,
        "promoter_pct":     round(promoter_amount / fixed_project_cost * 100, 1) if fixed_project_cost else 0,
        "term_loan":        term_loan,
        "term_loan_pct":    round(term_loan / fixed_project_cost * 100, 1) if fixed_project_cost else 0,
        "margin_money":     subsidy,
        "margin_money_pct": round(subsidy / fixed_project_cost * 100, 1) if fixed_project_cost else 0,
        "wc_loan_pct":      round(wc_pct * 100, 1),
        "interest_rate_pct": int_rate,
        "note": (
            f"Standard MSME bank finance with {round(sub_pct*100,1)}% state capital subsidy on fixed assets."
            if subsidy else
            "Standard MSME bank finance — no central subsidy."
        ),
    }
