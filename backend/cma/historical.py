"""
cma/historical.py
=================
Brings AUDITED historical financials into the CMA.

For an existing business a banker expects the CMA Operating Statement to show
the audited past years (Actuals) alongside the projected years, and to sanity
check that the projected Year-1 plausibly continues from the last actual year
(a large unexplained jump is a classic red flag).

This module is purely additive: it normalises intake.historical_financials into
the same row schema as the projected operating statement, derives the actual
sales trend, and runs a projection-continuity check. It does NOT alter the
projection maths.
"""

from typing import List, Dict, Any, Optional
from .intake_mapper import CMAIntake


def build_historical_statement(intake: CMAIntake) -> List[Dict[str, Any]]:
    """Normalise audited historicals into operating-statement rows (period_type=Actual)."""
    rows = []
    for h in intake.historical_financials:
        cogs = h.sales - h.gross_profit
        other_opex = h.rent + h.utilities + h.admin_expenses + h.marketing
        ebitda = h.gross_profit - h.salary - other_opex
        pbt = ebitda - h.depreciation - h.interest
        rows.append({
            "year":            h.year,
            "period_type":     "Actual",
            "revenue":         round(h.sales, 2),
            "cogs":            round(cogs, 2),
            "gross_profit":    round(h.gross_profit, 2),
            "gross_margin_pct": round((h.gross_profit / h.sales * 100) if h.sales else 0, 2),
            "salary":          round(h.salary, 2),
            "other_opex":      round(other_opex, 2),
            "ebitda":          round(ebitda, 2),
            "depreciation":    round(h.depreciation, 2),
            "interest":        round(h.interest, 2),
            "pbt":             round(pbt, 2),
            "tax":             round(h.tax, 2),
            "pat":             round(h.pat, 2),
            "cash_accruals":   round(h.pat + h.depreciation, 2),
            # Carried actuals for the analyst (balance-sheet side)
            "cash":            round(h.cash, 2),
            "debtors":         round(h.debtors, 2),
            "creditors":       round(h.creditors, 2),
            "stock":           round(h.stock, 2),
            "term_loan_outstanding": round(h.term_loan_outstanding, 2),
            "wc_outstanding":  round(h.wc_outstanding, 2),
            "net_worth":       round(h.net_worth, 2),
        })
    return rows


def historical_sales_trend(historical_rows: List[Dict[str, Any]]) -> Optional[float]:
    """Average year-on-year actual sales growth % across the audited years."""
    if len(historical_rows) < 2:
        return None
    growths = []
    for i in range(1, len(historical_rows)):
        prev = historical_rows[i - 1]["revenue"]
        curr = historical_rows[i]["revenue"]
        if prev > 0:
            growths.append((curr - prev) / prev)
    return round(sum(growths) / len(growths) * 100, 2) if growths else None


def projection_continuity(historical_rows: List[Dict[str, Any]],
                          projected_rows: List[Dict[str, Any]],
                          jump_threshold_pct: float = 50.0) -> Dict[str, Any]:
    """
    Compare projected Year-1 revenue to the last audited year.

    Flags an implausible jump (banker red flag) when projected Year-1 exceeds the
    last actual by more than `jump_threshold_pct`, or actually contracts sharply.
    """
    if not historical_rows or not projected_rows:
        return {"applicable": False, "note": "New business - no audited history to compare."}

    last_actual = historical_rows[-1]["revenue"]
    proj_y1 = projected_rows[0]["revenue"]
    if last_actual <= 0:
        return {"applicable": False, "note": "Last actual revenue is zero — cannot compare."}

    jump_pct = round((proj_y1 - last_actual) / last_actual * 100, 2)
    implausible = jump_pct > jump_threshold_pct or jump_pct < -25.0
    return {
        "applicable": True,
        "last_actual_revenue": round(last_actual, 2),
        "projected_y1_revenue": round(proj_y1, 2),
        "jump_pct": jump_pct,
        "implausible": implausible,
        "note": (
            f"Projected Year-1 revenue is {jump_pct:+.1f}% vs the last audited year. "
            + ("This jump is large and should be justified to the bank."
               if implausible else "This is a reasonable continuation of the actual trend.")
        ),
    }
