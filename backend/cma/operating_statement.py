from typing import List, Dict, Any
from .intake_mapper import CMAIntake
from .loan_schedule import calculate_loan_schedule
from .depreciation import calculate_depreciation_schedule

# CGTMSE Annual Guarantee Fee — charged p.a. on the guaranteed (term-loan)
# outstanding when the facility is CGTMSE-covered. Slab-based in reality
# (~0.37%–1.35%); 1.0% is used here as a conservative, transparent default.
CGTMSE_AGF_RATE = 0.01


def calculate_operating_statement(intake: CMAIntake, years: int = 5) -> List[Dict[str, Any]]:
    """
    BUG 1 FIX: COGS computed from unit costs (purchase_cost × qty), NOT from revenue × grossMargin.
    BUG 2 FIX: Salary is a FIXED cost — does NOT scale with capacity/revenue; grows at sal_incr only.
    BUG 9 FIX: Revenue Year 1 = base; Year N = Year(N-1) × (1 + rev_growth).
    """
    projections = []

    # ── BUG 1 FIX: Base COGS from unit costs (purchase_cost × qty) ──
    base_revenue = sum(p.monthly_revenue for p in intake.products) * 12
    # RM_at_100pct = sum(purchase_cost × annual_qty) — this IS from unit costs
    base_cogs = sum(p.monthly_cogs for p in intake.products) * 12

    # BUG 1 FIX: grossMarginPct is READ-ONLY auto-calculated (never user input)
    gross_margin_pct = (base_revenue - base_cogs) / base_revenue if base_revenue > 0 else 0.0

    # ── BUG 2 FIX: Salary is FIXED — grows at sal_incr only, never scales with revenue ──
    base_salary = sum(m.headcount * m.monthly_salary for m in intake.manpower) * 12

    # Fixed operating expenses (rent, admin, utilities) — grow at exp_growth, NOT scaled with revenue
    base_opex = (
        intake.opex.rent + intake.opex.electricity + intake.opex.water +
        intake.opex.telephone + intake.opex.internet + intake.opex.transport +
        intake.opex.repair + intake.opex.stationery + intake.opex.marketing +
        intake.opex.insurance + intake.opex.professional_fees + intake.opex.misc
    ) * 12

    # Assumptions
    rev_growth  = intake.assumptions.get("revenue_growth", 10.0) / 100
    # BUG 1 FIX: COGS grows from unit-cost base (same rate as revenue = production volume),
    # NOT at a separate cogs_growth rate. This ensures sensitivity is NOT inverted.
    exp_growth  = intake.assumptions.get("expense_growth", 5.0) / 100
    sal_incr    = intake.assumptions.get("salary_increment", 8.0) / 100

    # Depreciation: WDV (reducing-balance) per year — declines as assets age,
    # instead of charging the full rate on original cost every year.
    dep_schedule = calculate_depreciation_schedule(intake, years)

    # Financing: reducing-balance term-loan interest + revolving WC interest.
    # Single source of truth — every downstream module reads these same figures.
    loan_schedule = calculate_loan_schedule(intake, years)

    current_revenue = base_revenue
    current_salary  = base_salary
    current_opex    = base_opex

    for year in range(1, years + 1):
        if year > 1:
            # BUG 9 FIX: Revenue chains from previous year
            current_revenue *= (1 + rev_growth)
            # BUG 2 FIX: Salary grows at sal_incr only (FIXED cost, never scales with revenue)
            current_salary  *= (1 + sal_incr)
            current_opex    *= (1 + exp_growth)

        # BUG 1 FIX: COGS scales proportionally with revenue (same volume ratio as base year)
        # Revenue growth includes both volume and price; COGS scales with volume only.
        # Since we have unit costs (purchase_cost), scale by revenue ratio from base.
        rev_ratio    = current_revenue / base_revenue if base_revenue > 0 else 1.0
        current_cogs = round(base_cogs * rev_ratio, 2)

        # Reducing-balance financing cost for this year (TL + WC).
        sched          = loan_schedule[year - 1]
        tl_interest    = sched["tl_interest"]
        wc_interest    = sched["wc_interest"]
        total_interest = tl_interest + wc_interest

        # CGTMSE annual guarantee fee — an operating cost when the loan is
        # CGTMSE-covered, charged on the term-loan opening balance for the year.
        cg = intake.collateral
        cgtmse_fee = round(sched["tl_opening"] * CGTMSE_AGF_RATE, 2) if (cg and cg.cgtmse_covered) else 0.0

        gross_profit = current_revenue - current_cogs
        total_opex   = current_salary + current_opex + cgtmse_fee
        ebitda       = gross_profit - total_opex

        # WDV depreciation for this year (declines as assets age).
        depreciation = dep_schedule[year - 1]["depreciation"]

        pbt  = ebitda - depreciation - total_interest
        tax  = max(0, pbt * (intake.tax_rate / 100))
        pat  = pbt - tax
        cash_accruals = pat + depreciation

        projections.append({
            "year":               year,
            "revenue":            round(current_revenue, 2),
            "cogs":               current_cogs,
            "gross_profit":       round(gross_profit, 2),
            "gross_margin_pct":   round(gross_margin_pct * 100, 2),  # READ-ONLY
            "salary":             round(current_salary, 2),
            "other_opex":         round(current_opex, 2),
            "cgtmse_fee":         round(cgtmse_fee, 2),
            "ebitda":             round(ebitda, 2),
            "depreciation":       round(depreciation, 2),
            "interest":           round(total_interest, 2),   # TL + WC (total finance cost)
            "tl_interest":        round(tl_interest, 2),       # term-loan portion only
            "wc_interest":        round(wc_interest, 2),       # working-capital portion
            "tl_principal":       round(sched["tl_principal"], 2),
            "tl_closing":         round(sched["tl_closing"], 2),
            "pbt":                round(pbt, 2),
            "tax":                round(tax, 2),
            "pat":                round(pat, 2),
            "cash_accruals":      round(cash_accruals, 2),
        })

    return projections
