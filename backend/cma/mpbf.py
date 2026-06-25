from typing import Dict, Any, List

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


def calculate_mpbf_by_year(balance_sheets: List[Dict[str, Any]],
                           wc_loan_sought: float = 0.0) -> List[Dict[str, Any]]:
    """
    Compute MPBF for each projected year using *chargeable* current assets
    (RM+WIP+FG + debtors + minimum cash) — NOT the surplus balancing cash —
    and the other current liabilities (sundry creditors).

    Also compares the WC limit actually sought against the permissible MPBF so a
    banker can immediately see whether the ask is within Method-II limits.
    """
    rows = []
    for bs in balance_sheets:
        chargeable_ca = bs.get("wc_chargeable_ca",
                               bs["assets"]["current_assets"]["total"])
        ocl = bs["liabilities"]["creditors"]
        m = calculate_mpbf(chargeable_ca, ocl)
        permissible = m["recommended"]
        rows.append({
            "year": bs["year"],
            "current_assets": round(chargeable_ca, 2),
            "other_cl": round(ocl, 2),
            "wc_gap": m["wc_gap"],
            "method1": m["method1"],
            "method2": m["method2"],
            "mpbf": permissible,                       # Method II (bank norm)
            "wc_loan_sought": round(wc_loan_sought, 2),
            "within_limit": wc_loan_sought <= permissible + 1,
            "excess_over_mpbf": round(max(wc_loan_sought - permissible, 0), 2),
        })
    return rows
