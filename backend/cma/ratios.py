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


def _safe_div(a, b):
    return round(a / b, 2) if b else 0.0


def calculate_ratios_extended(intake: CMAIntake,
                              operating_statement: List[Dict[str, Any]],
                              balance_sheets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Comprehensive CMA ratio set for the Ratio Analysis sheet: profitability,
    liquidity, efficiency (turnover), and solvency ratios, plus year-on-year
    growth. Additive — does not change calculate_ratios().
    """
    out = []
    for i, (op, bs) in enumerate(zip(operating_statement, balance_sheets)):
        L, A = bs["liabilities"], bs["assets"]
        CA = A["current_assets"]
        sales = op.get("revenue", 0)

        net_worth   = L.get("net_worth", 0)
        other_assets = A.get("other_assets", 0)
        tnw         = net_worth - other_assets                  # tangible net worth
        term_liab   = L.get("term_loan", 0)
        total_outside = L.get("creditors", 0) + L.get("wc_loan", 0) + term_liab
        net_block   = A.get("fixed_assets", 0)
        total_assets = A.get("total", 0)
        ca_total    = CA.get("total", 0)
        current_liab = L.get("creditors", 0) + L.get("wc_loan", 0)
        nwc         = ca_total - current_liab
        stock       = CA.get("stock", 0)
        capital_employed = tnw + term_liab

        prev = operating_statement[i - 1] if i > 0 else None
        prev_bs = balance_sheets[i - 1] if i > 0 else None

        def growth(curr, prv):
            return _safe_div((curr - prv) * 100, prv) if prv else None

        out.append({
            "year": op.get("year"),
            # Profitability
            "gross_profit_ratio": _safe_div(op.get("gross_profit", 0) * 100, sales),
            "net_profit_ratio":   _safe_div(op.get("pat", 0) * 100, sales),
            "roce_pct":           _safe_div((op.get("pbt", 0) + op.get("tl_interest", 0)) * 100, capital_employed),
            # Liquidity
            "current_ratio": _safe_div(ca_total, current_liab),
            "quick_ratio":   _safe_div(ca_total - stock, current_liab),
            # Solvency
            "debt_equity":   _safe_div(term_liab, tnw),
            "tol_tnw":       _safe_div(total_outside, tnw),
            "ttl_tnw":       _safe_div(term_liab, tnw),
            "interest_coverage": _safe_div(op.get("ebitda", 0), op.get("interest", 0)),
            # Efficiency (turnover)
            "stock_turnover":        _safe_div(sales, stock),
            "total_assets_turnover": _safe_div(sales, total_assets),
            "fixed_assets_turnover": _safe_div(sales, net_block),
            "ca_turnover":           _safe_div(sales, ca_total),
            "wc_turnover":           _safe_div(sales, nwc),
            "capital_turnover":      _safe_div(sales, tnw),
            # Turnover periods (days) — CMA RATIOS sheet
            "inventory_days":        _safe_div(stock * 365, sales),
            "collection_days":       _safe_div(CA.get("debtors", 0) * 365, sales),
            "credit_period_days":    _safe_div(L.get("creditors", 0) * 365, op.get("cogs", 0)),
            # Growth (YoY)
            "growth_sales_pct":     growth(sales, prev.get("revenue", 0)) if prev else None,
            "growth_profit_pct":    growth(op.get("pat", 0), prev.get("pat", 0)) if prev else None,
            "growth_net_worth_pct": growth(net_worth, prev_bs["liabilities"].get("net_worth", 0)) if prev_bs else None,
            # Reference figures
            "tangible_net_worth": round(tnw, 2),
            "net_working_capital": round(nwc, 2),
        })
    return out
