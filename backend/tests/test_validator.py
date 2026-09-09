"""Tests for calculations/validator.py — the report-generation validator
whose warnings/errors are surfaced directly to the user via the
/api/v1/report/generate response's `validation_warnings` field.

V1 REGRESSION: schemes/router.py's scheme_data["project_cost"] deliberately
INCLUDES the promoter's own working-capital margin (project_cost =
fixed_project_cost + wc_margin — see router.py's _compute_project_cost
docstring), while every scheme's 3-way MoF split (promoter + subsidy +
term loan) is computed purely against fixed_project_cost and never touches
wc_margin. V1 used to compare mof_total against project_cost, which is off
by wc_margin on literally every application that has any working-capital
requirement — a false "MoF must reconcile" error shown to the user on an
otherwise-healthy report. Fixed to compare against fixed_project_cost.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from calculations.validator import validate_report, ValidationError


def _scheme_data(**overrides):
    base = {
        "promoter_amount": 105450,
        "term_loan": 1265400,
        "margin_money": 738150,
        "fixed_project_cost": 2109000,   # promoter + term_loan + margin_money
        "wc_margin": 80156,              # promoter's own WC contribution — NOT in the MoF split
        "wc_loan": 320625,
        "project_cost": 2189156,         # = fixed_project_cost + wc_margin (by design)
    }
    base.update(overrides)
    return base


def _minimal_income_row():
    """Minimal income-statement row that clears CHECK 3/4/5 on its own —
    tests below only care about V1/V5, not these unrelated checks."""
    return {"year": 1, "revenue": 100.0, "profit_before_tax": 0.0, "tax": 0.0,
            "pat": 0.0, "depreciation": 0.0, "cash_accruals": 0.0, "capacity": 0.5}


def _minimal_report_data(scheme_data, income=None):
    return {
        "scheme_data":      scheme_data,
        "income_statement": income if income is not None else [_minimal_income_row()],
        "dscr":             {"years": []},
        "balance_sheet":    [],
        "sensitivity":      [],
        "depreciation":     {},
        "wc_schedule":      [],
        "loan_schedule":    [],
        "input":            {},
    }


class TestV1MeansOfFinanceReconciliation:
    def test_healthy_application_with_wc_margin_does_not_false_positive(self):
        """The exact regression case: a real application with a nonzero
        wc_margin (the normal case for virtually every project) must NOT
        trigger V1, since MoF (promoter+subsidy+TL) correctly reconciles
        to fixed_project_cost, not the WC-inclusive project_cost."""
        report_data = _minimal_report_data(_scheme_data())
        # V1 is error-level (raises ValidationError) — the call must not raise.
        validate_report(report_data)

    def test_zero_wc_margin_still_reconciles(self):
        scheme_data = _scheme_data(wc_margin=0, project_cost=2109000)
        report_data = _minimal_report_data(scheme_data)
        validate_report(report_data)

    def test_genuine_mof_drift_is_still_caught(self):
        """A REAL mismatch — e.g. promoter_amount corrupted/wrong — must
        still raise V1. The fix must not silence genuine drift."""
        scheme_data = _scheme_data(promoter_amount=999999)  # now genuinely wrong
        report_data = _minimal_report_data(scheme_data)
        with pytest.raises(ValidationError) as exc:
            validate_report(report_data)
        assert "V1 FAIL" in str(exc.value)

    def test_large_wc_margin_does_not_false_positive(self):
        """Larger WC margins (bigger working-capital-heavy projects) must
        not scale up the old false-positive gap."""
        scheme_data = _scheme_data(wc_margin=500000, project_cost=2609000)
        report_data = _minimal_report_data(scheme_data)
        validate_report(report_data)


class TestV5DscrMessageIsActionable:
    def test_dscr_failure_message_does_not_blame_a_fixed_bug(self):
        """The V5 message used to say 'likely RM is calculated from
        grossMarginPct instead of unit costs' — that bug was already fixed
        elsewhere (income_statement.py's BUG 1 FIX), so blaming it again
        here is stale and misleading. The message must give real CA
        guidance instead."""
        scheme_data = _scheme_data()
        report_data = _minimal_report_data(scheme_data)
        report_data["dscr"] = {"years": [
            {"year": 1, "dscr": -3.71, "total_b": 100000},
        ]}
        with pytest.raises(ValidationError) as exc:
            validate_report(report_data)
        message = str(exc.value)
        assert "V5 FAIL" in message
        assert "grossMarginPct" not in message
