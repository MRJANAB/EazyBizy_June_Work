from typing import Dict, Any
from .intake_mapper import CMAIntake
from .operating_statement import calculate_operating_statement
from .balance_sheet import calculate_balance_sheet
from .depreciation import calculate_depreciation_by_class
from .ratios import calculate_ratios, calculate_ratios_extended
from .cashflow import calculate_cashflow
from .mpbf import calculate_mpbf, calculate_mpbf_by_year
from .fund_flow import calculate_fund_flow
from .breakeven import calculate_breakeven
from .sensitivity import calculate_sensitivity
from .historical import (
    build_historical_statement,
    historical_sales_trend,
    projection_continuity,
)

def generate_cma_report(intake_data: Dict[str, Any]) -> Dict[str, Any]:
    # 1. Map input to Pydantic model for validation
    intake = CMAIntake(**intake_data)
    
    # 2. Run calculations
    operating_statement = calculate_operating_statement(intake)
    balance_sheet = calculate_balance_sheet(intake, operating_statement)
    ratios = calculate_ratios(intake, operating_statement, balance_sheet)
    cash_flow = calculate_cashflow(intake, operating_statement, balance_sheet)
    
    # MPBF Assessment — per year, on chargeable current assets (excludes surplus
    # cash), compared against the WC limit sought.
    wc_loan_sought = intake.means_of_finance.working_capital_loan
    mpbf_by_year = calculate_mpbf_by_year(balance_sheet, wc_loan_sought)
    # Headline MPBF = Year 1 (kept on the chargeable-CA basis for consistency).
    y1_bs = balance_sheet[0]
    mpbf = calculate_mpbf(
        current_assets=y1_bs.get('wc_chargeable_ca', y1_bs['assets']['current_assets']['total']),
        other_current_liabilities=y1_bs['liabilities']['creditors']
    )

    # Audited historicals (existing business) — presented as CMA Form II actuals,
    # plus a sanity check that projections continue plausibly from the last year.
    historical_statement = build_historical_statement(intake)
    operating_statement_full = historical_statement + [
        {**row, "period_type": "Projected"} for row in operating_statement
    ]
    continuity = projection_continuity(historical_statement, operating_statement)

    # 3. Build final report structure
    report = {
        "metadata": {
            "applicant": intake.applicant.model_dump(),
            "business": intake.business.model_dump(),
            "loan": intake.loan.model_dump()
        },
        "operating_statement": operating_statement,
        "depreciation_chart": calculate_depreciation_by_class(intake),
        "historical_operating_statement": historical_statement,
        "operating_statement_full": operating_statement_full,
        "projection_continuity": continuity,
        "balance_sheet": balance_sheet,
        "cash_flow": cash_flow,
        "fund_flow": calculate_fund_flow(intake, operating_statement, balance_sheet),
        "ratios": ratios,
        "ratios_extended": calculate_ratios_extended(intake, operating_statement, balance_sheet),
        "breakeven": calculate_breakeven(operating_statement),
        "sensitivity": calculate_sensitivity(intake, operating_statement),
        "mpbf": mpbf,
        "mpbf_by_year": mpbf_by_year,
        "summary": {
            "total_project_cost": intake.project_cost.total_cost,
            "means_of_finance": intake.means_of_finance.total_finance,
            "avg_dscr": round(sum(r['dscr'] for r in ratios) / len(ratios), 2) if ratios else 0,
            "max_debt_equity": max(r['debt_equity'] for r in ratios) if ratios else 0,
            "is_existing_business": len(historical_statement) > 0,
            "historical_sales_trend_pct": historical_sales_trend(historical_statement),
        }
    }

    return report
