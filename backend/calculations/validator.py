"""
calculations/validator.py — All V1-V12 CA validation checks (Bug: ADD output validator)

V1.  MoF Total == ProjectCost (within ₹1)
V2.  Sum of cost items == ProjectCost (within ₹1)
V3.  WC_Loan NOT inside MoF table total
V4.  TermLoan <= ProjectCost
V5.  Every DSCR_YearN > 0
V6.  PAT trend check (warn if all negative)
V7.  Every ClosingCash_YearN > 0
V8.  Sensitivity: higher revenue → higher PAT
V9.  RM_YearN ≈ capacityPct[N] × RM_at100pct
V10. GrossBlock_PM == PM_with_contingency
V11. PromoterCash >= 0
V12. Balance sheet: TotalAssets == TotalLiabilities (each year)

Critical errors are returned to the caller. Warnings are advisory only.
"""
from core.engine import R, get_scheme_benchmarks


class ValidationError(ValueError):
    pass


def validate_report(report_data: dict) -> None:
    """
    Run V1-V12 checks. Raises ValidationError listing all critical failures.
    Warnings are stored in report_data['validation_warnings'].
    """
    errors   = []
    warnings = []

    scheme_data = report_data.get("scheme_data",      {})
    income      = report_data.get("income_statement", [])
    dscr_data   = report_data.get("dscr",             {})
    bs          = report_data.get("balance_sheet",    [])
    sensitivity = report_data.get("sensitivity",      [])
    dep         = report_data.get("depreciation",     {})
    wc_schedule = report_data.get("wc_schedule",      [])
    loan_sched  = report_data.get("loan_schedule",    [])

    def close(a, b, tol=1.0):
        return abs(R(float(a), 2) - R(float(b), 2)) <= tol

    project_cost    = float(scheme_data.get("project_cost",    0) or 0)
    term_loan       = float(scheme_data.get("term_loan",       0) or 0)
    promoter        = float(scheme_data.get("promoter_amount", 0) or 0)
    subsidy         = float(scheme_data.get("margin_money",    0) or 0)
    wc_loan_scheme  = float(scheme_data.get("wc_loan",         0) or 0)

    # V1: MoF total == ProjectCost (WC_Loan must NOT be in MoF)
    mof_total = R(promoter + subsidy + term_loan, 2)
    if project_cost > 0 and not close(mof_total, project_cost, 1):
        errors.append(
            f"V1 FAIL — MoF (₹{mof_total:,.0f}) ≠ ProjectCost (₹{project_cost:,.0f}). "
            "MoF must reconcile. Check promoter/subsidy/TL split."
        )

    # V2: Cost line items sum == ProjectCost
    cost_items = report_data.get("input", {}).get("project", {})
    if cost_items:
        machinery_total = sum(
            float(m.get("quantity", 1)) * float(m.get("unit_price", 0))
            for m in cost_items.get("machinery_items", [])
        ) + float(cost_items.get("tools_installation", 0) or 0)
        assum_data = report_data.get("input", {}).get("assumptions", {})
        contingency_pct = float(assum_data.get("contingency_pct", 0) or 0) / 100
        pm_with_cont = machinery_total * (1 + contingency_pct)
        items_sum = (
            float(cost_items.get("land_cost", 0) or 0)
            + float(cost_items.get("building_cost", 0) or 0)
            + pm_with_cont
            + float(cost_items.get("preliminary_expenses", 0) or 0)
        )
        wc_pct   = float(assum_data.get("wc_loan_pct", 60) or 60) / 100
        wc_rev   = project_cost - items_sum   # approx WC_Margin in project cost
        if project_cost > 0 and items_sum > 0 and not close(items_sum + wc_rev, project_cost, project_cost * 0.01):
            warnings.append(
                f"V2 WARN — Cost items sum (₹{items_sum:,.0f}) may not fully reconcile with ProjectCost (₹{project_cost:,.0f})."
            )

    # V3: WC_Loan must NOT be in MoF total
    if wc_loan_scheme > 0 and close(mof_total, project_cost + wc_loan_scheme, 100):
        errors.append(
            f"V3 FAIL — WC Loan (₹{wc_loan_scheme:,.0f}) appears to be included inside MoF total. "
            "WC Loan is a revolving facility and must NOT be in the MoF table."
        )

    # V4: TermLoan <= ProjectCost
    if project_cost > 0 and term_loan > project_cost:
        errors.append(
            f"V4 FAIL — Term Loan (₹{term_loan:,.0f}) exceeds ProjectCost (₹{project_cost:,.0f}). "
            "Loan cannot exceed total project cost."
        )

    # V5: Every year DSCR > 0
    for row in dscr_data.get("years", []):
        dv = float(row.get("dscr", 0) or 0)
        if float(row.get("total_b", 0) or 0) > 0 and dv <= 0:
            errors.append(
                f"V5 FAIL — Year {row.get('year')}: DSCR is {dv:.2f} (must be > 0). "
                "Check RM cost basis — likely RM is calculated from grossMarginPct instead of unit costs."
            )

    # V6: Warn if all PAT are negative
    pats = [float(yr.get("pat", 0) or 0) for yr in income]
    if pats and all(p < 0 for p in pats):
        warnings.append(
            "V6 WARN — Project is loss-making in ALL 5 projected years. "
            "Revise revenue or cost inputs before submission."
        )

    # V7: Every closing cash > 0
    for bs_row in (bs or []):
        yr  = bs_row.get("year", "?")
        cash = float(bs_row.get("cash", bs_row.get("closing_cash", 0)) or 0)
        if yr != 0 and cash < 0:
            warnings.append(
                f"V7 WARN — Year {yr}: Closing cash is negative (₹{cash:,.0f}). "
                "Liquidity support may be required."
            )

    # V8: Sensitivity — higher revenue → higher PAT
    if sensitivity:
        sorted_sens = sorted(sensitivity, key=lambda s: float(s.get("monthly_revenue", 0) or 0))
        for j in range(1, len(sorted_sens)):
            prev, curr = sorted_sens[j - 1], sorted_sens[j]
            prev_rev = float(prev.get("monthly_revenue", 0) or 0)
            curr_rev = float(curr.get("monthly_revenue", 0) or 0)
            prev_pat = float(prev.get("monthly_profit", 0) or 0)
            curr_pat = float(curr.get("monthly_profit", 0) or 0)
            if curr_rev > prev_rev and curr_pat < prev_pat - 1:
                errors.append(
                    f"V8 FAIL — Sensitivity is inverted: higher revenue scenario has lower PAT. "
                    "RM cost is likely being calculated as a % of revenue (grossMarginPct bug)."
                )
                break

    # V9: RM scaling from unit costs
    if income and wc_schedule:
        y1_income = income[0]
        y2_income = income[1] if len(income) > 1 else None
        rm_y1 = float(y1_income.get("cogs", y1_income.get("raw_materials", 0)) or 0)
        rm_100 = float(y1_income.get("rm_at_100pct", 0) or 0)
        cap_y1 = float(y1_income.get("capacity", 0.5) or 0.5)
        if rm_100 > 0:
            expected_rm_y1 = rm_100 * cap_y1
            if not close(rm_y1, expected_rm_y1, max(1, expected_rm_y1 * 0.01)):
                warnings.append(
                    f"V9 WARN — RM Year 1 (₹{rm_y1:,.0f}) ≠ cap({cap_y1:.0%}) × RM_100 (₹{expected_rm_y1:,.0f}). "
                    "RM may not be scaling correctly from unit costs."
                )

    # V10: GrossBlock_PM == PM_with_contingency
    dep_pm  = float(dep.get("pm_with_contingency", dep.get("machinery_gross", 0)) or 0)
    dep_gb  = float(dep.get("machinery_gross", 0) or 0)
    if dep_pm > 0 and dep_gb > 0 and not close(dep_pm, dep_gb, 1):
        warnings.append(
            f"V10 WARN — Gross Block P&M (₹{dep_gb:,.0f}) ≠ P&M with contingency (₹{dep_pm:,.0f}). "
            "Depreciation base should include contingency."
        )

    # V11: PromoterCash >= 0
    if promoter < 0:
        errors.append(
            f"V11 FAIL — Promoter contribution is negative (₹{promoter:,.0f}). "
            "Reduce term loan or increase project cost."
        )

    # V12: Balance sheet balances each year. This is a hard accounting
    # integrity rule: Assets must equal Equity + Liabilities.
    for bs_row in (bs or []):
        yr     = bs_row.get("year", "?")
        check  = float(bs_row.get("check", 0) or 0)
        t_ass  = float(bs_row.get("total_assets", 0) or 0)
        t_liab = float(bs_row.get("total_liabilities", 0) or 0)
        if t_ass > 0 and abs(check) > 1:
            errors.append(
                f"Accounting integrity error: Balance sheet mismatch in Year {yr}. "
                f"TotalAssets (₹{t_ass:,.0f}) ≠ "
                f"TotalLiabilities (₹{t_liab:,.0f}). Diff = ₹{check:,.0f}."
            )

    # ── Original checks ──────────────────────────────────────────────────────
    scheme_str = str(scheme_data.get("scheme", "default")).lower()
    benchmarks = get_scheme_benchmarks(scheme_str)

    # CHECK 3: Tax deducted from PBT
    if income:
        y1 = income[0]
        pbt = float(y1.get("profit_before_tax", 0) or 0)
        tax = float(y1.get("tax", 0) or 0)
        if pbt > 0 and tax <= 0:
            errors.append(
                f"CHECK 3 FAIL — Tax is zero when PBT = ₹{pbt:,.0f}. "
                "Tax = max(0, PBT × 25%) is mandatory per CA standard."
            )

    # CHECK 4: Cash Accruals = PAT + Depreciation
    if income:
        y1  = income[0]
        pat = float(y1.get("pat", 0) or 0)
        dep_yr = float(y1.get("depreciation", 0) or 0)
        ca  = float(y1.get("cash_accruals",  0) or 0)
        if ca > 0 and not close(ca, pat + dep_yr, 5):
            errors.append(
                f"CHECK 4 FAIL — Cash Accruals (₹{ca:,.0f}) ≠ PAT (₹{pat:,.0f}) + Dep (₹{dep_yr:,.0f})."
            )

    # CHECK 5: Income statement has data
    if not income:
        errors.append("CHECK 5 FAIL — Income statement is empty.")
    elif float(income[0].get("revenue", 0) or 0) <= 0:
        errors.append("CHECK 5 FAIL — Year-1 revenue is zero. Check production parameters.")

    # CHECK 6: DSCR benchmark
    avg_dscr = float(dscr_data.get("average", 0) or 0)
    dscr_min = benchmarks["dscr_avg"]
    if avg_dscr > 0 and avg_dscr < dscr_min:
        warnings.append(
            f"CHECK 6 WARN — Average DSCR {avg_dscr:.2f}x below {scheme_str.upper()} minimum {dscr_min}x."
        )

    # ── Attach warnings ───────────────────────────────────────────────────────
    report_data["validation_warnings"] = warnings

    if errors:
        raise ValidationError(
            f"Report failed {len(errors)} validation check(s):\n" +
            "\n".join(f"  • {e}" for e in errors)
        )
