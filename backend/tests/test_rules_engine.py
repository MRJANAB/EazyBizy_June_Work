"""Unit tests for rules/engine.py — using a fake RulesClient (no network)."""

import pytest

from rules.cache import RulesCache
from rules.engine import RulesEngine, normalize_scheme_id
from rules.exceptions import MissingRuleError


class FakeClient:
    """In-memory stand-in for SupabaseRulesClient — returns canned rows."""

    def __init__(self, rows_by_key: dict[tuple[str, str], list[dict]]):
        self.rows_by_key = rows_by_key
        self.calls: list[tuple[str, str]] = []

    def fetch_rows(self, scheme_id, rule_key):
        self.calls.append((scheme_id, rule_key))
        return self.rows_by_key.get((scheme_id, rule_key), [])


def _row(scheme_id, value, active=True):
    return {"scheme_id": scheme_id, "bank_name": None, "value": value, "active": active}


def make_engine(rows_by_key):
    client = FakeClient(rows_by_key)
    return RulesEngine(client=client, cache=RulesCache()), client


class TestNormalizeSchemeId:
    def test_known_schemes_pass_through(self):
        assert normalize_scheme_id("pmegp") == "pmegp"
        assert normalize_scheme_id("MUDRA_SHISHU") == "mudra_shishu"

    def test_legacy_mudra_alias(self):
        assert normalize_scheme_id("mudra") == "mudra_kishor"

    def test_normal_msme_alias(self):
        assert normalize_scheme_id("normal_msme") == "msme_psu"

    def test_unknown_scheme_falls_back_to_default(self):
        assert normalize_scheme_id("some_future_scheme") == "default"

    def test_none_falls_back_to_default(self):
        assert normalize_scheme_id(None) == "default"


class TestGetRule:
    def test_exact_scheme_match(self):
        rows = {("pmegp", "scorecard_benchmarks"): [_row("pmegp", {"dscr_avg": 1.25})]}
        engine, _ = make_engine(rows)
        assert engine.get_rule("pmegp", "scorecard_benchmarks") == {"dscr_avg": 1.25}

    def test_falls_back_to_default_scheme_row(self):
        rows = {
            ("cgtmse", "scorecard_benchmarks"): [_row("default", {"dscr_avg": 1.25})],
        }
        engine, _ = make_engine(rows)
        assert engine.get_rule("cgtmse", "scorecard_benchmarks") == {"dscr_avg": 1.25}

    def test_raises_when_nothing_configured(self):
        engine, _ = make_engine({})
        with pytest.raises(MissingRuleError) as exc:
            engine.get_rule("pmegp", "scorecard_benchmarks")
        assert "pmegp" in str(exc.value)
        assert "scorecard_benchmarks" in str(exc.value)

    def test_use_default_fallback_false_does_not_fall_back(self):
        rows = {
            ("mudra_kishor", "moratorium_months_default"): [_row("default", {"default": 0})],
        }
        engine, _ = make_engine(rows)
        with pytest.raises(MissingRuleError):
            engine.get_rule("mudra_kishor", "moratorium_months_default", use_default_fallback=False)

    def test_inactive_row_is_ignored(self):
        rows = {("pmegp", "scorecard_benchmarks"): [_row("pmegp", {"dscr_avg": 1.25}, active=False)]}
        engine, _ = make_engine(rows)
        with pytest.raises(MissingRuleError):
            engine.get_rule("pmegp", "scorecard_benchmarks")

    def test_cache_avoids_second_fetch(self):
        rows = {("pmegp", "scorecard_benchmarks"): [_row("pmegp", {"dscr_avg": 1.25})]}
        engine, client = make_engine(rows)
        engine.get_rule("pmegp", "scorecard_benchmarks")
        engine.get_rule("pmegp", "scorecard_benchmarks")
        assert len(client.calls) == 1


