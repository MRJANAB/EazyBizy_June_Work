from typing import Dict, Any
from .intake_mapper import CMAIntake
from .operating_statement import calculate_operating_statement
from .balance_sheet import calculate_balance_sheet
from .ratios import calculate_ratios
from .cashflow import calculate_cashflow
from .mpbf import calculate_mpbf

def generate_cma_report(intake_data: Dict[str, Any]) -> Dict[str, Any]:
    # 1. Map input to Pydantic model for validation
    intake = CMAIntake(**intake_data)
    
    # 2. Run calculations
    operating_statement = calculate_operating_statement(intake)
    balance_sheet = calculate_balance_sheet(intake, operating_statement)
    ratios = calculate_ratios(intake, operating_statement, balance_sheet)
    cash_flow = calculate_cashflow(intake, operating_statement, balance_sheet)
    
    # MPBF Assessment (using Year 1 projections)
    y1_bs = balance_sheet[0]
    mpbf = calculate_mpbf(
        current_assets=y1_bs['assets']['current_assets']['total'],
        other_current_liabilities=y1_bs['liabilities']['creditors']
    )
    
    # 3. Build final report structure
    report = {
        "metadata": {
            "applicant": intake.applicant.model_dump(),
            "business": intake.business.model_dump(),
            "loan": intake.loan.model_dump()
        },
        "operating_statement": operating_statement,
        "balance_sheet": balance_sheet,
        "cash_flow": cash_flow,
        "ratios": ratios,
        "mpbf": mpbf,
        "summary": {
            "total_project_cost": intake.project_cost.total_cost,
            "means_of_finance": intake.means_of_finance.total_finance,
            "avg_dscr": round(sum(r['dscr'] for r in ratios) / len(ratios), 2) if ratios else 0,
            "max_debt_equity": max(r['debt_equity'] for r in ratios) if ratios else 0
        }
    }
    
    return report
