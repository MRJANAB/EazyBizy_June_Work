from typing import List, Dict, Any
from .intake_mapper import CMAIntake

def calculate_cashflow(intake: CMAIntake, operating_projections: List[Dict[str, Any]], balance_sheets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cashflows = []
    
    # We need to compare year-over-year changes, so we need a "Year 0" reference
    # For a new project, Year 0 is the project start
    
    prev_cash = 0
    
    for i, proj in enumerate(operating_projections):
        year = proj['year']
        bs = balance_sheets[i]
        
        # Sources of Funds
        pat = proj['pat']
        depreciation = proj['depreciation']
        cash_from_operations = pat + depreciation
        
        # In a real model, we'd include changes in working capital
        # Increase in CA = Use of Funds
        # Increase in CL = Source of Funds
        
        if i == 0:
            # Year 1 vs Project Start
            delta_stock = bs['assets']['current_assets']['stock'] - intake.project_cost.initial_stock
            delta_debtors = bs['assets']['current_assets']['debtors'] - intake.project_cost.receivables_support
            delta_creditors = bs['liabilities']['creditors'] - 0 # Assuming 0 initial creditors
        else:
            prev_bs = balance_sheets[i-1]
            delta_stock = bs['assets']['current_assets']['stock'] - prev_bs['assets']['current_assets']['stock']
            delta_debtors = bs['assets']['current_assets']['debtors'] - prev_bs['assets']['current_assets']['debtors']
            delta_creditors = bs['liabilities']['creditors'] - prev_bs['liabilities']['creditors']

        wc_change = delta_creditors - delta_stock - delta_debtors
        
        # Financing
        term_loan_repayment = intake.means_of_finance.term_loan / len(operating_projections)
        
        net_cash_flow = cash_from_operations + wc_change - term_loan_repayment
        closing_cash = prev_cash + net_cash_flow
        
        cashflows.append({
            "year": year,
            "operating_cash": round(cash_from_operations, 2),
            "wc_change": round(wc_change, 2),
            "financing_outflow": round(term_loan_repayment, 2),
            "net_cash_flow": round(net_cash_flow, 2),
            "closing_cash": round(closing_cash, 2)
        })
        
        prev_cash = closing_cash
        
    return cashflows
