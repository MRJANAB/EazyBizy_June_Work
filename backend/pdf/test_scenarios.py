
import os
import sys
from datetime import datetime

# Add the current and backend directory to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))

from pdf.generator import generate_pdf

def get_mock_data(industry="manufacturing"):
    """Generate mock report data for testing."""
    return {
        "input_parameters": {
            "entrepreneur_name": f"Test {industry.capitalize()} User",
            "business_name": f"{industry.capitalize()} Demo Biz",
            "industry": industry,
            "nature_of_business": "Product Manufacturing" if industry == "manufacturing" else "Trading/Services",
            "expected_employment": 10,
            "num_employees": 10,
            "salary_per_employee": 15000,
            "working_days_per_year": 300,
            "term_loan_amount": 500000,
            "term_loan_interest": 10.5,
            "loan_tenure_years": 5,
            "scheme": "PMEGP",
            "rent": 20000,
        },
        "monthly_pnl": {
            "net_monthly_revenue": 200000,
            "ebitda_monthly": 50000,
            "ebitda_margin_pct": 25.0,
            "pbt_monthly": 40000,
            "tax_monthly": 10000,
            "pat_monthly": 30000,
            "surplus_monthly": 20000,
            "annual_revenue": 2400000,
            "cogs_monthly": 100000,
            "variable_total": 20000,
            "fixed_total": 30000,
            "monthly_dep": 5000,
            "monthly_int_y1": 3000,
            "monthly_principal": 7000,
            "breakeven_months": 12.5,
        },
        "income_statement": [
            {
                "year": y,
                "revenue": 2400000 * (1.1 ** (y-1)),
                "cogs": 1200000 * (1.1 ** (y-1)),
                "labour": 180000 * (1.05 ** (y-1)),
                "ebitda": 600000 * (1.1 ** (y-1)),
                "net_profit": 360000 * (1.1 ** (y-1)),
                "depreciation": 60000,
                "tl_interest": 36000,
                "wc_interest": 12000,
                "total_expenses": 1800000,
                "capacity": 0.5 + (0.1 * y),
            } for y in range(1, 6)
        ],
        "balance_sheet": [
            {
                "year": y,
                "total_assets": 1000000,
                "total_liabilities": 1000000,
            } for y in range(0, 6)
        ],
        "working_capital_schedule": [
            {
                "year": y,
                "total": 200000,
                "bank_loan": 150000,
                "margin": 50000,
                "wc_interest": 18000,
            } for y in range(1, 6)
        ],
        "loan_amortization": [
            {
                "year": y,
                "opening_balance": 500000 - (y-1)*100000,
                "interest_paid": 50000 - (y-1)*10000,
                "principal_paid": 100000,
                "closing_balance": 400000 - (y-1)*100000,
                "emi_paid": 150000,
            } for y in range(1, 6)
        ],
        "breakeven_analysis": [
            {
                "year": y,
                "bep_sales": 1200000,
                "revenue": 2400000,
                "contribution": 1200000,
            } for y in range(1, 6)
        ],
        "dscr_data": {
            "dscr_y1": 1.5,
            "average": 1.75,
            "dscr_label": "Good",
        },
        "scorecard": {
            "total_score": 7.5,
            "credit_rating": "A",
            "recommendation": "APPROVE",
            "risk_level": "LOW",
            "items": [],
            "risk_matrix": [],
        },
        "sensitivity": [],
    }

def run_tests():
    """Run PDF generation for all scenarios."""
    os.makedirs("test_outputs", exist_ok=True)
    industries = ["manufacturing", "trading", "service"]
    
    for ind in industries:
        print(f"Generating PDF for {ind}...")
        data = get_mock_data(ind)
        output_path = f"test_outputs/report_{ind}_{datetime.now().strftime('%H%M%S')}.pdf"
        try:
            generate_pdf(data, output_path)
            print(f"  Successfully created: {output_path}")
        except Exception as e:
            print(f"  Failed for {ind}: {str(e)}")

if __name__ == "__main__":
    run_tests()
