"""
calculations/sensitivity.py — Sensitivity analysis (CA standard, Section S, PDF §7.7)

CA Rule:
  Variable costs MUST scale proportionally with revenue change.
  Fixed costs remain CONSTANT across all scenarios.
  DSCR per scenario = (PAT + Dep + Interest) / (Principal + Interest)

CA AUDIT (this section): the original 6 scenarios only ever varied
REVENUE. A CA reviewer flagged that a bank-grade sensitivity analysis
must also stress the other levers that actually break a proposal —
raw-material cost, salary, receivable days (working capital), and
interest rate — plus at least one COMBINED downside, not just isolated
single-variable shocks. Each of those four is run through the SAME
calculation modules the base report uses (calculate_loan_schedule,
calculate_wc_by_year, calculate_income_statement) on a deep-copied,
single-field-mutated input, so a rate/day/cost shock this section
reports is guaranteed to match what the full report would show for
that same input — never a hand-rolled approximation.
"""
import copy
from core.engine import R, dscr_label
from calculations.dscr import term_loan_dscr
from calculations.loan_schedule import calculate_loan_schedule
from calculations.working_capital import calculate_wc_by_year
from calculations.income_statement import calculate_income_statement

_COGS_RATIO    = 0.50   # variable fraction of revenue
_MARKETING_PCT = 0.025  # also variable

# Stress magnitudes — deliberately explicit constants (not hidden inside a
# formula) so a reviewer can see exactly what "increase" means for each lever.
_RM_COST_INCREASE_PCT      = 10    # raw material / purchase cost +10%
_SALARY_INCREASE_PCT       = 10    # manpower salaries +10%
_RECEIVABLE_DAYS_INCREASE  = 15    # debtor days +15 days
_INTEREST_RATE_INCREASE_PP = 2.0   # interest rate +2 percentage points
_COMBINED_REVENUE_CHG_PCT  = -10   # combined scenario's own revenue shock


def _bump_rm_cost(d, pct_increase: float) -> None:
    """Raise raw-material/purchase cost by pct_increase%, on whichever of the
    three COGS-source fields is actually populated (mirrors the same
    priority order calculations/income_statement.py reads them in), so the
    shock lands correctly regardless of how this applicant described COGS."""
    factor = 1 + pct_increase / 100
    prod = getattr(d, "production", None)
    if prod is not None and float(getattr(prod, "raw_material_cost_per_unit", 0) or 0) > 0:
        prod.raw_material_cost_per_unit = float(prod.raw_material_cost_per_unit) * factor
    for p in (getattr(d, "products", None) or []):
        if float(getattr(p, "purchase_price", 0) or 0) > 0:
            p.purchase_price = float(p.purchase_price) * factor
    expenses = getattr(d, "expenses", None)
    if expenses is not None and float(getattr(expenses, "raw_materials", 0) or 0) > 0:
        expenses.raw_materials = float(expenses.raw_materials) * factor


def _bump_salaries(d, pct_increase: float) -> None:
    """Raise every manpower salary/wage field by pct_increase%."""
    factor = 1 + pct_increase / 100
    manpower = getattr(d, "manpower", None)
    if manpower is None:
        return
    for field in ("skilled_salary", "semi_skilled_salary", "unskilled_salary"):
        cur = float(getattr(manpower, field, 0) or 0)
        if cur > 0:
            setattr(manpower, field, cur * factor)


def _bump_receivable_days(d, extra_days: float) -> None:
    assum = getattr(d, "assumptions", None)
    if assum is None:
        return
    assum.debtor_days = float(getattr(assum, "debtor_days", 0) or 0) + extra_days


def _bump_interest_rate(d, extra_pp: float) -> None:
    assum = getattr(d, "assumptions", None)
    if assum is None:
        return
    assum.interest_rate_pct = float(getattr(assum, "interest_rate_pct", 10.5) or 10.5) + extra_pp


