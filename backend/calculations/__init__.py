"""
calculations package
====================
Re-exports everything from calc_core so existing code continues to work:
    from calculations import run_dpr, run_cma, R, ...
Individual sub-modules expose the new structured-model API:
    from calculations.depreciation import calculate_depreciation
"""
from core.engine import (
    R, R100, R1000, pct_fraction,
    calc_emi, calc_amortization, yearly_amortization,
    calc_term_loan_schedule,
    dscr_label, credit_rating, recommendation, risk_level, net_risk,
    score_dscr, score_roi, score_breakeven, annual_revenue_from_prod,
    SCHEME_BENCHMARKS, get_scheme_benchmarks,
    INDUSTRY_DEFAULTS, get_industry_defaults,
    FIELD_UNITS, get_field_unit,
    _project_cost_amount, _project_cost_amount_by_terms,
    _depreciable_assets_from_project_cost, _tally_projected_balance_sheet,
    validate_reconciliation, validate_manpower,
    calculate_scorecard as _scorecard_legacy,
    calculate_risk_matrix,
    run_dpr, run_cma,
)

__all__ = [
    "R", "R100", "R1000", "pct_fraction",
    "calc_emi", "calc_amortization", "yearly_amortization",
    "calc_term_loan_schedule",
    "dscr_label", "credit_rating", "recommendation", "risk_level", "net_risk",
    "_tally_projected_balance_sheet",
    "validate_reconciliation", "validate_manpower",
    "_scorecard_legacy", "calculate_risk_matrix",
    "run_dpr", "run_cma",
]
