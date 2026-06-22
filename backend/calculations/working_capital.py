"""
calculations/working_capital.py — WC requirement by year (CA standard, Bug 6 FIX)

BUG 6 FIX: Use 360 days (banking convention), separate RM_Stock / WIP / FG / Debtors / Creditors.
  RM_Stock   = (RM_YearN / 360) × stockHoldingDays
  WIP        = (COGS_YearN / 360) × wipDays
  FG         = (COGS_YearN / 360) × fgHoldingDays
  Debtors    = (Revenue_YearN / 360) × debtorDays
  Creditors  = (RM_YearN / 360) × creditorDays
  Total_WC   = RM_Stock + WIP + FG + Debtors - Creditors
  Service WC = Receivables + Salary Float + Expense Float + Cash Reserve
  WC_Loan    = wcLoanPct × Total_WC
  WC_Margin  = (1 - wcLoanPct) × Total_WC
  WC_Interest = WC_Loan × wcInterestRate
"""
from core.engine import R, annual_revenue_from_prod, get_industry_defaults


def _compute_rm_at_100pct(data, annual_rev_100: float, cogs_ratio: float, cap_y1: float = 0.50) -> float:
    """RM at 100% capacity — three-priority CA logic (same as income_statement)."""
    prod        = data.production
    rm_per_unit = float(getattr(prod, "raw_material_cost_per_unit", 0) or 0)
    input_qty   = float(getattr(prod, "input_qty_per_day", 0) or 0)
    work_days   = float(getattr(prod, "working_days_per_year", 300) or 300)
    if rm_per_unit > 0 and input_qty > 0:
        return input_qty * work_days * rm_per_unit
    # Priority 2: monthly RM entered in expenses step
    expenses   = getattr(data, "expenses", None)
    monthly_rm = float(getattr(expenses, "raw_materials", 0) or 0) if expenses else 0.0
    if monthly_rm > 0 and cap_y1 > 0:
        return (monthly_rm * 12) / cap_y1
    return annual_rev_100 * cogs_ratio