def _bump_revenue_volume(d, pct_change: float) -> None:
    """Shock REVENUE by scaling VOLUME (not price), on whichever revenue
    driver this applicant actually used, so COGS scales proportionally
    with it through the real engine (calculate_income_statement's own
    "cogs = rm_at_100pct x cap x (1+esc)**i" formula) — satisfying this
    module's own documented CA rule ("variable costs MUST scale
    proportionally with revenue") as a genuine consequence of re-running
    the central engine, not a hand-rolled percentage applied after the
    fact. Scaling price instead of volume would move revenue without
    moving COGS, breaking that rule for a quantity-linked cost.
    """
    factor = 1 + pct_change / 100
    products = getattr(d, "products", None) or []
    for p in products:
        p.units_per_month = float(getattr(p, "units_per_month", 0) or 0) * factor
        if float(getattr(p, "monthly_revenue", 0) or 0) > 0:
            p.monthly_revenue = float(p.monthly_revenue) * factor
    prod = getattr(d, "production", None)
    if prod is not None and float(getattr(prod, "input_qty_per_day", 0) or 0) > 0:
        prod.input_qty_per_day = float(prod.input_qty_per_day) * factor


def _run_structural_scenario(data, scheme_data, dep, mutate_fns):
    """Deep-copy `data`, apply each mutate_fn to it, then re-run the loan
    schedule / working capital / income statement through the SAME modules
    the base report uses.

    Returns the Year-1 row plus the resolved loan/WC schedules, so the
    caller can pull whatever figures it needs (interest, principal, DSCR).
    """
    d2 = copy.deepcopy(data)
    for fn in mutate_fns:
        fn(d2)
    loan2   = calculate_loan_schedule(d2, scheme_data)
    wc2     = calculate_wc_by_year(d2, scheme_data)
    income2 = calculate_income_statement(d2, scheme_data, dep, loan2, wc2)
    yr1 = dict(income2[0])
    return yr1, loan2, wc2


