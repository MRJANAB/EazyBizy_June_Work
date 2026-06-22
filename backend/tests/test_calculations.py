"""
CA-grade unit tests for all financial calculation modules.

Run:  python -m pytest backend/tests/test_calculations.py -v
      (from project root) or:
      cd backend && python -m pytest tests/test_calculations.py -v
"""
import sys, os, math, types
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from core.engine import R, calc_emi, dscr_label, recommendation


# ─────────────────────────────────────────────────────────────────────────────
# Helpers & fixtures
# ─────────────────────────────────────────────────────────────────────────────

def _make_assumptions(**kwargs):
    d = {
        "interest_rate_pct": 10.5,
        "tenure_months": 60,
        "moratorium_months": 0,
        "revenue_growth_pct": 7.0,
        "expense_growth_pct": 5.0,
        "salary_increase_pct": 10.0,
        "tax_rate_pct": 25.0,
        "depreciation_pct": 10.0,
        "building_dep_rate_pct": 5.0,
        "capacity_y1_pct": 50.0,
        "capacity_y2_pct": 60.0,
        "capacity_y3_pct": 70.0,
        "capacity_y4_pct": 75.0,
        "capacity_y5_pct": 80.0,
        "stock_holding_days": 30,
        "debtor_days": 30,
        "creditor_days": 15,
        "wip_days": 15,
        "fg_days": 30,
        "wc_loan_pct": 60.0,
    }
    d.update(kwargs)
    obj = types.SimpleNamespace(**d)
    return obj


def _make_production(**kwargs):
    d = {
        "input_qty_per_day": 100,
        "output_yield_pct": 100,
        "working_days_per_year": 300,
        "selling_price_per_unit": 500,
        "raw_material_cost_per_unit": 200,
    }
    d.update(kwargs)
    return types.SimpleNamespace(**d)


def _make_project(**kwargs):
    d = {
        "building_cost": 500000,
        "land_cost": 0,
        "preliminary_expenses": 50000,
        "tools_installation": 20000,
        "machinery_items": [
            types.SimpleNamespace(quantity=2, unit_price=300000),
        ],
    }
    d.update(kwargs)
    return types.SimpleNamespace(**d)


def _make_business(industry="manufacturing"):
    return types.SimpleNamespace(industry_type=industry)


def _make_data(industry="manufacturing", **overrides):
    assum = overrides.pop("assumptions", _make_assumptions())
    prod  = overrides.pop("production", _make_production())
    proj  = overrides.pop("project", _make_project())
    biz   = overrides.pop("business", _make_business(industry))
    manpower = overrides.pop("manpower", types.SimpleNamespace(
        skilled_count=2, skilled_salary=15000,
        semi_skilled_count=3, semi_skilled_salary=10000,
        unskilled_count=2, unskilled_salary=7000,
    ))
    expenses = overrides.pop("expenses", types.SimpleNamespace(
        raw_materials=0, electricity_water=5000, repair_maintenance=2000,
        transport_conveyance=3000, telephone_internet=1000,
        stationery=500, miscellaneous=1000, marketing=0,
        rent=0, monthly_rent=0,
    ))
    return types.SimpleNamespace(
        assumptions=assum, production=prod, project=proj,
        business=biz, manpower=manpower, expenses=expenses,
        **overrides,
    )


SCHEME_PMEGP = {
    "scheme": "pmegp",
    "term_loan": 1800000,
    "wc_loan": 120000,
    "promoter_amount": 200000,
    "promoter_pct": 10.0,
    "project_cost": 2000000,
    "margin_money": 0,
    "margin_money_pct": 0,
    "dscr_benchmark": 1.25,
}


# ─────────────────────────────────────────────────────────────────────────────
# 1. Loan Amortization
# ─────────────────────────────────────────────────────────────────────────────

