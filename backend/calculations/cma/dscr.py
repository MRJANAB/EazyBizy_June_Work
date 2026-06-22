from typing import List, Dict

def calculate_dscr(operating_statements: List[Dict], loan_structure: Dict) -> Dict:
    dscr_data = []
    
    term_loan = loan_structure.get("term_loan_amount", 0)
    tenure = loan_structure.get("term_loan_tenure_years", 5)
    annual_principal = term_loan / tenure
    
    total_dscr = 0
    
    for stmt in operating_statements:
        year = stmt["year"]
        pat = stmt["pat"]
        depreciation = stmt["depreciation"]
        interest = stmt["interest"]
        
        # Cash available for debt service
        funds_available = pat + depreciation + interest
        
        # Debt service obligations
        debt_service = annual_principal + interest
        
        dscr = funds_available / debt_service if debt_service > 0 else 0
        total_dscr += dscr
        
        dscr_data.append({
            "year": year,
            "funds_available": round(funds_available, 2),
            "debt_service": round(debt_service, 2),
            "dscr": round(dscr, 2)
        })
        
    avg_dscr = total_dscr / len(operating_statements) if operating_statements else 0
    
    return {
        "yearly": dscr_data,
        "average": round(avg_dscr, 2)
    }
