"""
calculations/break_even.py — Break-even analysis (CA standard, Section M)

CA Rules:
  Variable  = COGS (Raw Materials) + Marketing (both scale with revenue)
  Fixed     = Labour/Admin + Depreciation + ALL Interest (constant regardless of output)
  BEP Sales = Fixed Costs / Contribution Margin Ratio
  BEP %     = BEP Sales / Annual Revenue at 100% capacity
  Payback   = Total Project Cost / Annual Cash Accruals (Year 1)
"""
from core.engine import R, annual_revenue_from_prod


def calculate_break_even(income: list, data, scheme_data: dict = None) -> list:
    """
    Compute break-even for each of the 5 projection years.

    Parameters
    ----------
    income       : 5-year income statement rows
    data         : CMAReportInput
    scheme_data  : scheme routing dict (contains project_cost)

    Returns list of 5 dicts, each containing payback_months for Year 1 usage.
    """
    annual_rev_100 = annual_revenue_from_prod(data.production, getattr(getattr(data, "business", None), "industry_type", "manufacturing"))
    project_cost   = float((scheme_data or {}).get("project_cost", 0) or 0)
    result = []

    for i, yr in enumerate(income):
        rev       = float(yr.get("revenue",        0) or 0)
        cogs      = float(yr.get("cogs",           0) or 0)
        marketing = float(yr.get("marketing",      0) or 0)
        other_var = float(yr.get("other_variable", 0) or 0)   # electricity/transport/etc.

        # CA: Variable = COGS + Marketing + Other variable expenses (all scale with revenue)
        var_costs = R(cogs + marketing + other_var)

        # CA: Fixed = Labour/Admin + Depreciation + Interest (all constant)
        fixed_exp = float(yr.get("fixed_expenses", 0) or 0)
        dep       = float(yr.get("depreciation",   0) or 0)
        interest  = float(yr.get("interest",        0) or 0)   # tl + wc combined
        fix_costs = R(fixed_exp + dep + interest)

        contrib   = R(rev - var_costs)
        cm_ratio  = R(contrib / rev, 4) if rev else 0

        # CA Rule: BEP not achievable if contribution ≤ 0 OR BEP sales > 100% installed capacity
        bep_sales = R(fix_costs / cm_ratio) if cm_ratio > 0 else None
        bep_pct   = R(bep_sales / annual_rev_100, 4) if (bep_sales and annual_rev_100) else None
        # Mark N/A when BEP > 100% capacity — technically math works but operationally impossible
        bep_not_achievable = (cm_ratio <= 0) or (bep_pct is not None and bep_pct > 1.0)

        # Payback Period = Total Project Cost / Annual Cash Accruals
        cash_ac = float(yr.get("cash_accruals", 0) or 0)
        if not project_cost:
            project_cost_est = dep * 10 if dep else float(yr.get("revenue", 0) or 0) * 0.5
        else:
            project_cost_est = project_cost

        payback_months = R(project_cost_est / (cash_ac / 12), 1) if cash_ac > 0 and project_cost_est > 0 else None

        result.append({
            "year":               yr["year"],
            "revenue":            rev,
            "variable_expenses":  var_costs,
            "fixed_expenses":     fix_costs,
            "contribution":       contrib,
            "contribution_pct":   cm_ratio,
            "bep_sales":          bep_sales if bep_sales is not None else 0.0,
            "bep_pct":            bep_pct   if bep_pct   is not None else 0.0,
            "bep_not_achievable": bep_not_achievable,
            # payback_months is None (→ "N/A") when not achievable, never 0
            "payback_months":     payback_months,
            "payback_not_achievable": cash_ac <= 0 or payback_months is None,
        })

    return result
