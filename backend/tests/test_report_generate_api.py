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
import sys, os, re
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


class TestInterestCoverageMatchesEbitdaOverTotalInterest:
    def test_interest_coverage_uses_the_synced_ebitda_and_interest_not_a_stale_pre_sync_figure(self):
        """BUG FIX: a CA reviewer caught this on a live report — Section 29
        showed "Interest Coverage (EBITDA / Int) = 5.56x", but Section 14's
        own EBITDA (Rs.21,55,959), WC Interest (Rs.89,381) and Term Loan
        Interest (Rs.3,32,233) on the SAME report give EBITDA / (TL + WC
        interest) = 21,55,959 / 4,21,614 = 5.11x.

        Root cause: pdf/generator.py computed interest_coverage_y1 once,
        early, from calculate_monthly_pnl()'s own (pre-sync) EBITDA/interest
        figures — then never recomputed it after cma["ebitda_monthly"] and
        cma["monthly_int_y1"] were subsequently overwritten with the
        authoritative income_statement Year-1 figures (the same figures
        Section 14 displays). roi_ebitda_pct/roi_pat_pct/asset_turnover_y1
        were already re-synced at that point; interest_coverage_y1 was the
        one ratio left stale.
        """
        resp = client.post("/api/v1/report/generate", json=_cgtmse_payload())
        assert resp.status_code == 200, resp.text
        report_id = resp.json()["report_id"]
        text = _download_pdf_text(report_id)

        idx14 = text.find("SECTION 14")
        idx29 = text.find("SECTION 29")
        assert idx14 != -1 and idx29 != -1

        def _year1_value(label: str, section_text: str) -> float:
            i = section_text.find(label)
            assert i != -1, f"{label!r} row not found"
            after = section_text[i + len(label):]
            m = re.search(r"[\d,]+", after)
            return float(m.group(0).replace(",", ""))

        sec14 = text[idx14:idx29]
        ebitda_y1  = _year1_value("EBITDA", sec14)
        wc_int_y1  = _year1_value("Less: Interest on WC", sec14)
        tl_int_y1  = _year1_value("Less: Interest on Term Loan", sec14)
        expected_coverage = round(ebitda_y1 / (wc_int_y1 + tl_int_y1), 2)

        sec29 = text[idx29:]
        i = sec29.find("Interest Coverage")
        assert i != -1, "Interest Coverage row not found in Section 29"
        m = re.search(r"[\d.]+", sec29[i + len("Interest Coverage"):])
        displayed_coverage = float(m.group(0))

        assert displayed_coverage == expected_coverage, (
            f"Displayed Interest Coverage ({displayed_coverage}x) must equal "
            f"Section 14's own EBITDA / (TL + WC interest) = {expected_coverage}x"
        )


class TestSalesRealizationShowsTrue100PctCapacity:
    def test_manufacturing_products_table_scaled_to_100pct_not_year1_actual(self):
        """BUG FIX: Section 11's "Annual Sales Realization (Year 1, at 100%
        Capacity)" table, for a manufacturing/agriculture business with no
        real user-entered products list, fell back to pdf/generator.py's
        synthetic single-product fallback — whose units_per_month is the
        Year-1 ACTUAL (capacity-adjusted) quantity, not the 100%-capacity
        quantity the table's own header claims. Reported by a CA reviewer:
        a report showed "Quantity/month = 7,125" and "Rs.85.50L" under an
        "at 100% Capacity" heading, when the true 100%-capacity figures
        were 11,875 units/month and Rs.1,42,50,000.

        For this fixture: 100%-capacity output = 200/day x 300 days x 95%
        yield = 57,000 units/yr @ Rs.150 = Rs.85,50,000/yr (100% capacity),
        vs Year-1-actual (60% capacity) = Rs.51,30,000/yr. The table must
        show the former, not the latter.

        The synthetic fallback product's "category" is set from
        business.nature_of_business — that field must be non-empty (as a
        real applicant's would be) to reproduce the branch the bug lived
        in; the shared fixture leaves it blank, so it's set here.
        """
        payload = _cgtmse_payload()
        payload["business"]["nature_of_business"] = "Precision Machining of Automotive Components"
        resp = client.post("/api/v1/report/generate", json=payload)
        assert resp.status_code == 200, resp.text
        report_id = resp.json()["report_id"]
        text = _download_pdf_text(report_id)
        idx = text.find("Annual Sales Realization")
        end = text.find("Revenue Build-Up", idx)
        assert idx != -1 and end != -1, "Section 11 sales realization table not found"
        section = text[idx:end]
        assert "4,750" in section, (
            "Quantity/Month must be scaled up to the true 100%-capacity figure (4,750), "
            "not the Year-1-actual (60%-capacity) quantity (2,850)"
        )
        assert "8,550,000" in section, (
            "Annual Sales Realization table must show the true 100%-capacity "
            "annual revenue (Rs.85,50,000), not the Year-1-actual (60%-capacity) figure"
        )
        assert "5,130,000" not in section, (
            "Annual Sales Realization table must not show the Year-1-actual "
            "(60%-capacity) revenue under a heading that claims 100% capacity"
        )