class TestScorecardBenchmarks:
    def test_get_dscr_benchmark(self):
        rows = {("pmegp", "scorecard_benchmarks"): [_row("pmegp", {"dscr_avg": 1.25, "promoter_pct": 10.0})]}
        engine, _ = make_engine(rows)
        assert engine.get_dscr_benchmark("pmegp") == 1.25

    def test_dscr_benchmark_differs_by_scheme(self):
        rows = {
            ("mudra_shishu", "scorecard_benchmarks"): [_row("mudra_shishu", {"dscr_avg": 1.10})],
            ("msme_psu", "scorecard_benchmarks"): [_row("msme_psu", {"dscr_avg": 1.25})],
        }
        engine, _ = make_engine(rows)
        assert engine.get_dscr_benchmark("mudra_shishu") == 1.10
        assert engine.get_dscr_benchmark("msme_psu") == 1.25


class TestPmegpMarginMoney:
    def test_general_urban(self):
        rows = {
            ("pmegp", "margin_money_subsidy_pct"): [
                _row("pmegp", {"general_urban": 15, "general_rural": 25, "special_urban": 25, "special_rural": 35})
            ]
        }
        engine, _ = make_engine(rows)
        assert engine.get_margin_money_subsidy_pct("General", "Urban") == pytest.approx(0.15)

    def test_special_rural(self):
        rows = {
            ("pmegp", "margin_money_subsidy_pct"): [
                _row("pmegp", {"general_urban": 15, "general_rural": 25, "special_urban": 25, "special_rural": 35})
            ]
        }
        engine, _ = make_engine(rows)
        assert engine.get_margin_money_subsidy_pct("Special", "Rural") == pytest.approx(0.35)

    def test_missing_key_in_table_raises(self):
        rows = {("pmegp", "margin_money_subsidy_pct"): [_row("pmegp", {"general_urban": 15})]}
        engine, _ = make_engine(rows)
        with pytest.raises(MissingRuleError):
            engine.get_margin_money_subsidy_pct("Special", "Rural")


class TestPromoterContribution:
    def test_category_specific(self):
        rows = {("pmegp", "promoter_contribution_pct"): [_row("pmegp", {"general": 10, "special": 5})]}
        engine, _ = make_engine(rows)
        assert engine.get_promoter_contribution_pct("pmegp", "General") == pytest.approx(0.10)
        assert engine.get_promoter_contribution_pct("pmegp", "Special") == pytest.approx(0.05)

    def test_default_only_table(self):
        rows = {("mudra_kishor", "promoter_contribution_pct"): [_row("mudra_kishor", {"default": 10})]}
        engine, _ = make_engine(rows)
        assert engine.get_promoter_contribution_pct("mudra_kishor") == pytest.approx(0.10)


class TestTermLoanAndWcDefaults:
    def test_term_loan_pct_default(self):
        rows = {("cgtmse", "term_loan_pct_default"): [_row("cgtmse", {"default": 85})]}
        engine, _ = make_engine(rows)
        assert engine.get_term_loan_pct_default("cgtmse") == pytest.approx(0.85)

    def test_wc_loan_pct_default_falls_back_to_default_scheme(self):
        rows = {("pmegp", "wc_loan_pct_default"): [_row("default", {"default": 60})]}
        engine, _ = make_engine(rows)
        assert engine.get_wc_loan_pct_default("pmegp") == pytest.approx(0.60)

    def test_interest_rate_pct_default(self):
        rows = {("default", "interest_rate_pct_default"): [_row("default", {"default": 10.5})]}
        engine, _ = make_engine(rows)
        assert engine.get_interest_rate_pct_default() == pytest.approx(10.5)


class TestMoratorium:
    def test_scheme_with_override(self):
        rows = {("mudra_kishor", "moratorium_months_default"): [_row("mudra_kishor", {"default": 6})]}
        engine, _ = make_engine(rows)
        assert engine.get_moratorium_months_default("mudra_kishor") == 6.0

    def test_scheme_without_override_returns_none_not_error(self):
        engine, _ = make_engine({})
        assert engine.get_moratorium_months_default("pmegp") is None


class TestPromoterFloor:
    def test_msme_floor(self):
        rows = {("msme_psu", "promoter_floor_pct"): [_row("msme_psu", {"default": 10})]}
        engine, _ = make_engine(rows)
        assert engine.get_promoter_floor_pct("msme_psu") == pytest.approx(0.10)
