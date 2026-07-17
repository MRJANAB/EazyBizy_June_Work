from typing import List, Dict, Any
from .intake_mapper import CMAIntake

def calculate_balance_sheet(intake: CMAIntake, operating_projections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Projected Balance Sheet — constructed so it ALWAYS tallies (Assets = Liabilities).

    Banking convention applied:
      - Net worth      = opening equity + cumulative retained earnings (PAT).
      - Term loan      = closing balance from the amortisation schedule
                         (proj['tl_closing']) — NOT a straight-line average,
                         so it agrees with the operating statement.
      - Cash & bank    = the BALANCING FIGURE (residual). Retained profits and
                         financing that are not absorbed by fixed assets, stock
                         or debtors surface here as cash. This is exactly how a
                         projected CMA balance sheet is built, and it guarantees
                         Assets = Liabilities every year.
      - A 'check' field (Assets - Liabilities) is emitted; it must be ~0.
    """
    balance_sheets = []

    # ── Opening position (project start) ──────────────────────────────────────
    net_worth = intake.means_of_finance.promoter_contribution + intake.means_of_finance.unsecured_loans
    term_loan = intake.means_of_finance.term_loan
    wc_loan   = intake.means_of_finance.working_capital_loan

    fixed_assets = (
        intake.project_cost.land + intake.project_cost.building +
        intake.project_cost.plant_machinery + intake.project_cost.electrical +
        intake.project_cost.furniture + intake.project_cost.computers +
        intake.project_cost.vehicles + intake.project_cost.office_equipment +
        intake.project_cost.generator_ups
    )

    # Intangible / deferred assets (preliminary, registration, consultancy, etc.)
    other_assets = (
        intake.project_cost.preliminary_expenses + intake.project_cost.registration_license +
        intake.project_cost.consultancy_fees + intake.project_cost.marketing_launch +
        intake.project_cost.contingency
    )

    current_net_worth    = net_worth
    current_fixed_assets = fixed_assets

    for i, proj in enumerate(operating_projections):
        year = proj['year']

        # Net worth accumulates retained earnings (PAT).
        current_net_worth += proj['pat']

        # Term loan = scheduled closing balance (single source of truth).
        current_term_loan = proj.get('tl_closing', max(term_loan - (term_loan / len(operating_projections)) * (i + 1), 0))

        # Net fixed block reduces by this year's depreciation.
        current_fixed_assets -= proj['depreciation']
        if current_fixed_assets < 0:
            current_fixed_assets = 0

        # ── Inventory built on RM + WIP + FG (proper CMA holding norms) ────────
        # COGS in this engine is pure raw-material cost, so it is the RM
        # consumption / purchases base. WIP & FG are valued at cost of
        # production (RM + conversion: labour + depreciation).
        rm_consumption     = proj['cogs']
        cost_of_production = proj['cogs'] + proj['salary'] + proj['depreciation']

        rm_stock = (rm_consumption / 365)     * intake.wc_norms.rm_holding_days
        wip      = (cost_of_production / 365)  * intake.wc_norms.wip_days
        fg       = (cost_of_production / 365)  * intake.wc_norms.fg_days
        stock    = rm_stock + wip + fg

        sales     = proj['revenue']
        debtors   = (sales / 365)              * intake.wc_norms.receivable_days
        creditors = (rm_consumption / 365)     * intake.wc_norms.creditor_days
        # Minimum cash a banker expects held for operations (used for MPBF only,
        # NOT the surplus balancing cash below).
        min_cash  = (cost_of_production / 365) * intake.wc_norms.cash_holding_days

        # Intangible / deferred assets, net of the preliminary-expense write-off
        # charged to the P&L so far (the amortised portion leaves the balance
        # sheet; contingency stays). Keeps the BS consistent with the P&L.
        other_assets_net = max(other_assets - proj.get('prelim_written_off', 0.0), 0.0)

        # ── LIABILITIES side total ────────────────────────────────────────────
        total_liabilities = current_net_worth + current_term_loan + wc_loan + creditors

        # ── Cash & bank = balancing figure (residual) ─────────────────────────
        non_cash_assets = current_fixed_assets + other_assets_net + stock + debtors
        cash = total_liabilities - non_cash_assets

        total_current_assets = stock + debtors + cash
        total_assets = current_fixed_assets + total_current_assets + other_assets_net

        # Chargeable current assets for MPBF (excludes surplus cash plug).
        wc_chargeable_ca = stock + debtors + min_cash

        balance_sheets.append({
            "year": year,
            "liabilities": {
                "net_worth": round(current_net_worth, 2),
                "term_loan": round(current_term_loan, 2),
                "wc_loan": round(wc_loan, 2),
                "creditors": round(creditors, 2),
                "total": round(total_liabilities, 2)
            },
            "assets": {
                "fixed_assets": round(current_fixed_assets, 2),
                "current_assets": {
                    "rm_stock": round(rm_stock, 2),
                    "wip": round(wip, 2),
                    "fg": round(fg, 2),
                    "stock": round(stock, 2),
                    "debtors": round(debtors, 2),
                    "cash": round(cash, 2),
                    "total": round(total_current_assets, 2)
                },
                "other_assets": round(other_assets_net, 2),
                "total": round(total_assets, 2)
            },
            # Working-capital figures used for MPBF (chargeable CA excludes surplus cash).
            "min_cash": round(min_cash, 2),
            "wc_chargeable_ca": round(wc_chargeable_ca, 2),
            # Tally check — must be ~0. Negative cash above flags a funding gap.
            "check": round(total_assets - total_liabilities, 2),
            "cash_is_negative": cash < 0
        })

    return balance_sheets
