"""
CGTMSE Fee Calculator — per PDF §4.2 (2025-26 guidelines)

Annual Guarantee Fee (AGF) slabs:
  Up to Rs. 10 Lakh   : 0.75% p.a.
  Rs. 10L – Rs. 1 Cr  : 1.00% p.a.
  Rs. 1 Cr – Rs. 5 Cr : 1.35% p.a.

Coverage %:
  75% — General borrowers
  80% — Women / NER residents / ZED certified
  85% — Special cases (as per CGTMSE trustee approval)
"""

_AGF_SLABS = [
    (1_000_000,   0.75),   # Up to Rs. 10L
    (10_000_000,  1.00),   # Rs. 10L – Rs. 1 Crore
    (50_000_000,  1.35),   # Rs. 1 Cr – Rs. 5 Crore
]
_AGF_DEFAULT = 1.50        # above Rs. 5 Crore (outside standard CGTMSE, safe fallback)

_COVERAGE = {
    "general":    75,
    "women":      80,
    "ner":        80,
    "zed":        80,
    "special":    85,
}


def _agf_rate(loan_amount: float) -> float:
    for limit, rate in _AGF_SLABS:
        if loan_amount <= limit:
            return rate
    return _AGF_DEFAULT


def _coverage_pct(social_category: str) -> int:
    cat = str(social_category).strip().lower()
    if "women" in cat or cat == "women":
        return _COVERAGE["women"]
    if cat in ("special", "sc", "st"):
        return _COVERAGE["special"]
    return _COVERAGE["general"]


def calculate_cgtmse_fee(loan_amount: float, social_category: str = "General") -> dict:
    """
    Calculate CGTMSE Annual Guarantee Fee (AGF) for a given loan.

    Parameters
    ----------
    loan_amount      : Sanctioned bank loan (term loan + WC).
    social_category  : Borrower category — affects coverage percentage.

    Returns
    -------
    dict with agf_rate_pct, annual_fee, five_year_fee, coverage_pct and note.
    The annual_fee MUST be added to annual operating expenses in the CMA.
    """
    agf_pct      = _agf_rate(loan_amount)
    annual_fee   = round(loan_amount * agf_pct / 100)
    five_year    = round(annual_fee * 5)
    coverage     = _coverage_pct(social_category)

    return {
        "loan_amount":    round(loan_amount),
        "agf_rate_pct":   agf_pct,
        "annual_fee":     annual_fee,
        "upfront_fee":    annual_fee,       # first-year fee paid upfront
        "five_year_fee":  five_year,
        "coverage_pct":   coverage,
        "note": (
            f"CGTMSE Annual Guarantee Fee: {agf_pct}% p.a. on outstanding loan. "
            f"Coverage: {coverage}% of loan amount. "
            "Add annual_fee to Section O operating expenses in CMA."
        ),
    }
