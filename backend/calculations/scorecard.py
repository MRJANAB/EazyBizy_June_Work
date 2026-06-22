"""
calculations/scorecard.py — Weighted credit scorecard with per-scheme benchmarks (PDF §5)
"""
from core.engine import (
    R, score_dscr, score_roi, score_breakeven,
    credit_rating, recommendation, risk_level,
    calculate_risk_matrix, get_scheme_benchmarks,
)


def calculate_scorecard(
    data, income: list, dscr_data: dict, bep: list, scheme_data: dict,
) -> dict:
    """
    Weighted credit scorecard with scheme-specific DSCR benchmarks.
    """
    scheme        = str(scheme_data.get("scheme", "default")).lower()
    benchmarks    = get_scheme_benchmarks(scheme)
    dscr_bench    = float(scheme_data.get("dscr_benchmark") or benchmarks["dscr_avg"])

    dscr_y1       = float(dscr_data.get("dscr_y1",  0) or 0)
    avg_dscr      = float(dscr_data.get("average",   0) or 0)
    project_cost  = float(scheme_data.get("project_cost", 1) or 1)
    promoter_pct  = float(scheme_data.get("promoter_pct", 10) or 10)
    
    # Correctly handle 'Not Achievable' break-even
    is_be_not_achievable = bool(bep[0].get("payback_not_achievable", False)) if bep else False
    if is_be_not_achievable:
        be_months = None
    else:
        be_months = float(bep[0].get("payback_months", 24) or 24) if bep else 24.0

    annual_ebitda = float(income[0].get("ebitda", 0) or 0) if income else 0.0   # already annual
    roi_ebitda    = R(annual_ebitda / project_cost * 100, 2)

    assum = getattr(data, "assumptions", None)
    sc_market      = float(getattr(assum, "sc_market",         8) or 8)
    sc_competitive = float(getattr(assum, "sc_competitive",    8) or 8)
    sc_biz_model   = float(getattr(assum, "sc_business_model", 8) or 8)
    sc_promoter    = float(getattr(assum, "sc_promoter_exp",   8) or 8)
    # Financial contribution score based on scheme requirement
    min_prom = benchmarks["promoter_pct"]
    sc_fin   = 9.0 if promoter_pct >= min_prom else (6.0 if promoter_pct >= min_prom * 0.8 else 3.0)

    s_d = score_dscr(dscr_y1)
    s_r = score_roi(roi_ebitda)
    s_b = 0 if (is_be_not_achievable or be_months is None) else score_breakeven(be_months)

    items = [
        {"parameter": f"DSCR ({round(dscr_y1,2)}x)",              "weight": 25, "score": s_d, "weighted": R(0.25 * s_d, 2)},
        {"parameter": f"ROI ({round(roi_ebitda,2)}%)",             "weight": 20, "score": s_r, "weighted": R(0.20 * s_r, 2)},
        {"parameter": f"Break-Even ({'N/A' if be_months is None else round(be_months, 1)} mo)", "weight": 15, "score": s_b, "weighted": R(0.15 * s_b, 2)},
        {"parameter": "Market Opportunity",                         "weight": 10, "score": sc_market,      "weighted": R(0.10 * sc_market, 2)},
        {"parameter": "Competitive Position",                       "weight": 10, "score": sc_competitive, "weighted": R(0.10 * sc_competitive, 2)},
        {"parameter": "Business Model",                             "weight": 10, "score": sc_biz_model,   "weighted": R(0.10 * sc_biz_model, 2)},
        {"parameter": "Promoter Experience",                        "weight":  5, "score": sc_promoter,    "weighted": R(0.05 * sc_promoter, 2)},
        {"parameter": f"Financial Contribution ({round(promoter_pct,1)}%)", "weight": 5, "score": sc_fin, "weighted": R(0.05 * sc_fin, 2)},
    ]
    total_score = R(sum(float(s["weighted"]) for s in items), 2)

    # Ratio assessment vs scheme benchmarks
    ebitda_margin = float(income[0].get("ebitda", 0) / max(income[0].get("revenue", 1), 1) * 100) if income else 0
    ratio_checks = {
        "dscr_avg_pass":        avg_dscr    >= benchmarks["dscr_avg"],
        "ebitda_margin_pass":   ebitda_margin >= benchmarks["ebitda_margin"],
        "promoter_pct_pass":    promoter_pct >= benchmarks["promoter_pct"],
        "dscr_benchmark":       benchmarks["dscr_avg"],
        "ebitda_benchmark":     benchmarks["ebitda_margin"],
        "promoter_benchmark":   benchmarks["promoter_pct"],
    }

    # CA Rule: negative DSCR / EBITDA / PAT = business is not viable → mandatory REJECT
    _rec   = recommendation(total_score)
    _rating = credit_rating(total_score)
    _risk  = risk_level(total_score)
    pat_y1 = float(income[0].get("pat", income[0].get("net_profit", 0)) if income else 0)
    ebitda_y1 = float(income[0].get("ebitda", 0) if income else 0)
    if avg_dscr < 0 or ebitda_y1 < 0 or pat_y1 < 0:
        _rec   = "REJECT"
        _rating = "Weak"
        _risk  = "Very High Risk"

    return {
        "items":           items,
        "total_score":     total_score,
        "credit_rating":   _rating,
        "recommendation":  _rec,
        "risk_level":      _risk,
        "risk_matrix":     calculate_risk_matrix(),
        "dscr_y1":         dscr_y1,
        "avg_dscr":        avg_dscr,
        "roi_ebitda_pct":  roi_ebitda,
        "breakeven_months": be_months,
        "payback_not_achievable": is_be_not_achievable,
        "promoter_pct":    promoter_pct,
        "scheme_benchmarks": benchmarks,
        "ratio_checks":    ratio_checks,
        "weight":          "weight",  # alias for pdf_builder compatibility
    }