def calculate_wc_by_year(data, scheme_data: dict) -> list:
    """Estimate working capital for 5 years using CA norms (360-day banking convention)."""
    assum    = data.assumptions
    industry = str(getattr(getattr(data, "business", None), "industry_type", "manufacturing") or "manufacturing").lower()
    ind      = get_industry_defaults(industry)

    stock_days    = int(getattr(assum, "stock_holding_days", 0) or 0) or ind["stock_days"]
    # Bug 4 fix: explicit None check so user-entered 0 days (cash retail) is respected
    _raw_debtor   = getattr(assum, "debtor_days", None)
    debtor_days   = int(_raw_debtor) if _raw_debtor is not None else ind["debtor_days"]
    creditor_days = int(getattr(assum, "creditor_days",      0) or 0) or ind["creditor_days"]
    # BUG 6 FIX: Add WIP and FG days (from schema, with defaults)
    wip_days      = int(getattr(assum, "wip_days",  15) or 15)
    fg_days       = int(getattr(assum, "fg_days",   30) or 30)

    wc_pct    = float(getattr(assum, "wc_loan_pct", ind["wc_loan_pct"] * 100) or (ind["wc_loan_pct"] * 100)) / 100
    int_rate  = float(getattr(assum, "interest_rate_pct", 10.5) or 10.5) / 100
    rev_growth = float(getattr(assum, "revenue_growth_pct", 7.0) or 7.0) / 100
    salary_hike = float(getattr(assum, "salary_increase_pct", 10.0) or 10.0) / 100

    annual_rev_base = annual_revenue_from_prod(data.production, industry)
    cogs_ratio      = ind["cogs_ratio"]
    manpower_data = getattr(data, "manpower", None)
    actual_monthly_salary = 0.0
    if manpower_data:
        actual_monthly_salary = R(
            float(getattr(manpower_data, "skilled_count",      0) or 0) * float(getattr(manpower_data, "skilled_salary",      0) or 0) +
            float(getattr(manpower_data, "semi_skilled_count", 0) or 0) * float(getattr(manpower_data, "semi_skilled_salary", 0) or 0) +
            float(getattr(manpower_data, "unskilled_count",    0) or 0) * float(getattr(manpower_data, "unskilled_salary",    0) or 0)
        )
    expenses_data = getattr(data, "expenses", None)
    actual_monthly_non_salary = 0.0
    if expenses_data:
        actual_monthly_non_salary = R(
            float(getattr(expenses_data, "monthly_rent", getattr(expenses_data, "rent", 0)) or 0) +
            float(getattr(expenses_data, "electricity_water",    0) or 0) +
            float(getattr(expenses_data, "repair_maintenance",   0) or 0) +
            float(getattr(expenses_data, "transport_conveyance", 0) or 0) +
            float(getattr(expenses_data, "telephone_internet",   0) or 0) +
            float(getattr(expenses_data, "stationery",           0) or 0) +
            float(getattr(expenses_data, "miscellaneous",        0) or 0) +
            float(getattr(expenses_data, "marketing",            0) or 0)
        )

    user_caps = [
        getattr(assum, "capacity_y1_pct", None),
        getattr(assum, "capacity_y2_pct", None),
        getattr(assum, "capacity_y3_pct", None),
        getattr(assum, "capacity_y4_pct", None),
        getattr(assum, "capacity_y5_pct", None),
    ]
    if all(v is not None and float(v or 0) > 0 for v in user_caps):
        capacities = [float(v or 0) / 100 for v in user_caps]
    else:
        capacities = ind.get("capacity_schedule", [0.50, 0.60, 0.70, 0.75, 0.80])

    cap_y1       = capacities[0] if capacities else 0.50
    product_monthly = sum(
        float(getattr(p, "monthly_revenue", 0) or 0)
        for p in (getattr(data, "products", None) or [])
    )
    if product_monthly > 0 and cap_y1 > 0:
        annual_rev_base = R(product_monthly * 12 / cap_y1)
    rm_at_100pct = _compute_rm_at_100pct(data, annual_rev_base, cogs_ratio, cap_y1)

    # Industry-specific day overrides
    if industry == "service":
        stock_days = 0
        wip_days   = 0
        fg_days    = 0
    elif industry in ("trading", "agriculture"):
        wip_days   = 0   # trading/agriculture: no work-in-progress

    result       = []
    prev_rev     = None

    for i in range(5):
        yr  = i + 1
        cap = capacities[i] if i < len(capacities) else capacities[-1]

        # BUG 9 compatible: Revenue Y1 = cap × rev_base; Y2+ = prev × (1 + rev_g)
        if i == 0:
            annual_rev = R(annual_rev_base * cap)
        else:
            annual_rev = R(prev_rev * (1 + rev_growth))
        prev_rev = annual_rev

        # 3-priority RM at this year's capacity (consistent with income_statement)
        annual_rm   = R(rm_at_100pct * cap)
        # Use actual RM as production-cost proxy for WIP/FG (matches P&L COGS)
        annual_cogs = annual_rm

        # BUG 6 FIX: Use 360 days (banking convention)
        debtors = R((annual_rev / 360) * debtor_days)
        if industry == "service":
            annual_salary = (
                R(actual_monthly_salary * 12 * (1 + salary_hike) ** i)
                if actual_monthly_salary > 0
                else R(annual_rev * ind["fixed_ratio"] * 0.70)
            )
            annual_non_salary = (
                R(actual_monthly_non_salary * 12 * (1 + rev_growth) ** i)
                if actual_monthly_non_salary > 0
                else R(annual_rev * ind["fixed_ratio"] * 0.30)
            )
            salary_float = R((annual_salary / 360) * 30)
            expense_float = R(((annual_cogs + annual_non_salary) / 360) * 30)
            cash_reserve = R(((annual_salary + annual_non_salary + annual_cogs) / 360) * 15)
            rm_stock = 0.0
            wip = 0.0
            fg = 0.0
            creditors = 0.0
            total = R(max(debtors + salary_float + expense_float + cash_reserve, 0))
        else:
            rm_stock  = R((annual_rm   / 360) * stock_days)
            wip       = R((annual_cogs / 360) * wip_days)
            fg        = R((annual_cogs / 360) * fg_days)
            creditors = R((annual_rm   / 360) * creditor_days)
            cash_reserve = 0.0
            expense_float = 0.0
            salary_float = 0.0
            total     = R(max(rm_stock + wip + fg + debtors - creditors, 0))
        bank_loan = R(total * wc_pct)
        margin    = R(total - bank_loan)

        result.append({
            "year":          yr,
            "total":         total,
            "bank_loan":     bank_loan,
            "margin":        margin,
            "wc_interest":   R(bank_loan * int_rate),
            "rm_stock":      rm_stock,
            "wip":           wip,
            "fg":            fg,
            "stock":         rm_stock,   # alias for backward compat
            "debtors":       debtors,
            "creditors":     creditors,
            "cash_reserve":   cash_reserve,
            "salary_float":   salary_float,
            "expense_float":  expense_float,
            "stock_days":    stock_days,
            "debtor_days":   debtor_days,
            "creditor_days": creditor_days,
            "wip_days":      wip_days,
            "fg_days":       fg_days,
        })

    return result
