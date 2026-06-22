from typing import List, Dict

def calculate_balance_sheet(
    operating_statements: List[Dict],
    loan_structure: Dict,
    wc_norms: Dict,
    initial_capital: float,
    asset_total: float
) -> List[Dict]:
    balance_sheets = []
    
    retained_earnings = 0
    current_term_loan = loan_structure.get("term_loan_amount", 0)
    
    for stmt in operating_statements:
        year = stmt["year"]
        
        # Assets
        receivables = stmt["sales"] * (wc_norms.get("debtors_days", 45) / 365)
        inventory = stmt["cogs"] * (wc_norms.get("stock_days", 60) / 365)
        cash = stmt["sales"] * (wc_norms.get("cash_days", 15) / 365)
        
        # Net Fixed Assets (Simplified: deducting annual depreciation)
        # Year 1 fixed assets minus accumulated depreciation
        net_fixed_assets = asset_total - (stmt["depreciation"] * year)
        if net_fixed_assets < 0: net_fixed_assets = 0
        
        total_assets = receivables + inventory + cash + net_fixed_assets
        
        # Liabilities
        creditors = stmt["cogs"] * (wc_norms.get("creditors_days", 30) / 365)
        wc_loan = loan_structure.get("wc_limit", 0)
        
        # Term loan repayment
        repayment_per_year = loan_structure.get("term_loan_amount", 0) / loan_structure.get("term_loan_tenure_years", 5)
        current_term_loan = loan_structure.get("term_loan_amount", 0) - (repayment_per_year * year)
        if current_term_loan < 0: current_term_loan = 0
        
        retained_earnings += stmt["pat"]
        total_equity = initial_capital + retained_earnings
        
        total_liabilities = creditors + wc_loan + current_term_loan + total_equity
        
        # Balance Sheet must balance: Total Assets == Total Liabilities
        # In a real engine, we'd use 'Other Current Assets' or 'Bank Balance' as a plug to balance.
        diff = total_assets - total_liabilities
        cash += (-diff) # Adjust cash to balance
        total_assets = receivables + inventory + cash + net_fixed_assets
        
        balance_sheets.append({
            "year": year,
            "assets": {
                "fixed_assets_net": round(net_fixed_assets, 2),
                "inventory": round(inventory, 2),
                "receivables": round(receivables, 2),
                "cash_bank": round(cash, 2),
                "total": round(total_assets, 2)
            },
            "liabilities": {
                "equity_capital": round(initial_capital, 2),
                "reserves_surplus": round(retained_earnings, 2),
                "term_loan": round(current_term_loan, 2),
                "wc_loan": round(wc_loan, 2),
                "creditors": round(creditors, 2),
                "total": round(total_liabilities, 2)
            }
        })
        
    return balance_sheets
