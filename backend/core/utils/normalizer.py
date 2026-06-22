from typing import Dict
from models.cma_schema import CMAPayload

def normalize_cma_payload(payload: CMAPayload) -> Dict:
    """
    Converts raw UI payload into processed inputs for the calculation engines.
    """
    total_asset_cost = sum(item.cost for item in payload.asset_register)
    
    # Calculate weighted average depreciation if needed, 
    # but for now we'll use a simplified aggregate
    avg_dep_pct = 15.0 # default
    annual_depreciation = total_asset_cost * (avg_dep_pct / 100)
    
    # Initial capital = promoter contribution from loan structure
    initial_capital = payload.loan_structure.promoter_contribution
    
    # Starting sales (normalized to annual)
    # If historical data exists, use the last year's sales
    if payload.historical_financials:
        base_sales = payload.historical_financials[-1].sales
    else:
        # Fallback to a placeholder or derived value
        base_sales = payload.loan_structure.term_loan_amount * 1.5 

    return {
        "base_sales": base_sales,
        "asset_total": total_asset_cost,
        "annual_depreciation": annual_depreciation,
        "initial_capital": initial_capital,
        "loan_structure": payload.loan_structure.dict(),
        "wc_norms": payload.working_capital_norms.dict(),
        "assumptions": payload.assumptions.dict()
    }