class TestLoanSchedule:
    def test_returns_5_rows(self):
        from calculations.loan_schedule import calculate_loan_schedule
        data = _make_data()
        rows = calculate_loan_schedule(data, SCHEME_PMEGP)
        assert len(rows) == 5

    def test_principal_sums_to_term_loan(self):
        from calculations.loan_schedule import calculate_loan_schedule
        data = _make_data()
        rows = calculate_loan_schedule(data, SCHEME_PMEGP)
        tl = SCHEME_PMEGP["term_loan"]
        total_principal = sum(r["principal_paid"] for r in rows)
        assert abs(total_principal - tl) < 2, (
            f"Principal sum {total_principal} ≠ term loan {tl}"
        )

    def test_closing_balance_reaches_zero(self):
        from calculations.loan_schedule import calculate_loan_schedule
        data = _make_data()
        rows = calculate_loan_schedule(data, SCHEME_PMEGP)
        assert rows[-1]["closing_balance"] < 1  # last row closes out

    def test_opening_equals_previous_closing(self):
        from calculations.loan_schedule import calculate_loan_schedule
        data = _make_data()
        rows = calculate_loan_schedule(data, SCHEME_PMEGP)
        for i in range(1, len(rows)):
            prev_closing = rows[i-1]["closing_balance"]
            curr_opening = rows[i]["opening_balance"]
            assert abs(prev_closing - curr_opening) < 1, (
                f"Year {i+1}: opening {curr_opening} ≠ prev closing {prev_closing}"
            )

    def test_tenure_3_years_shows_only_3_active_rows(self):
        from calculations.loan_schedule import calculate_loan_schedule
        data = _make_data(assumptions=_make_assumptions(tenure_months=36))
        rows = calculate_loan_schedule(data, SCHEME_PMEGP)
        # rows 4 and 5 should be zeroes (padded)
        assert rows[3]["principal_paid"] == 0
        assert rows[4]["principal_paid"] == 0


# ─────────────────────────────────────────────────────────────────────────────
# 2. Depreciation
# ─────────────────────────────────────────────────────────────────────────────

class TestDepreciation:
    def test_annual_dep_is_positive(self):
        from calculations.depreciation import calculate_depreciation
        data = _make_data()
        dep = calculate_depreciation(data, SCHEME_PMEGP)
        assert dep["annual_dep"] > 0

    def test_slm_label_consistency(self):
        from calculations.depreciation import calculate_depreciation
        data = _make_data()
        dep = calculate_depreciation(data, SCHEME_PMEGP)
        # SLM: dep_building + dep_machinery = annual_dep
        assert abs(dep["dep_building_slm"] + dep["dep_machinery_slm"] - dep["annual_dep"]) < 1

    def test_gross_block_equals_building_plus_pm(self):
        from calculations.depreciation import calculate_depreciation
        data = _make_data()
        dep = calculate_depreciation(data, SCHEME_PMEGP)
        expected_gross = dep["building_gross"] + dep["pm_with_contingency"]
        assert abs(dep["gross_block"] - expected_gross) < 1


# ─────────────────────────────────────────────────────────────────────────────
# 3. Working Capital
# ─────────────────────────────────────────────────────────────────────────────

class TestWorkingCapital:
    def test_returns_5_years(self):
        from calculations.working_capital import calculate_wc_by_year
        data = _make_data()
        wc = calculate_wc_by_year(data, SCHEME_PMEGP)
        assert len(wc) == 5

    def test_creditor_days_reduce_wc(self):
        from calculations.working_capital import calculate_wc_by_year
        data_no_cred  = _make_data(assumptions=_make_assumptions(creditor_days=0))
        data_with_cred = _make_data(assumptions=_make_assumptions(creditor_days=30))
        wc_no  = calculate_wc_by_year(data_no_cred,   SCHEME_PMEGP)
        wc_yes = calculate_wc_by_year(data_with_cred, SCHEME_PMEGP)
        assert wc_yes[0]["total"] < wc_no[0]["total"], (
            "Positive creditor_days must reduce total WC requirement"
        )

    def test_service_business_has_no_stock(self):
        from calculations.working_capital import calculate_wc_by_year
        data = _make_data(industry="service")
        wc = calculate_wc_by_year(data, SCHEME_PMEGP)
        for yr in wc:
            assert yr["rm_stock"] == 0, "Service: RM stock must be 0"
            assert yr["wip"] == 0,     "Service: WIP must be 0"
            assert yr["fg"] == 0,      "Service: FG must be 0"

    def test_trading_has_no_wip(self):
        from calculations.working_capital import calculate_wc_by_year
        data = _make_data(industry="trading")
        wc = calculate_wc_by_year(data, SCHEME_PMEGP)
        for yr in wc:
            assert yr["wip"] == 0, f"Trading: WIP must be 0 (got {yr['wip']} in Year {yr['year']})"

    def test_total_equals_components_minus_creditors(self):
        from calculations.working_capital import calculate_wc_by_year
        data = _make_data()
        wc = calculate_wc_by_year(data, SCHEME_PMEGP)
        for yr in wc:
            expected = max(yr["rm_stock"] + yr["wip"] + yr["fg"] + yr["debtors"] - yr["creditors"], 0)
            assert abs(yr["total"] - expected) < 1, (
                f"Year {yr['year']}: WC total {yr['total']} ≠ components {expected}"
            )

    def test_bank_loan_plus_margin_equals_total(self):
        from calculations.working_capital import calculate_wc_by_year
        data = _make_data()
        wc = calculate_wc_by_year(data, SCHEME_PMEGP)
        for yr in wc:
            assert abs(yr["bank_loan"] + yr["margin"] - yr["total"]) < 1, (
                f"Year {yr['year']}: bank_loan + margin ≠ total"
            )


