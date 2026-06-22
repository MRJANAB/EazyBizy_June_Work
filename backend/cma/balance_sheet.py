from typing import List, Dict, Any
from .intake_mapper import CMAIntake

def calculate_balance_sheet(intake: CMAIntake, operating_projections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    balance_sheets = []
    
    # Year 0 (Project Start)
    net_worth = intake.means_of_finance.promoter_contribution + intake.means_of_finance.unsecured_loans
    term_loan = intake.means_of_finance.term_loan
    wc_loan = intake.means_of_finance.working_capital_loan
    
    fixed_assets = (
        intake.project_cost.land + intake.project_cost.building + 
        intake.project_cost.plant_machinery + intake.project_cost.electrical + 
        intake.project_cost.furniture + intake.project_cost.computers + 
        intake.project_cost.vehicles + intake.project_cost.office_equipment + 
        intake.project_cost.generator_ups
    )
    
    current_assets = (
        intake.project_cost.initial_stock + intake.project_cost.cash_margin + 
        intake.project_cost.receivables_support
    )
    
    other_assets = (
        intake.project_cost.preliminary_expenses + intake.project_cost.registration_license + 
        intake.project_cost.consultancy_fees + intake.project_cost.marketing_launch + 
        intake.project_cost.contingency
    )

    current_net_worth = net_worth
    current_fixed_assets = fixed_assets
    current_term_loan = term_loan
    
    for i, proj in enumerate(operating_projections):
        year = proj['year']
        
        # Accumulate PAT into Net Worth
        current_net_worth += proj['pat']
        
        # Reduce Term Loan (assuming equal repayment for simplicity, should use loan_schedule)
        repayment = term_loan / len(operating_projections)
        current_term_loan -= repayment
        if current_term_loan < 0: current_term_loan = 0
        
        # Reduce Fixed Assets by Depreciation
        current_fixed_assets -= proj['depreciation']
        
        # Current Assets & Liabilities (simplified logic based on revenue)
        # In a real engine, these would be linked to WC Norms
        sales = proj['revenue']
        debtors = (sales / 365) * intake.wc_norms.receivable_days
        stock = (proj['cogs'] / 365) * intake.wc_norms.rm_holding_days # Simplified
        cash = (proj['other_opex'] / 365) * intake.wc_norms.cash_holding_days
        
        total_current_assets = debtors + stock + cash
        
        # Total liabilities = Net Worth + Term Loan + WC Loan + Creditors
        creditors = (proj['cogs'] / 365) * intake.wc_norms.creditor_days
        total_liabilities = current_net_worth + current_term_loan + wc_loan + creditors
        
        balance_sheets.append({
            "year": year,
            "liabilities": {
                "net_worth": round(current_net_worth, 2),
                "term_loan": round(current_term_loan, 2),
                "wc_loan": round(wc_loan, 2),
                "creditors": round(creditors, 2),
                "total": round(total_liabilities, 2)
            },
            "assets": {
                "fixed_assets": round(current_fixed_assets, 2),
                "current_assets": {
                    "stock": round(stock, 2),
                    "debtors": round(debtors, 2),
                    "cash": round(cash, 2),
                    "total": round(total_current_assets, 2)
                },
                "other_assets": round(other_assets, 2),
                "total": round(current_fixed_assets + total_current_assets + other_assets, 2)
            }
        })
        
    return balance_sheets
