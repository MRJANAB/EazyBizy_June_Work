from typing import List, Dict

def calculate_operating_statement(
    annual_sales: float,
    cogs_pct: float,
    operating_expenses_pct: float,
    interest_rate: float,
    loan_amount: float,
    depreciation: float,
    tax_rate: float,
    growth_rate: float,
    expense_growth: float,
    years: int = 5
) -> List[Dict]:
    projections = []
    
    current_sales = annual_sales
    current_loan_balance = loan_amount
    
    for year in range(1, years + 1):
        # Apply growth from year 2 onwards
        if year > 1:
            current_sales *= (1 + growth_rate / 100)
            
        cogs = current_sales * (cogs_pct / 100)
        gross_profit = current_sales - cogs
        
        # Expenses also grow
        current_expenses = (annual_sales * (operating_expenses_pct / 100)) * ((1 + expense_growth / 100) ** (year - 1))
        
        ebitda = gross_profit - current_expenses
        
        # Simplified interest calculation (should ideally use loan schedule)
        interest = current_loan_balance * (interest_rate / 100)
        
        pbt = ebitda - depreciation - interest
        tax = max(0, pbt * (tax_rate / 100))
        pat = pbt - tax
        
        projections.append({
            "year": year,
            "sales": round(current_sales, 2),
            "cogs": round(cogs, 2),
            "gross_profit": round(gross_profit, 2),
            "expenses": round(current_expenses, 2),
            "ebitda": round(ebitda, 2),
            "depreciation": round(depreciation, 2),
            "interest": round(interest, 2),
            "pbt": round(pbt, 2),
            "tax": round(tax, 2),
            "pat": round(pat, 2)
        })
        
        # Simple principal repayment for interest calculation next year
        # In a real engine, we'd use the loan_schedule.py output
        current_loan_balance -= (loan_amount / years)
        if current_loan_balance < 0: current_loan_balance = 0
        
    return projections
