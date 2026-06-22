"""
calculations/loan_schedule.py — Term Loan amortisation (CA standard)

BUG 7 FIX: Use half-yearly reducing balance schedule:
  HalfYearlyInstalment = TermLoan / (tenure_years × 2)
  Interest_H1_YearN    = OpeningBalance_YearN × (interestRate / 2)
  MidYearBalance_YearN = OpeningBalance_YearN − HalfYearlyInstalment
  Interest_H2_YearN    = MidYearBalance_YearN × (interestRate / 2)
  TotalInterest_YearN  = H1 + H2
  PrincipalRepaid_YearN = HalfYearlyInstalment × 2
  ClosingBalance_YearN = OpeningBalance_YearN − PrincipalRepaid_YearN
"""
import math
from core.engine import R

_ZERO_YEAR = lambda y: {
    "year": y, "opening_balance": 0.0, "emi_paid": 0.0,
    "interest_paid": 0.0, "principal_paid": 0.0, "closing_balance": 0.0,
    "half_yearly_instalment": 0.0,
}


def calculate_loan_schedule(data, scheme_data: dict) -> list:
    """
    Build a 5-year term loan repayment schedule (half-yearly reducing balance).
    Always returns exactly 5 rows.
    """
    term_loan        = float(scheme_data.get("term_loan", 0) or 0)
    rate_pct         = float(getattr(data.assumptions, "interest_rate_pct", 10.5) or 10.5)
    tenure_mo        = int(getattr(data.assumptions, "tenure_months", 60) or 60)
    moratorium_mo    = int(getattr(data.assumptions, "moratorium_months", 0) or 0)

    if term_loan <= 0 or tenure_mo <= 0:
        return [_ZERO_YEAR(y) for y in range(1, 6)]

    annual_rate      = rate_pct / 100
    tenure_years     = math.ceil(tenure_mo / 12)
    moratorium_years = math.ceil(moratorium_mo / 12)
    repay_years      = max(tenure_years - moratorium_years, 1)

    # BUG 7 FIX: Half-yearly instalment on principal
    half_inst = R(term_loan / (repay_years * 2), 2)

    rows    = []
    balance = term_loan

    for yr in range(1, tenure_years + 1):
        opening = R(balance, 2)

        if yr <= moratorium_years:
            # Moratorium: interest only, no principal repayment
            ih1     = R(opening * annual_rate / 2, 2)
            ih2     = R(opening * annual_rate / 2, 2)
            repaid  = 0.0
            closing = opening
        else:
            ih1     = R(opening * annual_rate / 2, 2)
            mid     = R(max(opening - half_inst, 0), 2)
            ih2     = R(mid * annual_rate / 2, 2)
            repaid  = R(half_inst * 2, 2)
            closing = R(max(opening - repaid, 0), 2)

        total_int = R(ih1 + ih2, 2)
        emi_paid  = R(repaid + total_int, 2)

        rows.append({
            "year":                   yr,
            "opening_balance":        opening,
            "emi_paid":               emi_paid,
            "interest_paid":          total_int,
            "principal_paid":         repaid,
            "closing_balance":        closing,
            "half_yearly_instalment": half_inst,
        })
        balance = closing

    # Pad to minimum 5 rows so income statement (5-year projection) always has data
    while len(rows) < 5:
        rows.append(_ZERO_YEAR(len(rows) + 1))
    # Return all rows (not capped to 5) — Section H displays the full schedule
    return rows
