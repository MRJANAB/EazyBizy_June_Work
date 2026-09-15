"""calculations/dscr.py — DSCR from income statement + loan schedule.

BUG 8 FIX:
  DSCR_Numerator   = CashAccruals_YearN + TL_Interest_YearN  (NOT WC interest)
  DSCR_Denominator = TL_Repayment_YearN + TL_Interest_YearN
  DSCR_YearN       = Numerator / Denominator
  Average_DSCR     = mean of all 5 years

  If ANY year DSCR < the scheme's own benchmark (Rules & Rates engine,
  e.g. 1.10 for Mudra Shishu/Kishor, 1.25 for most other schemes) →
  reportStatus = "REJECT". If ALL years clear it → "APPROVE".
"""
from core.engine import R, dscr_label
from rules import get_default_engine


def term_loan_dscr(cash_accruals: float, tl_interest: float, tl_principal: float) -> tuple:
    """The single CA-standard Term Loan DSCR formula:
        Total A = Cash Accruals + TL Interest
        Total B = TL Principal + TL Interest
        DSCR    = Total A / Total B
    Used by BOTH the main DSCR schedule (below) and sensitivity analysis
    (calculations/sensitivity.py), so the two can never diverge into
    different formulas.
    Returns (total_a, total_b, dscr).
    """
    total_a = R(float(cash_accruals) + float(tl_interest), 2)
    total_b = R(float(tl_principal) + float(tl_interest), 2)
    dscr = R(total_a / total_b, 2) if total_b else 0.0
    return total_a, total_b, dscr


def calculate_dscr(income: list, loan_schedule: list, scheme_data: dict,
                    existing_monthly_emi: float = 0.0) -> dict:
    """
    Compute DSCR for each year and the 5-year average.
    Uses only TL interest (not WC interest) per CA/RBI standards.

    CA AUDIT: the primary DSCR above is scoped ONLY to the new term loan
    being appraised — it says nothing about a borrower's PRE-EXISTING EMI
    obligations (an existing business loan and/or the promoter's personal
    home loan), which draw on the exact same cash accruals. When
    `existing_monthly_emi` (combined business + personal EMI) is > 0, also
    compute an "Adjusted DSCR" using the SAME term_loan_dscr() formula but
    with that annual EMI subtracted from cash accruals first — giving a
    genuine debt-service view after ALL obligations, not just the new loan.
    """
    default_benchmark = get_default_engine().get_dscr_benchmark("default")
    benchmark = float(scheme_data.get("dscr_benchmark") or default_benchmark)
    existing_annual_emi = R(float(existing_monthly_emi or 0) * 12, 2)
    rows      = []
    dscr_sum  = 0.0
    dscr_count = 0
    adj_dscr_sum   = 0.0
    adj_dscr_count = 0

    for i, yr in enumerate(income):
        cash_ac   = float(yr.get("cash_accruals", 0) or 0)   # PAT + Dep
        # BUG 8 FIX: Use TL interest ONLY (not combined interest)
        tl_int    = float(yr.get("tl_interest", yr.get("interest", 0)) or 0)
        principal = float(loan_schedule[i]["principal_paid"])
        total_a, total_b, dv = term_loan_dscr(cash_ac, tl_int, principal)

        if total_b > 0:
            dscr_sum   += dv
            dscr_count += 1

        adj_cash_ac = R(max(cash_ac - existing_annual_emi, 0), 2)
        adj_total_a, _, adj_dv = term_loan_dscr(adj_cash_ac, tl_int, principal)
        if total_b > 0:
            adj_dscr_sum   += adj_dv
            adj_dscr_count += 1

        rows.append({
            "year":                 yr["year"],
            "cash_accruals":        cash_ac,
            "tl_interest":          tl_int,
            "total_a":              total_a,
            "principal":            principal,
            "total_b":              total_b,
            "dscr":                 dv,
            "label":                dscr_label(dv),
            "existing_emi_annual":  existing_annual_emi,
            "adjusted_cash_accruals": adj_cash_ac,
            "adjusted_total_a":     adj_total_a,
            "adjusted_dscr":        adj_dv,
            "adjusted_label":       dscr_label(adj_dv),
        })

    average  = R(dscr_sum / dscr_count, 2) if dscr_count else 0.0
    min_dscr = min((r["dscr"] for r in rows), default=0.0)
    average_adjusted_dscr = R(adj_dscr_sum / adj_dscr_count, 2) if adj_dscr_count else average
    min_adjusted_dscr     = min((r["adjusted_dscr"] for r in rows), default=0.0)

    # BUG 8 FIX: REJECT if ANY year DSCR < scheme's own benchmark; APPROVE if all years pass.
    # (Previously hardcoded 1.25 here regardless of scheme, which could contradict
    # `meets_benchmark` below for schemes with a lower benchmark, e.g. Mudra Shishu/Kishor's 1.10.)
    any_below = any(r["dscr"] < benchmark and r["total_b"] > 0 for r in rows)
    report_status = "REJECT" if any_below else "APPROVE"

    return {
        "years":                  rows,
        "average":                average,
        "min_dscr":               min_dscr,
        "dscr_label":             dscr_label(average),
        "dscr_y1":                rows[0]["dscr"] if rows else 0.0,
        "avg_dscr_5yr":           average,
        "benchmark":              benchmark,
        "meets_benchmark":        average >= benchmark,
        "report_status":          report_status,
        "existing_annual_emi":    existing_annual_emi,
        "average_adjusted_dscr":  average_adjusted_dscr,
        "min_adjusted_dscr":      min_adjusted_dscr,
        "adjusted_dscr_label":    dscr_label(average_adjusted_dscr),
        "has_existing_emi":       existing_annual_emi > 0,
    }
