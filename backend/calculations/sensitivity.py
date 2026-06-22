"""
calculations/sensitivity.py — Sensitivity analysis (CA standard, Section S, PDF §7.7)

CA Rule:
  Variable costs MUST scale proportionally with revenue change.
  Fixed costs remain CONSTANT across all scenarios.
  DSCR per scenario = (PAT + Dep + Interest) / (Principal + Interest)
"""
from core.engine import R, dscr_label

_COGS_RATIO    = 0.50   # variable fraction of revenue
_MARKETING_PCT = 0.025  # also variable


def calculate_sensitivity(data, scheme_data: dict, monthly: dict, income_statement: list | None = None) -> list:
    """
    Run 6 revenue sensitivity scenarios (+20% to -30%).

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
        monthly_int = float(yr1.get("interest", 0) or 0) / 12
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

    result = []
    for label, chg in scenarios:
        # Revenue changes
        s_rev = R(base_rev * (1 + chg), 2)

        # Variable costs scale proportionally with revenue (CA spec).
        # Monotonic guarantee: higher revenue → lower variable cost ratio → better EBITDA,
        # assuming variable cost ratio < 100%. We do NOT cap the scaling with revenue.
        s_var = R(base_var * (1 + chg), 2)

        # Fixed costs stay constant regardless of revenue level
        s_ebitda = R(s_rev - s_var - base_fixed, 2)
        s_ebit   = R(s_ebitda - monthly_dep, 2)
        s_pbt    = R(s_ebit - monthly_int, 2)
        s_tax    = R(max(s_pbt * tax_rate, 0), 2)
        s_pat    = R(s_pbt - s_tax, 2)

        # CA-standard DSCR = (PAT + Dep + Interest) / (Principal + Interest)
        numerator   = R(s_pat + monthly_dep + monthly_int, 2)
        denominator = R(monthly_prin + monthly_int, 2)
        s_dscr = R(numerator / denominator, 2) if denominator else 0.0

        # COGS for this scenario (variable portion only, scaled with revenue)
        s_cogs = R(base_cogs * (1 + chg), 2)

        result.append({
            "scenario":         label,
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

    return result
