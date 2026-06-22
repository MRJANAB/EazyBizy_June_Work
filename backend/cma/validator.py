from typing import List, Dict, Any
from .intake_mapper import CMAIntake


def validate_cma_intake(intake: CMAIntake) -> List[str]:
    errors = []

    cost    = intake.project_cost.total_cost
    # BUG 4 FIX: Compare MoF WITHOUT WC loan (WC loan is a separate revolving facility)
    finance = intake.means_of_finance.total_finance
    wc_loan = intake.means_of_finance.working_capital_loan

    # V1: MoF total (excl. WC loan) must equal ProjectCost
    if abs(cost - finance) > 10.0:
        errors.append(
            f"Means of Finance (₹{finance:,.0f}) must equal Project Cost (₹{cost:,.0f}). "
            f"Note: WC Loan (₹{wc_loan:,.0f}) is a separate revolving facility and must NOT be in MoF total."
        )

    # V3: WC loan must NOT be accidentally included in MoF total
    if wc_loan > 0 and abs(cost - finance - wc_loan) < 1:
        errors.append(
            f"V3: WC Loan (₹{wc_loan:,.0f}) appears to be included in MoF. "
            "Remove it from MoF — it is a separate Working Capital facility."
        )

    # V4: Promoter contribution cannot be negative
    if intake.means_of_finance.promoter_contribution < 0:
        errors.append(f"V11: Promoter contribution cannot be negative (₹{intake.means_of_finance.promoter_contribution:,.0f}).")

    # Promoter Contribution min 5% (PSU norm)
    if cost > 0:
        promoter_pct = (intake.means_of_finance.promoter_contribution / cost) * 100
        if promoter_pct < 5:
            errors.append(f"Promoter contribution ({promoter_pct:.1f}%) is below 5% minimum for most schemes.")

    # Loan Amount vs Total Cost (term loan only, not WC)
    if intake.means_of_finance.term_loan > cost:
        errors.append(f"V4: Term Loan (₹{intake.means_of_finance.term_loan:,.0f}) cannot exceed Project Cost (₹{cost:,.0f}).")

    return errors
