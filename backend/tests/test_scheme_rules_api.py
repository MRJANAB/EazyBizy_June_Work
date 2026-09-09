"""API tests for GET /api/v1/report/schemes/{scheme_id}/rules.

Verifies the endpoint's financing-split numbers (subsidy_matrix,
promoter_contribution_pct, term_loan_pct_default, etc.) are sourced from
the Rules & Rates engine — i.e. identical to what schemes/*.py computes
for the actual PDF — rather than a second hardcoded copy.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def _rules_for(scheme_id: str) -> dict:
    resp = client.get(f"/api/v1/report/schemes/{scheme_id}/rules")
    assert resp.status_code == 200
    return resp.json()["rules"]


class TestPmegpSchemeRules:
    def test_subsidy_matrix_matches_engine(self):
        rules = _rules_for("pmegp")
        matrix = rules["subsidy_matrix"]
        assert matrix["General_Urban"] == {"promoter_pct": 10.0, "subsidy_pct": 15.0}
        assert matrix["General_Rural"] == {"promoter_pct": 10.0, "subsidy_pct": 25.0}
        assert matrix["Special_Urban"] == {"promoter_pct": 5.0, "subsidy_pct": 25.0}
        assert matrix["Special_Rural"] == {"promoter_pct": 5.0, "subsidy_pct": 35.0}

    def test_dscr_benchmark_present(self):
        assert _rules_for("pmegp")["dscr_benchmark"] == 1.25


class TestMudraSchemeRules:
    def test_shishu_lower_dscr_benchmark(self):
        rules = _rules_for("mudra_shishu")
        assert rules["dscr_benchmark"] == 1.10
        assert rules["moratorium_months_default"] == 0.0

    def test_kishor_promoter_and_moratorium(self):
        rules = _rules_for("mudra_kishor")
        assert rules["promoter_contribution_pct"] == 10.0
        assert rules["moratorium_months_default"] == 6.0

    def test_tarun_higher_dscr_benchmark(self):
        rules = _rules_for("mudra_tarun")
        assert rules["dscr_benchmark"] == 1.25


class TestCgtmseSchemeRules:
    def test_term_loan_and_moratorium(self):
        rules = _rules_for("cgtmse")
        assert rules["term_loan_pct_default"] == 85.0
        assert rules["moratorium_months_default"] == 6.0


class TestMsmeSchemeRules:
    def test_all_financing_defaults_present(self):
        rules = _rules_for("msme_psu")
        assert rules["term_loan_pct_default"] == 75.0
        assert rules["wc_loan_pct_default"] == 60.0
        assert rules["interest_rate_pct_default"] == 10.5
        assert rules["promoter_floor_pct"] == 10.0
        assert rules["benchmarks"]["promoter_pct"] == 20.0


class TestUnknownScheme:
    def test_404(self):
        resp = client.get("/api/v1/report/schemes/not_a_real_scheme/rules")
        assert resp.status_code == 404


class TestSchemeIdAliases:
    """The frontend's GTABLoanScheme type uses 'mudra' and 'normal_msme' —
    these must resolve to the same rows the calculation engine uses
    (rules.normalize_scheme_id), not 404."""

    def test_bare_mudra_resolves_to_kishor(self):
        resp = client.get("/api/v1/report/schemes/mudra/rules")
        assert resp.status_code == 200
        body = resp.json()
        assert body["scheme_id"] == "mudra_kishor"
        assert body["rules"]["promoter_contribution_pct"] == 10.0

    def test_normal_msme_resolves_to_msme_psu(self):
        resp = client.get("/api/v1/report/schemes/normal_msme/rules")
        assert resp.status_code == 200
        body = resp.json()
        assert body["scheme_id"] == "msme_psu"
        assert body["rules"]["promoter_floor_pct"] == 10.0
