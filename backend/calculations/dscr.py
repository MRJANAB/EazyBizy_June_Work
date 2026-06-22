"""calculations/dscr.py — DSCR from income statement + loan schedule.

BUG 8 FIX:
  DSCR_Numerator   = CashAccruals_YearN + TL_Interest_YearN  (NOT WC interest)
  DSCR_Denominator = TL_Repayment_YearN + TL_Interest_YearN
  DSCR_YearN       = Numerator / Denominator
  Average_DSCR     = mean of all 5 years

  If ANY year DSCR < 1.25 → reportStatus = "REJECT"
  If ALL years DSCR >= 1.25 → reportStatus = "APPROVE"
"""
from core.engine import R, dscr_label


def calculate_dscr(income: list, loan_schedule: list, scheme_data: dict) -> dict:
    """
    Compute DSCR for each year and the 5-year average.
    Uses only TL interest (not WC interest) per CA/RBI standards.
    """
    benchmark = float(scheme_data.get("dscr_benchmark", 1.25))
    rows      = []
    dscr_sum  = 0.0
    dscr_count = 0

    for i, yr in enumerate(income):
        cash_ac   = float(yr.get("cash_accruals", 0) or 0)   # PAT + Dep
        # BUG 8 FIX: Use TL interest ONLY (not combined interest)
        tl_int    = float(yr.get("tl_interest", yr.get("interest", 0)) or 0)
        total_a   = R(cash_ac + tl_int, 2)

        principal = float(loan_schedule[i]["principal_paid"])
        total_b   = R(principal + tl_int, 2)
        dv        = R(total_a / total_b, 2) if total_b else 0.0

        if total_b > 0:
            dscr_sum   += dv
            dscr_count += 1

        rows.append({
            "year":          yr["year"],
            "cash_accruals": cash_ac,
            "tl_interest":   tl_int,
            "total_a":       total_a,
            "principal":     principal,
            "total_b":       total_b,
            "dscr":          dv,
            "label":         dscr_label(dv),
        })

    average  = R(dscr_sum / dscr_count, 2) if dscr_count else 0.0
    min_dscr = min((r["dscr"] for r in rows), default=0.0)

    # BUG 8 FIX: REJECT if ANY year DSCR < 1.25; APPROVE if all years >= 1.25
    any_below = any(r["dscr"] < 1.25 and r["total_b"] > 0 for r in rows)
    report_status = "REJECT" if any_below else "APPROVE"

    return {
        "years":           rows,
        "average":         average,
        "min_dscr":        min_dscr,
        "dscr_label":      dscr_label(average),
        "dscr_y1":         rows[0]["dscr"] if rows else 0.0,
        "avg_dscr_5yr":    average,
        "benchmark":       benchmark,
        "meets_benchmark": average >= benchmark,
        "report_status":   report_status,
    }
