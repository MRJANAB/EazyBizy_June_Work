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
    tl_pct   = float(getattr(getattr(data, "assumptions", None), "term_loan_pct", 75) or 75) / 100
    wc_pct   = float(getattr(getattr(data, "assumptions", None), "wc_loan_pct",   60) or 60) / 100
    int_rate = float(getattr(getattr(data, "assumptions", None), "interest_rate_pct", 10.5) or 10.5)

    term_loan       = round(fixed_project_cost * tl_pct)
    promoter_amount = round(fixed_project_cost - term_loan)

    return {
        "promoter_amount":  promoter_amount,
        "promoter_pct":     round(promoter_amount / fixed_project_cost * 100, 1) if fixed_project_cost else 0,
        "term_loan":        term_loan,
        "term_loan_pct":    round(tl_pct * 100, 1),
        "margin_money":     0,
        "margin_money_pct": 0,
        "wc_loan_pct":      round(wc_pct * 100, 1),
        "interest_rate_pct": int_rate,
        "note": (
            "Standard MSME bank finance — no central subsidy. "
            "State-level subsidies (if applicable) to be applied separately."
        ),
    }
