"""
cma/fund_flow.py
================
Fund Flow Statement (CMA Form VI) — Sources and Uses of funds per year.

Derived from the year-on-year movement of the (tallied) balance sheet, with a
commissioning baseline consistent with cashflow.py. Long-term surplus funds the
increase in working capital; the residual is the net surplus/deficit (which ties
to the movement in cash).
"""

from typing import List, Dict, Any
from .intake_mapper import CMAIntake


def calculate_fund_flow(intake: CMAIntake,
                        operating_statement: List[Dict[str, Any]],
                        balance_sheets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    net_worth0 = intake.means_of_finance.promoter_contribution + intake.means_of_finance.unsecured_loans
    term_loan0 = intake.means_of_finance.term_loan
    wc_loan    = intake.means_of_finance.working_capital_loan

    gross_fixed0 = (
        intake.project_cost.land + intake.project_cost.building +
        intake.project_cost.plant_machinery + intake.project_cost.electrical +
        intake.project_cost.furniture + intake.project_cost.computers +
        intake.project_cost.vehicles + intake.project_cost.office_equipment +
        intake.project_cost.generator_ups
    )

    prev = {
        "net_worth": net_worth0, "term_loan": term_loan0, "fixed": gross_fixed0,
        "ca": 0.0, "creditors": 0.0,
    }

    rows = []
    for o, bs in zip(operating_statement, balance_sheets):
        L, A = bs["liabilities"], bs["assets"]
        net_worth = L["net_worth"]
        term_loan = L["term_loan"]
        fixed     = A["fixed_assets"]
        ca        = A["current_assets"]["total"]
        creditors = L["creditors"]

        net_profit = o.get("pat", 0)
        dep        = o.get("depreciation", 0)
        prelim_amort = o.get("prelim_amortisation", 0)   # non-cash add-back

        # Equity infusion (movement in net worth beyond retained profit).
        d_capital = (net_worth - prev["net_worth"]) - net_profit
        # Term liability movement: positive = drawdown (source), negative = repayment (use).
        d_term    = term_loan - prev["term_loan"]
        increase_term = max(d_term, 0.0)
        decrease_term = max(-d_term, 0.0)
        # Capex (gross fixed-asset additions; ~0 in projection years).
        capex = max((fixed - prev["fixed"]) + dep, 0.0)

        sources = net_profit + dep + prelim_amort + max(d_capital, 0.0) + increase_term
        uses    = capex + decrease_term + max(-d_capital, 0.0)
        lt_surplus = sources - uses

        d_ca = ca - prev["ca"]
        d_cl = creditors - prev["creditors"]
        d_wc = d_ca - d_cl                    # increase in working capital (a use)
        net_surplus = lt_surplus - d_wc

        rows.append({
            "year": o.get("year"),
            "net_profit": round(net_profit, 2),
            "depreciation": round(dep, 2),
            "increase_in_capital": round(max(d_capital, 0.0), 2),
            "increase_in_term_liab": round(increase_term, 2),
            "total_sources": round(sources, 2),
            "purchase_fixed_assets": round(capex, 2),
            "repayment_term_liab": round(decrease_term, 2),
            "total_uses": round(uses, 2),
            "long_term_surplus": round(lt_surplus, 2),
            "increase_in_ca": round(d_ca, 2),
            "increase_in_cl": round(d_cl, 2),
            "increase_in_wc": round(d_wc, 2),
            "net_surplus": round(net_surplus, 2),
        })

        prev = {"net_worth": net_worth, "term_loan": term_loan, "fixed": fixed,
                "ca": ca, "creditors": creditors}

    return rows