def calculate_sensitivity(data, scheme_data: dict, monthly: dict, income_statement: list | None = None, dep: dict | None = None) -> list:
    """
    Run the CA-standard sensitivity suite: 6 revenue scenarios (+20% to
    -30%, unchanged from the original spec), plus 4 single-lever structural
    stress scenarios (raw-material cost, salary, receivable days, interest
    rate) and 1 combined downside scenario. `dep` (the depreciation
    schedule) is required for the structural scenarios — when omitted (e.g.
    an older caller), only the 6 revenue scenarios are returned.

    Base case uses the Year-1 master income statement. Variable costs scale with
    revenue; fixed costs stay constant. DSCR uses CA standard formula per scenario.
    """
    yr1 = (income_statement or [{}])[0] if income_statement else {}
    if yr1:
        base_rev   = float(yr1.get("revenue", yr1.get("sales", 0)) or 0) / 12
        base_cogs  = float(yr1.get("cogs", yr1.get("raw_materials", 0)) or 0) / 12
        base_var   = (
            float(yr1.get("cogs", yr1.get("raw_materials", 0)) or 0) +
            float(yr1.get("power", yr1.get("other_variable", 0)) or 0) +
            float(yr1.get("marketing", yr1.get("marketing_expenses", 0)) or 0)
        ) / 12
        base_fixed  = float(yr1.get("fixed_expenses", yr1.get("total_fixed", 0)) or 0) / 12
        monthly_dep = float(yr1.get("depreciation", 0) or 0) / 12
        # Total interest (TL + WC) — used for P&L (PBT/PAT) only.
        monthly_int = float(yr1.get("interest", 0) or 0) / 12
        # TL-ONLY interest — used for the Term Loan DSCR formula below, so the
        # sensitivity DSCR matches the main DSCR schedule's definition exactly
        # (which deliberately excludes WC interest).
        monthly_tl_int = float(yr1.get("tl_interest", yr1.get("interest", 0)) or 0) / 12
        master_pbt  = float(yr1.get("profit_before_tax", 0) or 0)
        master_tax  = float(yr1.get("tax", 0) or 0)
        tax_rate    = (master_tax / master_pbt) if master_pbt > 0 else 0.25
    else:
        base_rev       = float(monthly.get("net_monthly_revenue", 0) or 0)
        base_cogs      = float(monthly.get("cogs_monthly", monthly.get("raw_material_monthly", 0)) or 0)
        base_var       = float(monthly.get("variable_total", 0) or 0) or R(base_rev * _COGS_RATIO)
        base_fixed     = float(monthly.get("fixed_total",         0) or 0)
        monthly_dep    = float(monthly.get("monthly_dep",         0) or 0)
        monthly_int    = float(monthly.get("monthly_int_y1",      0) or 0)
        monthly_tl_int = float(monthly.get("monthly_tl_int", monthly_int) or 0)
        tax_rate       = float(monthly.get("tax_monthly", 0) / max(float(monthly.get("pbt_monthly", 1) or 1), 0.001)) \
                         if monthly.get("pbt_monthly", 0) and monthly.get("pbt_monthly", 0) > 0 else 0.25
    monthly_prin   = float(monthly.get("monthly_principal",   0) or 0)

    scenarios = [
        ("Best Case",     0.20),
        ("Optimistic",    0.10),
        ("Base Case",     0.00),
        ("Conservative", -0.10),
        ("Pessimistic",  -0.20),
        ("Worst Case",   -0.30),
    ]

    # CA AUDIT: every scenario below (revenue AND structural) is runnable
    # through the SAME central engine re-run (_run_structural_scenario)
    # whenever we have a real CMAReportInput-shaped `data`, `scheme_data`
    # and `dep` — i.e. the live report-generation path. The 6 revenue
    # scenarios used to be a hand-rolled monthly-snapshot approximation
    # (scale base_rev/base_var by (1+chg), recompute EBITDA/PBT/PAT by
    # hand) even when the real engine was available, so a "Raw Material
    # Cost +10%" structural scenario (already engine-driven) and an
    # "Optimistic +10%" revenue scenario (hand-rolled) could show a
    # materially different result for what is, mechanically, the same kind
    # of shock. Only the legacy/no-`data` fallback below still uses the
    # hand-rolled approximation.
    _live_engine = data is not None and dep is not None and income_statement

    result = []
    for label, chg in scenarios:
        if _live_engine:
            s_yr1, s_loan, s_wc = _run_structural_scenario(
                data, scheme_data, dep, [lambda d, pct=chg * 100: _bump_revenue_volume(d, pct)]
            )
            s_cash_accruals = float(s_yr1.get("cash_accruals", 0) or 0)
            s_tl_int  = float(s_yr1.get("tl_interest", s_yr1.get("interest", 0)) or 0)
            s_tl_prin = float(s_loan[0]["principal_paid"])
            _, _, s_dscr = term_loan_dscr(s_cash_accruals, s_tl_int, s_tl_prin)
            result.append({
                "scenario":         label,
                "type":             "revenue",
                "change_pct":       int(chg * 100),
                "monthly_revenue":  R(float(s_yr1.get("revenue", 0) or 0) / 12, 2),
                "monthly_cogs":     R(float(s_yr1.get("cogs", 0) or 0) / 12, 2),
                "monthly_variable": R((float(s_yr1.get("cogs", 0) or 0) + float(s_yr1.get("other_variable", 0) or 0) + float(s_yr1.get("marketing", 0) or 0)) / 12, 2),
                "monthly_fixed":    R(float(s_yr1.get("fixed_expenses", 0) or 0) / 12, 2),
                "monthly_ebitda":   R(float(s_yr1.get("ebitda", 0) or 0) / 12, 2),
                "monthly_profit":   R(float(s_yr1.get("pat", s_yr1.get("net_profit", 0)) or 0) / 12, 2),
                "dscr":             s_dscr,
                "status":           dscr_label(s_dscr),
            })
            continue

        # ── Legacy fallback (no `data` available to re-run the engine) ──
        s_rev = R(base_rev * (1 + chg), 2)
        # Variable costs scale proportionally with revenue (CA spec).
        s_var = R(base_var * (1 + chg), 2)
        # Fixed costs stay constant regardless of revenue level
        s_ebitda = R(s_rev - s_var - base_fixed, 2)
        s_ebit   = R(s_ebitda - monthly_dep, 2)
        s_pbt    = R(s_ebit - monthly_int, 2)
        s_tax    = R(max(s_pbt * tax_rate, 0), 2)
        s_pat    = R(s_pbt - s_tax, 2)
        s_cash_accruals = R(s_pat + monthly_dep, 2)
        _, _, s_dscr = term_loan_dscr(s_cash_accruals, monthly_tl_int, monthly_prin)
        s_cogs = R(base_cogs * (1 + chg), 2)
        result.append({
            "scenario":         label,
            "type":             "revenue",
            "change_pct":       int(chg * 100),
            "monthly_revenue":  s_rev,
            "monthly_cogs":     s_cogs,
            "monthly_variable": s_var,
            "monthly_fixed":    base_fixed,
            "monthly_ebitda":   s_ebitda,
            "monthly_profit":   s_pat,
            "dscr":             s_dscr,
            "status":           dscr_label(s_dscr),
        })

    # ── Structural single-lever + combined scenarios ───────────────────────
    # Only runnable when we have real CMAReportInput-shaped data, a real
    # scheme_data dict, and the depreciation schedule to feed
    # calculate_income_statement — i.e. the live report-generation path.
    if _live_engine:
        _structural = [
            ("Raw Material Cost +{}%".format(_RM_COST_INCREASE_PCT),
             [lambda d: _bump_rm_cost(d, _RM_COST_INCREASE_PCT)]),
            ("Salary Increase +{}%".format(_SALARY_INCREASE_PCT),
             [lambda d: _bump_salaries(d, _SALARY_INCREASE_PCT)]),
            ("Receivable Days +{}".format(_RECEIVABLE_DAYS_INCREASE),
             [lambda d: _bump_receivable_days(d, _RECEIVABLE_DAYS_INCREASE)]),
            ("Interest Rate +{}pp".format(_INTEREST_RATE_INCREASE_PP),
             [lambda d: _bump_interest_rate(d, _INTEREST_RATE_INCREASE_PP)]),
            ("Combined Downside",
             [lambda d: _bump_rm_cost(d, _RM_COST_INCREASE_PCT),
              lambda d: _bump_salaries(d, _SALARY_INCREASE_PCT),
              lambda d: _bump_receivable_days(d, _RECEIVABLE_DAYS_INCREASE),
              lambda d: _bump_interest_rate(d, _INTEREST_RATE_INCREASE_PP),
              lambda d: _bump_revenue_volume(d, _COMBINED_REVENUE_CHG_PCT)]),
        ]
        for label, mutate_fns in _structural:
            s_yr1, s_loan, s_wc = _run_structural_scenario(data, scheme_data, dep, mutate_fns)
            s_cash_accruals = float(s_yr1.get("cash_accruals", 0) or 0)
            s_tl_int  = float(s_yr1.get("tl_interest", s_yr1.get("interest", 0)) or 0)
            s_tl_prin = float(s_loan[0]["principal_paid"])
            _, _, s_dscr = term_loan_dscr(s_cash_accruals, s_tl_int, s_tl_prin)
            result.append({
                "scenario":         label,
                "type":             "structural",
                "change_pct":       _COMBINED_REVENUE_CHG_PCT if label == "Combined Downside" else 0.0,
                "monthly_revenue":  R(float(s_yr1.get("revenue", 0) or 0) / 12, 2),
                "monthly_cogs":     R(float(s_yr1.get("cogs", 0) or 0) / 12, 2),
                "monthly_variable": R((float(s_yr1.get("cogs", 0) or 0) + float(s_yr1.get("other_variable", 0) or 0) + float(s_yr1.get("marketing", 0) or 0)) / 12, 2),
                "monthly_fixed":    R(float(s_yr1.get("fixed_expenses", 0) or 0) / 12, 2),
                "monthly_ebitda":   R(float(s_yr1.get("ebitda", 0) or 0) / 12, 2),
                "monthly_profit":   R(float(s_yr1.get("pat", s_yr1.get("net_profit", 0)) or 0) / 12, 2),
                "dscr":             s_dscr,
                "status":           dscr_label(s_dscr),
            })

    return result
