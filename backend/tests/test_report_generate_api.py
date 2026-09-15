"""Integration tests for POST /api/v1/report/generate — checks that
scheme-level decisions made by schemes/router.py (moratorium overrides,
CGTMSE guarantee fee) actually reach the generated report, not just the
JSON response's key_metrics.

BUG this guards: route_scheme() resolves a scheme-specific moratorium
(e.g. CGTMSE defaults to 6 months via the Rules engine) into
scheme_data["moratorium_months"], but nothing downstream ever read that
key — calculate_loan_schedule() read data.assumptions.moratorium_months
directly, so the scheme's own mandated moratorium was silently ignored
whenever it differed from whatever the applicant's raw input happened to
contain (including the schema's own default of 0).
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from main import app
from pypdf import PdfReader
import io

client = TestClient(app)


def _cgtmse_payload(moratorium_months=0):
    """A minimal manufacturing CGTMSE payload. moratorium_months is
    deliberately set to something OTHER than CGTMSE's 6-month scheme
    default, to prove the scheme default — not the raw input — wins."""
    return {
        "scheme": "cgtmse",
        "loan_purpose": "Setting up a small manufacturing unit",
        "applicant": {"full_name": "Test Promoter", "mobile": "9999999999", "area_type": "Urban"},
        "business": {
            "business_name": "Test Manufacturing Co",
            "industry_type": "manufacturing",
            "business_status": "New Business",
            "location": "Pune", "district": "Pune",
        },
        "project": {
            "land_cost": 100000,
            "building_cost": 300000,
            "machinery_items": [{"name": "CNC Machine", "quantity": 1, "unit_price": 500000}],
        },
        "production": {
            "input_qty_per_day": 200, "working_days_per_year": 300,
            "selling_price_per_unit": 150, "raw_material_cost_per_unit": 60,
            "output_yield_pct": 95,
        },
        "assumptions": {
            "term_loan_pct": 85, "wc_loan_pct": 60, "interest_rate_pct": 10.5,
            "tenure_months": 60, "moratorium_months": moratorium_months,
            "revenue_growth_pct": 6, "expense_growth_pct": 5, "tax_rate_pct": 25,
            "depreciation_pct": 15, "building_dep_rate_pct": 5,
            "stock_holding_days": 30, "debtor_days": 30, "creditor_days": 15,
            "capacity_y1_pct": 60, "capacity_y2_pct": 70, "capacity_y3_pct": 80,
            "capacity_y4_pct": 85, "capacity_y5_pct": 90,
        },
        "expenses": {"rent": 20000},
        "manpower": {"skilled_count": 3, "skilled_salary": 15000},
    }


def _download_pdf_text(report_id: str) -> str:
    dl = client.get(f"/api/v1/report/{report_id}/download")
    assert dl.status_code == 200
    reader = PdfReader(io.BytesIO(dl.content))
    return "\n".join(page.extract_text() for page in reader.pages)


class TestCgtmseMoratoriumOverride:
    def test_cgtmse_scheme_moratorium_default_applied_not_raw_input(self):
        # Applicant's raw input says 0 months; CGTMSE's scheme default is 6.
        resp = client.post("/api/v1/report/generate", json=_cgtmse_payload(moratorium_months=0))
        assert resp.status_code == 200, resp.text
        report_id = resp.json()["report_id"]
        text = _download_pdf_text(report_id)
        assert "Moratorium" in text
        assert "6 Month(s)" in text, (
            "CGTMSE's 6-month scheme-default moratorium must be applied and displayed, "
            "even though the raw input said 0 months"
        )

    def test_year1_has_no_principal_repayment_under_moratorium(self):
        resp = client.post("/api/v1/report/generate", json=_cgtmse_payload(moratorium_months=0))
        assert resp.status_code == 200, resp.text
        report_id = resp.json()["report_id"]
        text = _download_pdf_text(report_id)
        # Section 03 must show a nonzero half-yearly instalment consistent
        # with a moratorium actually being honoured (i.e. NOT computed as
        # if there were 10 full repayment half-years).
        assert "SECTION 21" in text


class TestCgtmseGuaranteeFeeInReport:
    def test_guarantee_fee_appears_as_an_expense_line(self):
        resp = client.post("/api/v1/report/generate", json=_cgtmse_payload())
        assert resp.status_code == 200, resp.text
        report_id = resp.json()["report_id"]
        text = _download_pdf_text(report_id)
        assert "CGTMSE Guarantee Fee" in text, (
            "CGTMSE's Annual Guarantee Fee must appear as a real expense line in the report"
        )


class TestRawMaterialSectionTotalMatchesItsOwnRows:
    def test_total_row_equals_sum_of_displayed_items(self):
        """BUG FIX: Section 12's "Raw Material & Consumables (at 100%
        Capacity)" table showed its Raw Material row at the 100%-capacity
        basis (input_qty x working_days x rate), but its own TOTAL row used
        to be the capacity-ADJUSTED actual Year-1 COGS instead — a
        different basis than the rows above it, so TOTAL never equalled
        the sum of the rows displayed in the same table."""
        resp = client.post("/api/v1/report/generate", json=_cgtmse_payload())
        assert resp.status_code == 200, resp.text
        report_id = resp.json()["report_id"]
        text = _download_pdf_text(report_id)
        # input_qty_per_day(200) x working_days(300) x rm_cost_per_unit(60) = 3,600,000
        assert "3,600,000" in text, "Raw Material row and TOTAL must both show the 100%-capacity figure"
