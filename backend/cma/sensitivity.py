"""
cma/sensitivity.py
==================
Stress-tests the projections under adverse scenarios a banker checks:
  - Base case
  - Net sales decrease by 10% (volume; COGS scales down with it)
  - Raw-material / consumable cost increase by 10% (sales unchanged)
  - Interest rate increase by 2% (finance cost up)

For each scenario it recomputes PAT and DSCR per year from the operating-
statement rows, so the stress result stays consistent with the live model.
"""

from typing import List, Dict, Any
from .intake_mapper import CMAIntake


def _recompute(rev, cogs, salary, other_opex, dep, tl_int, wc_int, tl_principal, tax_rate,
               cgtmse_fee=0.0, prelim_amort=0.0):
    # Mirror the main operating statement EXACTLY so the base case ties to the
    # projection: the CGTMSE fee sits in operating cost (inside EBITDA) and the
    # preliminary write-off is a non-cash charge below EBITDA, added back in DSCR.
    gross  = rev - cogs
    ebitda = gross - salary - other_opex - cgtmse_fee
    pbt    = ebitda - dep - prelim_amort - (tl_int + wc_int)
    tax    = max(0.0, pbt * tax_rate / 100.0)
    pat    = pbt - tax
    denom  = tl_int + tl_principal
    dscr   = (pat + dep + prelim_amort + tl_int) / denom if denom else 0.0
    return round(pat, 2), round(dscr, 2)


def calculate_sensitivity(intake: CMAIntake,
                          operating_statement: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    rate     = intake.loan.interest_rate or 0.0
    tax_rate = intake.tax_rate
    int_bump = (rate + 2.0) / rate if rate else 1.0   # +2% absolute on the rate

    scenarios = {
        "base":            (1.00, 1.00, 1.00, 1.00),  # (rev, cogs-from-vol, cogs-cost, interest)
        "sales_down_10":   (0.90, 0.90, 1.00, 1.00),
        "rm_cost_up_10":   (1.00, 1.00, 1.10, 1.00),
        "interest_up_2":   (1.00, 1.00, 1.00, int_bump),
    }

    out: Dict[str, List[Dict[str, Any]]] = {}
    for name, (rev_f, vol_f, cost_f, int_f) in scenarios.items():
        rows = []
        for o in operating_statement:
            rev   = o.get("revenue", 0) * rev_f
            cogs  = o.get("cogs", 0) * vol_f * cost_f
            tl_in = o.get("tl_interest", 0) * int_f
            wc_in = o.get("wc_interest", 0) * int_f
            pat, dscr = _recompute(
                rev, cogs, o.get("salary", 0), o.get("other_opex", 0),
                o.get("depreciation", 0), tl_in, wc_in, o.get("tl_principal", 0), tax_rate,
                cgtmse_fee=o.get("cgtmse_fee", 0), prelim_amort=o.get("prelim_amortisation", 0),
            )
            rows.append({
                "year": o.get("year"),
                "net_sales": round(rev, 2),
                "pat": pat,
                "dscr": dscr,
            })
        out[name] = rows
    return out
