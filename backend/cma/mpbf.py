from typing import Dict, Any

def calculate_mpbf(current_assets: float, other_current_liabilities: float) -> Dict[str, float]:
    """
    Calculate Maximum Permissible Bank Finance (MPBF) using Tandon Committee Method II.
    Working Capital Gap = Current Assets - Other Current Liabilities (excluding bank finance)
    MPBF = 0.75 * Current Assets - Other Current Liabilities
    """
    wc_gap = current_assets - other_current_liabilities
    
    # Method 1: 75% of (CA - OCL)
    method1 = 0.75 * wc_gap
    
    # Method 2: (75% of CA) - OCL
    method2 = (0.75 * current_assets) - other_current_liabilities
    
    return {
        "wc_gap": round(wc_gap, 2),
        "method1": round(max(0, method1), 2),
        "method2": round(max(0, method2), 2),
        "recommended": round(max(0, method2), 2)  # Most banks use Method II
    }
