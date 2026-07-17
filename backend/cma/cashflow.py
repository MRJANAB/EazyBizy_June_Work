from typing import List, Dict, Any
from .intake_mapper import CMAIntake


def calculate_cashflow(intake: CMAIntake,
                       operating_projections: List[Dict[str, Any]],
                       balance_sheets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Indirect cash-flow statement that RECONCILES to the balance sheet.

    Because the balance-sheet cash is the residual that balances assets and
    liabilities, the year-on-year movement of every other balance-sheet line
    sums exactly to the movement in cash. So we derive the cash flow from those
    movements and tie closing cash to the balance-sheet cash line:

        Operating = (PAT + Depreciation) - increase in (stock + debtors)
                                         + increase in creditors
        Investing = -(capex)                       (~0 in projection years)
        Financing = increase in term loan + WC loan (repayment is negative)
        Closing cash = Opening cash + net change   == balance-sheet cash

    A `reconciles` flag is emitted on every row as proof.
    """
    cashflows = []

    # ── Year-0 (commissioning) reference, consistent with balance_sheet.py ────
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
    other_assets = (
        intake.project_cost.preliminary_expenses + intake.project_cost.registration_license +
        intake.project_cost.consultancy_fees + intake.project_cost.marketing_launch +
        intake.project_cost.contingency
    )

    # Commissioning cash = funds in minus funds deployed at project start.
    cash0 = (net_worth0 + term_loan0 + wc_loan) - (gross_fixed0 + other_assets)

    prev = {
        "cash": cash0, "stock": 0.0, "debtors": 0.0, "creditors": 0.0,
        "term_loan": term_loan0, "wc_loan": wc_loan, "fixed": gross_fixed0,
    }

    for i, proj in enumerate(operating_projections):
        bs = balance_sheets[i]
        L  = bs["liabilities"]
        A  = bs["assets"]
        CA = A["current_assets"]

        stock     = CA["stock"]
        debtors   = CA["debtors"]
        creditors = L["creditors"]
        term_loan = L["term_loan"]
        fixed     = A["fixed_assets"]
        bs_cash   = CA["cash"]

        d_stock     = stock     - prev["stock"]
        d_debtors   = debtors   - prev["debtors"]
        d_creditors = creditors - prev["creditors"]
        d_term_loan = term_loan - prev["term_loan"]      # negative = repayment
        d_wc_loan   = wc_loan   - prev["wc_loan"]         # 0 (revolving, constant)
        d_fixed     = fixed     - prev["fixed"]

        # Non-cash add-backs: depreciation AND the preliminary-expense write-off
        # (the latter is why other_assets shrinks on the balance sheet each year).
        cash_accruals = proj["pat"] + proj["depreciation"] + proj.get("prelim_amortisation", 0.0)
        wc_change     = d_creditors - d_stock - d_debtors
        operating     = cash_accruals + wc_change
        capex         = d_fixed + proj["depreciation"]    # gross capex (~0 after start)
        investing     = -capex
        financing     = d_term_loan + d_wc_loan
        net_change    = operating + investing + financing

        opening_cash    = prev["cash"]
        computed_closing = opening_cash + net_change
        reconciles = abs(computed_closing - bs_cash) < 1.0

        cashflows.append({
            "year": proj["year"],
            "opening_cash":      round(opening_cash, 2),
            "operating_cash":    round(operating, 2),
            "wc_change":         round(wc_change, 2),
            "investing_cash":    round(investing, 2),
            "financing_cash":    round(financing, 2),
            "financing_outflow": round(-d_term_loan, 2),   # kept for backward compat
            "net_cash_flow":     round(net_change, 2),
            "closing_cash":      round(bs_cash, 2),         # tied to balance sheet
            "bs_cash":           round(bs_cash, 2),
            "reconciles":        reconciles,
        })

        prev = {
            "cash": bs_cash, "stock": stock, "debtors": debtors,
            "creditors": creditors, "term_loan": term_loan,
            "wc_loan": wc_loan, "fixed": fixed,
        }

    return cashflows