# ─────────────────────────────────────────────────────────────────────────────
# 4. Income Statement
# ─────────────────────────────────────────────────────────────────────────────

class TestIncomeStatement:
    def _get_income(self, **assum_kwargs):
        from calculations.depreciation import calculate_depreciation
        from calculations.loan_schedule import calculate_loan_schedule
        from calculations.working_capital import calculate_wc_by_year
        from calculations.income_statement import calculate_income_statement
        data = _make_data(assumptions=_make_assumptions(**assum_kwargs))
        dep = calculate_depreciation(data, SCHEME_PMEGP)
        loan = calculate_loan_schedule(data, SCHEME_PMEGP)
        wc = calculate_wc_by_year(data, SCHEME_PMEGP)
        return calculate_income_statement(data, SCHEME_PMEGP, dep, loan, wc)

    def test_returns_5_years(self):
        income = self._get_income()
        assert len(income) == 5

    def test_pbt_minus_tax_equals_pat(self):
        income = self._get_income()
        for yr in income:
            expected_pat = yr["profit_before_tax"] - yr["tax"]
            assert abs(yr["pat"] - expected_pat) < 1, (
                f"Year {yr['year']}: PAT {yr['pat']} ≠ PBT {yr['profit_before_tax']} - tax {yr['tax']}"
            )

    def test_tax_non_negative(self):
        income = self._get_income()
        for yr in income:
            assert yr["tax"] >= 0, f"Year {yr['year']}: Tax must be >= 0"

    def test_cash_accruals_equals_pat_plus_dep(self):
        income = self._get_income()
        for yr in income:
            expected = yr["pat"] + yr["depreciation"]
            assert abs(yr["cash_accruals"] - expected) < 1, (
                f"Year {yr['year']}: cash_accruals {yr['cash_accruals']} ≠ PAT+Dep {expected}"
            )

    def test_revenue_increases_with_growth(self):
        income = self._get_income(revenue_growth_pct=7.0)
        for i in range(1, 4):  # Years 2-4 (not 5 because cap schedule ends)
            assert income[i]["revenue"] >= income[i-1]["revenue"], (
                f"Year {income[i]['year']}: revenue should not decrease with positive growth"
            )

    def test_monthly_annual_cogs_reconcile(self):
        from calculations.depreciation import calculate_depreciation
        from calculations.loan_schedule import calculate_loan_schedule
        from calculations.working_capital import calculate_wc_by_year
        from calculations.income_statement import calculate_income_statement
        from calculations.monthly_pnl import calculate_monthly_pnl
        data = _make_data()
        dep  = calculate_depreciation(data, SCHEME_PMEGP)
        loan = calculate_loan_schedule(data, SCHEME_PMEGP)
        wc   = calculate_wc_by_year(data, SCHEME_PMEGP)
        income  = calculate_income_statement(data, SCHEME_PMEGP, dep, loan, wc)
        monthly = calculate_monthly_pnl(data, SCHEME_PMEGP, dep, loan, wc)
        # Monthly COGS × 12 should equal annual COGS (Year 1, same capacity)
        annual_cogs   = income[0]["cogs"]
        monthly_cogs12 = monthly["cogs_monthly"] * 12
        assert abs(annual_cogs - monthly_cogs12) < 100, (
            f"Monthly COGS×12 {monthly_cogs12} ≠ Annual COGS {annual_cogs} (gap > Rs.100)"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 5. DSCR
# ─────────────────────────────────────────────────────────────────────────────

class TestDSCR:
    def _get_dscr(self):
        from calculations.depreciation import calculate_depreciation
        from calculations.loan_schedule import calculate_loan_schedule
        from calculations.working_capital import calculate_wc_by_year
        from calculations.income_statement import calculate_income_statement
        from calculations.dscr import calculate_dscr
        data = _make_data()
        dep  = calculate_depreciation(data, SCHEME_PMEGP)
        loan = calculate_loan_schedule(data, SCHEME_PMEGP)
        wc   = calculate_wc_by_year(data, SCHEME_PMEGP)
        income = calculate_income_statement(data, SCHEME_PMEGP, dep, loan, wc)
        return calculate_dscr(income, loan, SCHEME_PMEGP)

    def test_dscr_y1_positive(self):
        dscr = self._get_dscr()
        assert dscr["dscr_y1"] > 0

    def test_avg_dscr_is_mean_of_years(self):
        dscr = self._get_dscr()
        active = [r["dscr"] for r in dscr["years"] if r.get("total_b", 0) > 0]
        expected_avg = R(sum(active) / len(active), 2) if active else 0
        assert abs(dscr["average"] - expected_avg) < 0.01

    def test_numerator_includes_tl_interest_not_wc(self):
        from calculations.depreciation import calculate_depreciation
        from calculations.loan_schedule import calculate_loan_schedule
        from calculations.working_capital import calculate_wc_by_year
        from calculations.income_statement import calculate_income_statement
        from calculations.dscr import calculate_dscr
        data = _make_data()
        dep  = calculate_depreciation(data, SCHEME_PMEGP)
        loan = calculate_loan_schedule(data, SCHEME_PMEGP)
        wc   = calculate_wc_by_year(data, SCHEME_PMEGP)
        income = calculate_income_statement(data, SCHEME_PMEGP, dep, loan, wc)
        dscr   = calculate_dscr(income, loan, SCHEME_PMEGP)
        yr1 = dscr["years"][0]
        expected_total_a = yr1["cash_accruals"] + yr1["tl_interest"]
        assert abs(yr1["total_a"] - expected_total_a) < 1


# ─────────────────────────────────────────────────────────────────────────────
# 6. Break-Even
# ─────────────────────────────────────────────────────────────────────────────

class TestBreakEven:
    def _get_bep(self):
        from calculations.depreciation import calculate_depreciation
        from calculations.loan_schedule import calculate_loan_schedule
        from calculations.working_capital import calculate_wc_by_year
        from calculations.income_statement import calculate_income_statement
        from calculations.break_even import calculate_break_even
        data = _make_data()
        dep  = calculate_depreciation(data, SCHEME_PMEGP)
        loan = calculate_loan_schedule(data, SCHEME_PMEGP)
        wc   = calculate_wc_by_year(data, SCHEME_PMEGP)
        income = calculate_income_statement(data, SCHEME_PMEGP, dep, loan, wc)
        return calculate_break_even(income, data, SCHEME_PMEGP)

    def test_returns_5_years(self):
        bep = self._get_bep()
        assert len(bep) == 5

    def test_bep_formula_correct(self):
        bep = self._get_bep()
        for yr in bep:
            if yr["contribution_pct"] > 0:
                expected_bep = yr["fixed_expenses"] / yr["contribution_pct"]
                assert abs(yr["bep_sales"] - expected_bep) < 10, (
                    f"Year {yr['year']}: BEP sales formula mismatch"
                )

    def test_contribution_equals_revenue_minus_variable(self):
        bep = self._get_bep()
        for yr in bep:
            expected = yr["revenue"] - yr["variable_expenses"]
            assert abs(yr["contribution"] - expected) < 1


# ─────────────────────────────────────────────────────────────────────────────
# 7. ROI Consistency
# ─────────────────────────────────────────────────────────────────────────────

class TestROI:
    def test_roi_ebitda_formula(self):
        from calculations.depreciation import calculate_depreciation
        from calculations.loan_schedule import calculate_loan_schedule
        from calculations.working_capital import calculate_wc_by_year
        from calculations.monthly_pnl import calculate_monthly_pnl
        data = _make_data()
        dep  = calculate_depreciation(data, SCHEME_PMEGP)
        loan = calculate_loan_schedule(data, SCHEME_PMEGP)
        wc   = calculate_wc_by_year(data, SCHEME_PMEGP)
        monthly = calculate_monthly_pnl(data, SCHEME_PMEGP, dep, loan, wc)
        tpc = float(SCHEME_PMEGP.get("project_cost", 1))
        expected_roi = R(monthly["annual_ebitda"] / tpc * 100, 2)
        assert abs(monthly["roi_ebitda_pct"] - expected_roi) < 0.1, (
            f"ROI EBITDA {monthly['roi_ebitda_pct']} ≠ expected {expected_roi}"
        )

    def test_roi_pat_formula(self):
        from calculations.depreciation import calculate_depreciation
        from calculations.loan_schedule import calculate_loan_schedule
        from calculations.working_capital import calculate_wc_by_year
        from calculations.monthly_pnl import calculate_monthly_pnl
        data = _make_data()
        dep  = calculate_depreciation(data, SCHEME_PMEGP)
        loan = calculate_loan_schedule(data, SCHEME_PMEGP)
        wc   = calculate_wc_by_year(data, SCHEME_PMEGP)
        monthly = calculate_monthly_pnl(data, SCHEME_PMEGP, dep, loan, wc)
        tpc = float(SCHEME_PMEGP.get("project_cost", 1))
        expected_roi = R(monthly["annual_pat"] / tpc * 100, 2)
        assert abs(monthly["roi_pat_pct"] - expected_roi) < 0.1


# ─────────────────────────────────────────────────────────────────────────────
# 8. Balance Sheet
# ─────────────────────────────────────────────────────────────────────────────

class TestBalanceSheet:
    def _get_bs(self):
        from calculations.depreciation import calculate_depreciation
        from calculations.loan_schedule import calculate_loan_schedule
        from calculations.working_capital import calculate_wc_by_year
        from calculations.income_statement import calculate_income_statement
        from calculations.balance_sheet import calculate_balance_sheet
        data = _make_data()
        dep  = calculate_depreciation(data, SCHEME_PMEGP)
        loan = calculate_loan_schedule(data, SCHEME_PMEGP)
        wc   = calculate_wc_by_year(data, SCHEME_PMEGP)
        income = calculate_income_statement(data, SCHEME_PMEGP, dep, loan, wc)
        return calculate_balance_sheet(data, SCHEME_PMEGP, income, dep, loan, wc)

    def test_balance_sheet_balances(self):
        bs = self._get_bs()
        for row in bs:
            diff = row.get("check", 999)
            assert abs(diff) < 2, (
                f"Year {row['year']}: BS out of balance by Rs.{diff:,.0f}"
            )

    def test_returns_6_rows_year0_to_year5(self):
        bs = self._get_bs()
        assert len(bs) == 6
        assert bs[0]["year"] == 0
        assert bs[-1]["year"] == 5

    def test_net_block_decreases_with_depreciation(self):
        bs = self._get_bs()
        for i in range(1, len(bs) - 1):
            assert bs[i+1]["net_block"] <= bs[i]["net_block"] + 1, (
                f"Net block should decrease Year {bs[i]['year']} → Year {bs[i+1]['year']}"
            )


# ─────────────────────────────────────────────────────────────────────────────
# 9. Sensitivity Analysis
# ─────────────────────────────────────────────────────────────────────────────

class TestSensitivity:
    def _get_sensitivity(self):
        from calculations.depreciation import calculate_depreciation
        from calculations.loan_schedule import calculate_loan_schedule
        from calculations.working_capital import calculate_wc_by_year
        from calculations.monthly_pnl import calculate_monthly_pnl
        from calculations.sensitivity import calculate_sensitivity
        data = _make_data()
        dep  = calculate_depreciation(data, SCHEME_PMEGP)
        loan = calculate_loan_schedule(data, SCHEME_PMEGP)
        wc   = calculate_wc_by_year(data, SCHEME_PMEGP)
        monthly = calculate_monthly_pnl(data, SCHEME_PMEGP, dep, loan, wc)
        return calculate_sensitivity(data, SCHEME_PMEGP, monthly), monthly

    def test_base_case_matches_live_model(self):
        sens, monthly = self._get_sensitivity()
        base = next(s for s in sens if s["scenario"] == "Base Case")
        assert abs(base["monthly_revenue"] - monthly["net_monthly_revenue"]) < 1, (
            "Sensitivity base case revenue must match live model"
        )

    def test_higher_revenue_gives_higher_profit(self):
        sens, _ = self._get_sensitivity()
        ordered = sorted(sens, key=lambda s: s["monthly_revenue"])
        for i in range(len(ordered) - 1):
            assert ordered[i]["monthly_profit"] <= ordered[i+1]["monthly_profit"] + 1, (
                "Higher revenue must give higher (or equal) profit in sensitivity"
            )

    def test_dscr_monotone_with_revenue(self):
        sens, _ = self._get_sensitivity()
        ordered = sorted(sens, key=lambda s: s["monthly_revenue"])
        for i in range(len(ordered) - 1):
            assert ordered[i]["dscr"] <= ordered[i+1]["dscr"] + 0.01, (
                "DSCR must be monotonically non-decreasing with revenue"
            )


# ─────────────────────────────────────────────────────────────────────────────
# 10. Business Type Engine
# ─────────────────────────────────────────────────────────────────────────────

class TestBusinessTypeEngine:
    def test_service_zero_cogs_ratio(self):
        from core.engine import get_industry_defaults
        ind = get_industry_defaults("service")
        assert ind["stock_days"] == 0

    def test_trading_high_cogs_ratio(self):
        from core.engine import get_industry_defaults
        ind = get_industry_defaults("trading")
        assert ind["cogs_ratio"] >= 0.65

    def test_manufacturing_has_wip(self):
        from calculations.working_capital import calculate_wc_by_year
        data = _make_data(industry="manufacturing",
                          assumptions=_make_assumptions(wip_days=15))
        wc = calculate_wc_by_year(data, SCHEME_PMEGP)
        assert wc[0]["wip"] > 0, "Manufacturing: WIP must be > 0 when wip_days > 0"

    def test_income_statement_switches_by_industry(self):
        from calculations.depreciation import calculate_depreciation
        from calculations.loan_schedule import calculate_loan_schedule
        from calculations.working_capital import calculate_wc_by_year
        from calculations.income_statement import calculate_income_statement
        # Manufacturing: uses unit-cost production (high RM ratio)
        mfg_data = _make_data(industry="manufacturing")
        # Service: no production unit costs — falls back to industry default ratio (10% COGS)
        svc_prod = _make_production(
            input_qty_per_day=0,            # service: no units
            raw_material_cost_per_unit=0,
            selling_price_per_unit=1200000, # monthly revenue = Rs.12L
        )
        svc_data = _make_data(
            industry="service",
            production=svc_prod,
            expenses=types.SimpleNamespace(
                raw_materials=0, electricity_water=2000, repair_maintenance=0,
                transport_conveyance=0, telephone_internet=1000, stationery=500,
                miscellaneous=500, marketing=0, rent=10000, monthly_rent=10000,
            ),
        )
        dep  = calculate_depreciation(mfg_data, SCHEME_PMEGP)
        loan = calculate_loan_schedule(mfg_data, SCHEME_PMEGP)
        wc   = calculate_wc_by_year(mfg_data, SCHEME_PMEGP)
        mfg_income = calculate_income_statement(mfg_data, SCHEME_PMEGP, dep, loan, wc)

        dep2  = calculate_depreciation(svc_data, SCHEME_PMEGP)
        loan2 = calculate_loan_schedule(svc_data, SCHEME_PMEGP)
        wc2   = calculate_wc_by_year(svc_data, SCHEME_PMEGP)
        svc_income = calculate_income_statement(svc_data, SCHEME_PMEGP, dep2, loan2, wc2)
        # Service COGS ratio (10%) must be lower than manufacturing COGS ratio (55%)
        svc_cogs_pct = svc_income[0]["cogs"] / svc_income[0]["revenue"]
        mfg_cogs_pct = mfg_income[0]["cogs"] / mfg_income[0]["revenue"]
        assert svc_cogs_pct < mfg_cogs_pct, (
            f"Service COGS% {svc_cogs_pct:.2%} must be < Manufacturing COGS% {mfg_cogs_pct:.2%}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 11. Engine helpers
# ─────────────────────────────────────────────────────────────────────────────

class TestEngineHelpers:
    def test_recommendation_no_strongly_approve(self):
        for score in [5.0, 6.5, 7.0, 8.5, 9.0, 10.0]:
            rec = recommendation(score)
            assert "STRONGLY" not in rec, (
                f"'STRONGLY APPROVE' must not appear in recommendation (score={score})"
            )

    def test_dscr_label_thresholds(self):
        assert dscr_label(2.0) == "Excellent"
        assert dscr_label(1.5) == "Very Good"
        assert dscr_label(1.25) == "Good"
        assert dscr_label(1.0) == "Acceptable"
        assert dscr_label(0.9) == "Poor"

    def test_R_rounds_correctly(self):
        assert R(1234.567, 0) == 1235
        assert R(1234.567, 2) == 1234.57
        assert R(0.0, 0) == 0.0

    def test_calc_emi_positive(self):
        emi = calc_emi(1000000, 10.5, 60)
        assert emi > 0
        # Total repayment should be more than principal (interest)
        assert emi * 60 > 1000000


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
