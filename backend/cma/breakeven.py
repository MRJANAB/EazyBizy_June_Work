"""
cma/breakeven.py
================
Break-even analysis per projected year.

Variable cost  = COGS (raw material / consumables — scales with volume).
Fixed cost     = salary + other operating expenses + depreciation.
Contribution   = Net Sales - Variable Cost.
BEP (sales)    = Fixed Cost / Contribution Ratio.
"""

from typing import List, Dict, Any


def calculate_breakeven(operating_statement: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows = []
    for o in operating_statement:
        sales        = o.get("revenue", 0)
        variable     = o.get("cogs", 0)
        fixed        = o.get("salary", 0) + o.get("other_opex", 0) + o.get("depreciation", 0)
        contribution = sales - variable
        cont_ratio   = contribution / sales if sales else 0.0
        bep_sales    = fixed / cont_ratio if cont_ratio else 0.0
        bep_pct      = bep_sales / sales * 100 if sales else 0.0
        rows.append({
            "year":             o.get("year"),
            "net_sales":        round(sales, 2),
            "variable_costs":   round(variable, 2),
            "contribution":     round(contribution, 2),
            "contribution_pct": round(cont_ratio * 100, 2),
            "fixed_costs":      round(fixed, 2),
            "bep_sales":        round(bep_sales, 2),
            "bep_pct":          round(bep_pct, 2),
        })
    return rows
