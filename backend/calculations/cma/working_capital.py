from typing import Dict

def calculate_mpbf(
    total_current_assets: float,
    other_current_liabilities: float,
    borrower_margin_pct: float = 25.0
) -> Dict:
    """
    Classic MPBF Method II (used by most Indian banks)
    """
    working_capital_gap = total_current_assets - other_current_liabilities
    
    # Borrower must contribute 25% of Total Current Assets as NWC
    minimum_borrower_contribution = total_current_assets * (borrower_margin_pct / 100)
    
    mpbf = working_capital_gap - minimum_borrower_contribution
    
    return {
        "total_current_assets": round(total_current_assets, 2),
        "other_current_liabilities": round(other_current_liabilities, 2),
        "working_capital_gap": round(working_capital_gap, 2),
        "min_borrower_contribution": round(minimum_borrower_contribution, 2),
        "mpbf": round(max(0, mpbf), 2)
    }
