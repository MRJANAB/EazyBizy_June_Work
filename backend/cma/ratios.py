from typing import List, Dict, Any
from .intake_mapper import CMAIntake

def calculate_ratios(intake: CMAIntake, operating_projections: List[Dict[str, Any]], balance_sheets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    ratios_list = []
    
    for i in range(len(operating_projections)):
        op = operating_projections[i]
        bs = balance_sheets[i]
        
        # Current Ratio = Current Assets / Current Liabilities
        # Current Liabilities = Creditors + WC Loan + (Current portion of Term Loan - ignored for simplicity)
        current_assets = bs['assets']['current_assets']['total']
        current_liabilities = bs['liabilities']['creditors'] + bs['liabilities']['wc_loan']
        
        current_ratio = current_assets / current_liabilities if current_liabilities > 0 else 0
        
        # Quick Ratio = (Current Assets - Stock) / Current Liabilities
        quick_assets = current_assets - bs['assets']['current_assets']['stock']
        quick_ratio = quick_assets / current_liabilities if current_liabilities > 0 else 0
        
        # Debt-Equity Ratio = (Term Loan + WC Loan) / Net Worth
        total_debt = bs['liabilities']['term_loan'] + bs['liabilities']['wc_loan']
        debt_equity = total_debt / bs['liabilities']['net_worth'] if bs['liabilities']['net_worth'] > 0 else 0
        
        # DSCR = (Cash Accruals + TL Interest) / (TL Principal + TL Interest)
        # Uses the term-loan portion of interest and the actual scheduled
        # principal for this year (from the single-source loan schedule),
        # NOT a straight-line tenure average — so DSCR matches the amortisation.
        tl_interest         = op.get('tl_interest', op['interest'])
        cash_acc            = op['cash_accruals']  # PAT + Dep
        principal_repayment = op.get('tl_principal', 0.0)
        numerator   = cash_acc + tl_interest
        denominator = tl_interest + principal_repayment
        dscr = numerator / denominator if denominator > 0 else 0

        # Interest Coverage = EBITDA / Interest (total finance cost: TL + WC)
        interest_coverage = op['ebitda'] / op['interest'] if op['interest'] > 0 else 0
        
        # Margins
        gross_margin = (op['gross_profit'] / op['revenue']) * 100 if op['revenue'] > 0 else 0
        net_margin = (op['pat'] / op['revenue']) * 100 if op['revenue'] > 0 else 0
        ebitda_margin = (op['ebitda'] / op['revenue']) * 100 if op['revenue'] > 0 else 0

        ratios_list.append({
            "year": op['year'],
            "current_ratio": round(current_ratio, 2),
            "quick_ratio": round(quick_ratio, 2),
            "debt_equity": round(debt_equity, 2),
            "dscr": round(dscr, 2),
            "interest_coverage": round(interest_coverage, 2),
            "gross_margin_pct": round(gross_margin, 2),
            "net_margin_pct": round(net_margin, 2),
            "ebitda_margin_pct": round(ebitda_margin, 2)
        })
        
    return ratios_list
