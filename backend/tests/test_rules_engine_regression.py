"""Regression tests: prove scheme calculators produce IDENTICAL output
after being wired to the Rules & Rates engine as they did with the old
hardcoded literals. These run with no SUPABASE_URL/ANON_KEY configured
(the default test environment), so the engine's offline seed fallback
(rules/seed_defaults.py) is what's actually exercised — which is deliberately
kept in sync with the values that used to be hardcoded in each scheme module.
"""
import types

from schemes.pmegp import calculate_pmegp_finance
from schemes.mudra import calculate_mudra_finance
from schemes.msme import calculate_msme_finance
from calculations.dscr import calculate_dscr


class TestPmegpRegression:
    def test_general_urban_split(self):
        # Old hardcoded values: promoter 10%, subsidy 15%, TL 75%
        result = calculate_pmegp_finance(2_000_000, "General", "Urban")
        assert result["promoter_pct"] == 10.0
        assert result["margin_money_pct"] == 15.0
        assert result["term_loan_pct"] == 75.0
        assert result["promoter_amount"] == 200_000
        assert result["margin_money"] == 300_000
        assert result["term_loan"] == 1_500_000

    def test_special_rural_split(self):
        # Old hardcoded values: promoter 5%, subsidy 35%, TL 60%
        result = calculate_pmegp_finance(1_000_000, "SC", "Rural")
        assert result["promoter_pct"] == 5.0
        assert result["margin_money_pct"] == 35.0
        assert result["term_loan_pct"] == 60.0


class TestMudraRegression:
    def test_kishor_promoter_pct_unchanged(self):
        # Old hardcoded value: 10% promoter for all Mudra tiers
        result = calculate_mudra_finance(400_000, "mudra_kishor")
        assert result["promoter_pct"] == 10.0
        assert result["promoter_amount"] == 40_000

    def test_shishu_promoter_pct_unchanged(self):
        result = calculate_mudra_finance(50_000, "mudra_shishu")
        assert result["promoter_pct"] == 10.0


class TestMsmeRegression:
    def _data(self, **assum_overrides):
        assum = types.SimpleNamespace(
            term_loan_pct=None, wc_loan_pct=None, interest_rate_pct=None, capital_subsidy_pct=0,
        )
        for k, v in assum_overrides.items():
            setattr(assum, k, v)
        project = types.SimpleNamespace(
            land_cost=0, building_cost=0, tools_installation=0, machinery_items=[],
        )
        return types.SimpleNamespace(assumptions=assum, project=project)

    def test_default_term_loan_75_pct_when_unset(self):
        # Old hardcoded default: term_loan_pct=75
        data = self._data()
        result = calculate_msme_finance(1_000_000, data)
        # net=1,000,000 (no subsidy); TL=75%=750,000; promoter=250,000 >= floor(100,000) -> unchanged
        assert result["term_loan_pct"] == 75.0
        assert result["promoter_pct"] == 25.0

    def test_default_wc_loan_60_pct_when_unset(self):
        data = self._data()
        result = calculate_msme_finance(1_000_000, data)
        assert result["wc_loan_pct"] == 60.0

    def test_default_interest_rate_10_5_when_unset(self):
        data = self._data()
        result = calculate_msme_finance(1_000_000, data)
        assert result["interest_rate_pct"] == 10.5

    def test_user_override_still_wins(self):
        data = self._data(term_loan_pct=80, wc_loan_pct=70, interest_rate_pct=11.5)
        result = calculate_msme_finance(1_000_000, data)
        assert result["term_loan_pct"] == 80.0
        assert result["wc_loan_pct"] == 70.0
        assert result["interest_rate_pct"] == 11.5

    def test_promoter_floor_10_pct_unchanged(self):
        # Old hardcoded floor: 10% of fixed project cost
        data = self._data(term_loan_pct=95)  # would breach floor if not capped
        result = calculate_msme_finance(1_000_000, data)
        assert result["promoter_amount"] >= 100_000  # 10% floor


class TestDscrBenchmarkRegression:
    """The BUG 8 FIX: report_status must use the scheme's own benchmark,
    not a hardcoded 1.25 — this is a genuine fix uncovered while wiring."""

    def _income_and_schedule(self, dscr_value: float):
        # Craft cash_accruals/interest/principal so DSCR works out to dscr_value exactly.
        principal, tl_interest = 100.0, 0.0
        cash_ac = dscr_value * principal
        income = [{"year": 1, "cash_accruals": cash_ac, "tl_interest": tl_interest}]
        loan_schedule = [{"principal_paid": principal}]
        return income, loan_schedule

    def test_mudra_shishu_1_15_passes_lower_benchmark(self):
        income, sched = self._income_and_schedule(1.15)
        result = calculate_dscr(income, sched, {"dscr_benchmark": 1.10})
        assert result["meets_benchmark"] is True
        assert result["report_status"] == "APPROVE"

    def test_pmegp_1_15_fails_higher_benchmark(self):
        income, sched = self._income_and_schedule(1.15)
        result = calculate_dscr(income, sched, {"dscr_benchmark": 1.25})
        assert result["meets_benchmark"] is False
        assert result["report_status"] == "REJECT"

    def test_missing_benchmark_falls_back_to_engine_default(self):
        income, sched = self._income_and_schedule(1.30)
        result = calculate_dscr(income, sched, {})
        assert result["benchmark"] == 1.25
        assert result["report_status"] == "APPROVE"
