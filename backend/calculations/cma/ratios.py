from typing import List, Dict

def calculate_ratios(operating_statements: List[Dict], balance_sheets: List[Dict]) -> List[Dict]:
    ratios_projection = []
    
    for i in range(len(operating_statements)):
        os = operating_statements[i]
        bs = balance_sheets[i]
        
        # Margins
        gross_margin = (os["gross_profit"] / os["sales"]) * 100 if os["sales"] > 0 else 0
        ebitda_margin = (os["ebitda"] / os["sales"]) * 100 if os["sales"] > 0 else 0
        net_profit_margin = (os["pat"] / os["sales"]) * 100 if os["sales"] > 0 else 0
        
        # Liquidity
        current_assets = bs["assets"]["inventory"] + bs["assets"]["receivables"] + bs["assets"]["cash_bank"]
        current_liabilities = bs["liabilities"]["creditors"] + bs["liabilities"]["wc_loan"]
        
        current_ratio = current_assets / current_liabilities if current_liabilities > 0 else 0
        quick_ratio = (current_assets - bs["assets"]["inventory"]) / current_liabilities if current_liabilities > 0 else 0
        
        # Solvency
        total_debt = bs["liabilities"]["term_loan"] + bs["liabilities"]["wc_loan"]
        net_worth = bs["liabilities"]["equity_capital"] + bs["liabilities"]["reserves_surplus"]
        
        debt_equity = total_debt / net_worth if net_worth > 0 else 0
        
        # Efficiency
        inventory_days = (bs["assets"]["inventory"] / os["cogs"]) * 365 if os["cogs"] > 0 else 0
        debtor_days = (bs["assets"]["receivables"] / os["sales"]) * 365 if os["sales"] > 0 else 0
        creditor_days = (bs["liabilities"]["creditors"] / os["cogs"]) * 365 if os["cogs"] > 0 else 0
        
        ratios_projection.append({
            "year": os["year"],
            "margins": {
                "gross_margin_pct": round(gross_margin, 2),
                "ebitda_margin_pct": round(ebitda_margin, 2),
                "net_profit_margin_pct": round(net_profit_margin, 2)
            },
            "liquidity": {
                "current_ratio": round(current_ratio, 2),
                "quick_ratio": round(quick_ratio, 2)
            },
            "solvency": {
                "debt_equity": round(debt_equity, 2),
                "total_debt": round(total_debt, 2),
                "net_worth": round(net_worth, 2)
            },
            "efficiency": {
                "inventory_days": round(inventory_days, 1),
                "debtor_days": round(debtor_days, 1),
                "creditor_days": round(creditor_days, 1)
            }
        })
        
    return ratios_projection
