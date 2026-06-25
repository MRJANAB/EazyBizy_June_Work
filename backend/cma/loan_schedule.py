"""
cma/loan_schedule.py
====================
Single source of truth for all loan figures used across the CMA engine.

Builds a month-by-month term-loan amortisation (so a moratorium expressed in
months is handled exactly) and aggregates it to financial years. Also computes
the revolving working-capital interest.

Banking conventions applied here:
  - Term loan principal  : taken from Means of Finance (the *funded* amount),
                           NOT loan.amount, so every module agrees.
  - Repayment method     : equal principal instalments over the repayment
                           period (tenure - moratorium). Interest is charged on
                           the *reducing* opening balance each month.
  - Moratorium           : no principal during moratorium; interest still
                           accrues and is shown (serviced) in those months.
  - Working capital loan : revolving facility, treated as outstanding for the
                           full year; interest = outstanding x rate.
"""

from typing import List, Dict, Any
from .intake_mapper import CMAIntake


def calculate_loan_schedule(intake: CMAIntake, years: int = 5) -> List[Dict[str, Any]]:
    """Return a per-year amortisation summary for `years` projected years."""

    # ── Authoritative loan figures ────────────────────────────────────────────
    # Means of Finance term loan is the funded amount. Fall back to loan.amount
    # only if MoF term loan is not provided.
    term_loan = intake.means_of_finance.term_loan or intake.loan.amount or 0.0
    wc_loan   = intake.means_of_finance.working_capital_loan or 0.0

    annual_rate = (intake.loan.interest_rate or 0.0) / 100.0
    monthly_rate = annual_rate / 12.0

    tenure_months     = max(int(intake.loan.tenure_months or 0), 0)
    moratorium_months = max(int(intake.loan.moratorium_months or 0), 0)
    # Moratorium cannot exceed (or equal) the full tenure.
    if moratorium_months >= tenure_months and tenure_months > 0:
        moratorium_months = tenure_months - 1

    repayment_months = max(tenure_months - moratorium_months, 1)
    monthly_principal = term_loan / repayment_months if term_loan > 0 else 0.0

    # ── Month-by-month amortisation ───────────────────────────────────────────
    balance = term_loan
    months_total = years * 12
    monthly_rows = []
    for m in range(1, months_total + 1):
        opening = balance
        interest = opening * monthly_rate

        if m <= moratorium_months:
            principal = 0.0                      # no principal during moratorium
        elif m <= tenure_months:
            principal = min(monthly_principal, opening)   # never overpay
        else:
            principal = 0.0                      # loan already closed

        balance = max(opening - principal, 0.0)
        monthly_rows.append({
            "opening": opening,
            "principal": principal,
            "interest": interest,
            "closing": balance,
        })

    # ── Aggregate to financial years ──────────────────────────────────────────
    schedule = []
    wc_interest_annual = wc_loan * annual_rate
    for y in range(years):
        chunk = monthly_rows[y * 12:(y + 1) * 12]
        tl_interest  = sum(r["interest"]  for r in chunk)
        tl_principal = sum(r["principal"] for r in chunk)
        tl_opening   = chunk[0]["opening"]  if chunk else 0.0
        tl_closing   = chunk[-1]["closing"] if chunk else 0.0

        schedule.append({
            "year":          y + 1,
            "tl_opening":    round(tl_opening, 2),
            "tl_principal":  round(tl_principal, 2),
            "tl_interest":   round(tl_interest, 2),
            "tl_closing":    round(tl_closing, 2),
            "wc_outstanding": round(wc_loan, 2),
            "wc_interest":   round(wc_interest_annual, 2),
            "total_interest": round(tl_interest + wc_interest_annual, 2),
        })

    return schedule
