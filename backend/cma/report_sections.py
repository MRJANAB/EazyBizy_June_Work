"""
cma/report_sections.py
======================
Single source of truth for the CMA report content.

`build_sections(results)` returns an ordered list of sections (the same data
for every output format). Both the Excel writer (excel_report.py) and the PDF
writer (pdf_report.py) render from this, so the Excel and PDF are guaranteed to
be replicas of each other.

Section kinds:
  - 'kv'    : key/value pairs (Summary).
  - 'table' : period columns + labelled rows.

Row style: 'normal' | 'bold' | 'sub' (sub = section sub-heading band).
"""

from typing import Dict, Any, List, Tuple

_TAGS = ["(provisional)", "(estimated)", "(projected)", "(projected)", "(projected)"]


# ── Period column helpers ─────────────────────────────────────────────────────

def fy_labels(results: Dict[str, Any], n: int = 5) -> List[str]:
    cd = str(results.get("metadata", {}).get("business", {}).get("commencement_date", ""))
    try:
        start = int(cd[:4])
    except ValueError:
        start = 0
    return [f"{start + i}-{start + i + 1}" if start else f"Year {i + 1}" for i in range(n)]


def proj_columns(results, n=5) -> List[Tuple[str, str]]:
    fy = fy_labels(results, n)
    return [(fy[i], _TAGS[i] if i < len(_TAGS) else "(projected)") for i in range(n)]


def op_periods(results, n=5):
    """Operating-statement columns: audited historicals + projected. Returns (cols, op_dicts)."""
    hist = results.get("historical_operating_statement", [])
    proj = results.get("operating_statement", [])[:n]
    fy = fy_labels(results, n)
    cols = [(str(h.get("year", "")), "(audited)") for h in hist]
    data = list(hist)
    for i, o in enumerate(proj):
        cols.append((fy[i], _TAGS[i] if i < len(_TAGS) else "(projected)"))
        data.append(o)
    return cols, data


def bs_periods(results, n=5):
    """Balance-sheet columns: audited historicals + projected. Returns (cols, bs_dicts, n_hist)."""
    hist = results.get("historical_balance_sheet", [])
    proj = results.get("balance_sheet", [])[:n]
    fy = fy_labels(results, n)
    cols = [(str(h.get("year", "")), "(audited)") for h in hist]
    data = list(hist)
    for i, b in enumerate(proj):
        cols.append((fy[i], _TAGS[i] if i < len(_TAGS) else "(projected)"))
        data.append(b)
    return cols, data, len(hist)


def _r(label, values, style="normal", money=True):
    return {"label": label, "values": list(values), "style": style, "money": money}


# ── Section builders ──────────────────────────────────────────────────────────

def _summary(results):
    meta = results.get("metadata", {})
    biz, app, loan = meta.get("business", {}), meta.get("applicant", {}), meta.get("loan", {})
    summ = results.get("summary", {})
    pairs = [
        ("Firm Name", biz.get("entity_name", "")),
        ("Promoter", app.get("name", "")),
        ("Constitution", biz.get("constitution", "")),
        ("Activity / Industry", biz.get("activity", "")),
        ("PAN No.", app.get("pan", "")),
        ("Commencement Date", biz.get("commencement_date", "")),
        ("Project Cost", summ.get("total_project_cost", 0)),
        ("Means of Finance", summ.get("means_of_finance", 0)),
        ("Term Loan", loan.get("amount", 0)),
        ("Interest Rate (%)", loan.get("interest_rate", 0)),
        ("Tenure (months)", loan.get("tenure_months", 0)),
        ("Moratorium (months)", loan.get("moratorium_months", 0)),
        ("Existing Business", "Yes" if summ.get("is_existing_business") else "No"),
        ("Average DSCR", summ.get("avg_dscr", 0)),
    ]
    return {"title": "Summary", "kind": "kv", "pairs": pairs}


def _operating_statement(results, n=5):
    cols, ops = op_periods(results, n)

    def g(o, k): return o.get(k, 0)
    def tl(o): return o.get("tl_interest", o.get("interest", 0))
    def wc(o): return o.get("wc_interest", 0)

    rows = [
        _r("1. Gross Sales / Sales & Services", [g(o, "revenue") for o in ops], "bold"),
        _r("2. Net Sales", [g(o, "revenue") for o in ops], "bold"),
        _r("3. COST OF SALES", [""] * len(ops), "sub"),
        _r("   Raw Material / Consumables", [g(o, "cogs") for o in ops]),
        _r("   Depreciation", [g(o, "depreciation") for o in ops]),
        _r("   Cost of Production / Sales", [g(o, "cogs") + g(o, "depreciation") for o in ops], "bold"),
        _r("4. Selling, General & Admin Expenses", [g(o, "salary") + g(o, "other_opex") for o in ops]),
        _r("5. Total Cost of Sales (3+4)", [g(o, "cogs") + g(o, "depreciation") + g(o, "salary") + g(o, "other_opex") for o in ops], "bold"),
        _r("6. Operating Profit before Interest", [g(o, "ebitda") - g(o, "depreciation") for o in ops], "bold"),
        _r("7. Interest on Working Capital", [wc(o) for o in ops]),
        _r("   Interest on Term Loan", [tl(o) for o in ops]),
        _r("8. Operating Profit after Interest (PBT)", [g(o, "pbt") for o in ops], "bold"),
        _r("9. Provision for Tax", [g(o, "tax") for o in ops]),
        _r("10. NET PROFIT AFTER TAX", [g(o, "pat") for o in ops], "bold"),
        _r("11. Retained Profit", [g(o, "pat") for o in ops]),
        _r("NP Ratio (%)", [round(g(o, "pat") / g(o, "revenue") * 100, 2) if g(o, "revenue") else 0 for o in ops], money=False),
    ]
    return {"title": "Operating Statement (Form II)", "kind": "table", "columns": cols, "rows": rows}


def _balance_sheet(results, n=5):
    cols, bs, n_hist = bs_periods(results, n)
    dep = results.get("depreciation_chart", {}).get("totals", {})

    def L(b, k): return b["liabilities"].get(k, 0)
    def CA(b, k): return b["assets"]["current_assets"].get(k, 0)

    rows = [
        _r("CURRENT LIABILITIES", [""] * len(bs), "sub"),
        _r("  Working Capital Bank Borrowing", [L(b, "wc_loan") for b in bs]),
        _r("  Sundry Creditors (Trade)", [L(b, "creditors") for b in bs]),
        _r("  TOTAL CURRENT LIABILITIES", [L(b, "wc_loan") + L(b, "creditors") for b in bs], "bold"),
        _r("TERM LIABILITIES", [""] * len(bs), "sub"),
        _r("  Term Loan", [L(b, "term_loan") for b in bs]),
        _r("  TOTAL TERM LIABILITIES", [L(b, "term_loan") for b in bs], "bold"),
        _r("TOTAL OUTSIDE LIABILITIES", [L(b, "wc_loan") + L(b, "creditors") + L(b, "term_loan") for b in bs], "bold"),
        _r("NET WORTH", [""] * len(bs), "sub"),
        _r("  Capital & Reserves", [L(b, "net_worth") for b in bs]),
        _r("  NET WORTH", [L(b, "net_worth") for b in bs], "bold"),
        _r("TOTAL LIABILITIES", [b["liabilities"]["total"] for b in bs], "bold"),
        _r("CURRENT ASSETS", [""] * len(bs), "sub"),
        _r("  Cash & Bank Balance", [CA(b, "cash") for b in bs]),
        _r("  Receivables (Debtors)", [CA(b, "debtors") for b in bs]),
        _r("  Inventory - Raw Material", [CA(b, "rm_stock") for b in bs]),
        _r("  Inventory - Work in Progress", [CA(b, "wip") for b in bs]),
        _r("  Inventory - Finished Goods", [CA(b, "fg") for b in bs]),
        _r("  TOTAL CURRENT ASSETS", [CA(b, "total") for b in bs], "bold"),
        _r("FIXED ASSETS", [""] * len(bs), "sub"),
        _r("  Gross Block", [""] * n_hist + dep.get("opening", [0] * n)[:n]),
        _r("  Less: Depreciation", [""] * n_hist + dep.get("depreciation", [0] * n)[:n]),
        _r("  NET BLOCK", [b["assets"].get("fixed_assets", 0) for b in bs], "bold"),
        _r("OTHER / INTANGIBLE ASSETS", [b["assets"].get("other_assets", 0) for b in bs]),
        _r("TOTAL ASSETS", [b["assets"]["total"] for b in bs], "bold"),
        _r("Tangible Net Worth", [L(b, "net_worth") - b["assets"].get("other_assets", 0) for b in bs]),
        _r("Net Working Capital", [CA(b, "total") - (L(b, "wc_loan") + L(b, "creditors")) for b in bs]),
        _r("Current Ratio", [round(CA(b, "total") / (L(b, "wc_loan") + L(b, "creditors")), 2) if (L(b, "wc_loan") + L(b, "creditors")) else 0 for b in bs], money=False),
        _r("Difference [Assets - Liabilities]", [b.get("check", 0) for b in bs]),
    ]
    return {"title": "Balance Sheet (Form III)", "kind": "table", "columns": cols, "rows": rows}


def _depreciation(results, n=5):
    cols = proj_columns(results, n)
    chart = results.get("depreciation_chart", {})
    rows = []
    for cls in chart.get("classes", []):
        yrs = cls["years"]
        if all(y["opening"] == 0 for y in yrs):
            continue
        rows.append(_r(f"{cls['name']}  ({cls['rate']:.0f}%)", [y["opening"] for y in yrs], "bold"))
        rows.append(_r("  Less: Depreciation", [y["depreciation"] for y in yrs]))
        rows.append(_r("  Written Down Value", [y["wdv"] for y in yrs]))
    t = chart.get("totals", {})
    if t:
        rows.append(_r("TOTAL Opening (Gross Block)", t.get("opening", []), "bold"))
        rows.append(_r("TOTAL Depreciation for Year", t.get("depreciation", []), "bold"))
        rows.append(_r("TOTAL Written Down Value (Net Block)", t.get("wdv", []), "bold"))
    return {"title": "Depreciation Chart (WDV Method)", "kind": "table", "columns": cols, "rows": rows}


def _comparative(results, n=5):
    cols, bs, _ = bs_periods(results, n)

    def CA(b, k): return b["assets"]["current_assets"].get(k, 0)
    def L(b, k): return b["liabilities"].get(k, 0)

    rows = [
        _r("A. CURRENT ASSETS", [""] * len(bs), "sub"),
        _r("  1. Raw Material", [CA(b, "rm_stock") for b in bs]),
        _r("  2. Work-in-Progress", [CA(b, "wip") for b in bs]),
        _r("  3. Finished Goods", [CA(b, "fg") for b in bs]),
        _r("  4. Receivables (Debtors)", [CA(b, "debtors") for b in bs]),
        _r("  5. Cash & Bank", [CA(b, "cash") for b in bs]),
        _r("  TOTAL CURRENT ASSETS", [CA(b, "total") for b in bs], "bold"),
        _r("B. CURRENT LIABILITIES", [""] * len(bs), "sub"),
        _r("  6. Sundry Creditors", [L(b, "creditors") for b in bs]),
        _r("  7. WC Bank Borrowing", [L(b, "wc_loan") for b in bs]),
        _r("  TOTAL CURRENT LIABILITIES", [L(b, "creditors") + L(b, "wc_loan") for b in bs], "bold"),
    ]
    return {"title": "Comparative Statement of Current Assets & Liabilities", "kind": "table", "columns": cols, "rows": rows}


def _ratios(results, n=5):
    cols = proj_columns(results, n)
    rx = results.get("ratios_extended", [])[:n]

    def c(key):
        return [("N/A" if r.get(key) is None else r.get(key)) for r in rx]

    rows = [
        _r("PROFITABILITY", [""] * len(rx), "sub"),
        _r("Gross Profit Ratio (%)", c("gross_profit_ratio"), money=False),
        _r("Net Profit Ratio (%)", c("net_profit_ratio"), money=False),
        _r("Return on Capital Employed (%)", c("roce_pct"), money=False),
        _r("LIQUIDITY", [""] * len(rx), "sub"),
        _r("Current Ratio", c("current_ratio"), money=False),
        _r("Quick Ratio", c("quick_ratio"), money=False),
        _r("SOLVENCY", [""] * len(rx), "sub"),
        _r("Debt-Equity Ratio", c("debt_equity"), money=False),
        _r("TOL / TNW", c("tol_tnw"), money=False),
        _r("TTL / TNW", c("ttl_tnw"), money=False),
        _r("Interest Coverage Ratio", c("interest_coverage"), money=False),
        _r("EFFICIENCY (TURNOVER)", [""] * len(rx), "sub"),
        _r("Stock Turnover Ratio", c("stock_turnover"), money=False),
        _r("Total Assets Turnover Ratio", c("total_assets_turnover"), money=False),
        _r("Fixed Assets Turnover Ratio", c("fixed_assets_turnover"), money=False),
        _r("Working Capital Turnover Ratio", c("wc_turnover"), money=False),
        _r("GROWTH (YoY)", [""] * len(rx), "sub"),
        _r("Growth in Net Sales (%)", c("growth_sales_pct"), money=False),
        _r("Growth in Net Profit (%)", c("growth_profit_pct"), money=False),
        _r("Growth in Net Worth (%)", c("growth_net_worth_pct"), money=False),
        _r("ADDITIONAL", [""] * len(rx), "sub"),
        _r("Tangible Net Worth", c("tangible_net_worth")),
        _r("Net Working Capital", c("net_working_capital")),
    ]
    return {"title": "Ratio Analysis", "kind": "table", "columns": cols, "rows": rows}


def _turnover(results, n=5):
    cols = proj_columns(results, n)
    ops = results.get("operating_statement", [])[:n]
    turnover = [o.get("revenue", 0) for o in ops]
    nwc = _nwc(results, n)
    b = [round(0.25 * t, 2) for t in turnover]
    cc = [round(0.05 * t, 2) for t in turnover]
    e = [round(b[i] - cc[i], 2) for i in range(len(b))]
    f = [round(b[i] - nwc[i], 2) for i in range(len(b))]
    mpbf = [round(min(e[i], f[i]), 2) for i in range(len(b))]
    rows = [
        _r("A. Turnover", turnover, "bold"),
        _r("B. 25% of Turnover", b),
        _r("C. Margin @ 5% of Turnover", cc),
        _r("D. Actual / Projected NWC", nwc),
        _r("E. (B - C)", e),
        _r("F. (B - D)", f),
        _r("G. MPBF (lower of E or F)", mpbf, "bold"),
    ]
    return {"title": "Turnover Method (Nayak Committee)", "kind": "table", "columns": cols, "rows": rows}


def _nwc(results, n=5):
    out = []
    for bs in results.get("balance_sheet", [])[:n]:
        ca = bs["assets"]["current_assets"]["total"]
        cl = bs["liabilities"]["creditors"] + bs["liabilities"]["wc_loan"]
        out.append(round(ca - cl, 2))
    return out


def _mpbf(results, n=5):
    cols = proj_columns(results, n)
    bs_rows = results.get("balance_sheet", [])[:n]
    ca = [b["assets"]["current_assets"]["total"] for b in bs_rows]
    ocl = [b["liabilities"]["creditors"] for b in bs_rows]
    gap = [round(ca[i] - ocl[i], 2) for i in range(len(ca))]
    nwc = _nwc(results, n)
    rows = [_r("FIRST METHOD OF LENDING", [""] * len(ca), "sub"),
            _r("1. Total Current Assets", ca),
            _r("2. Other Current Liabilities", ocl),
            _r("3. Working Capital Gap (1-2)", gap)]
    min1 = [round(0.25 * gap[i], 2) for i in range(len(gap))]
    i6 = [round(gap[i] - min1[i], 2) for i in range(len(gap))]
    i7 = [round(gap[i] - nwc[i], 2) for i in range(len(gap))]
    mpbf1 = [round(max(min(i6[i], i7[i]), 0), 2) for i in range(len(gap))]
    rows += [_r("4. Min Stipulated NWC (25% of Gap)", min1),
             _r("5. Actual / Projected NWC", nwc),
             _r("6. Item 3 - Item 4", i6), _r("7. Item 3 - Item 5", i7),
             _r("8. MPBF First Method", mpbf1, "bold"),
             _r("SECOND METHOD OF LENDING", [""] * len(ca), "sub"),
             _r("1. Total Current Assets", ca),
             _r("2. Other Current Liabilities", ocl),
             _r("3. Working Capital Gap (1-2)", gap)]
    min2 = [round(0.25 * ca[i], 2) for i in range(len(ca))]
    j6 = [round(gap[i] - min2[i], 2) for i in range(len(gap))]
    j7 = [round(gap[i] - nwc[i], 2) for i in range(len(gap))]
    mpbf2 = [round(max(min(j6[i], j7[i]), 0), 2) for i in range(len(gap))]
    rows += [_r("4. Min Stipulated NWC (25% of CA)", min2),
             _r("5. Actual / Projected NWC", nwc),
             _r("6. Item 3 - Item 4", j6), _r("7. Item 3 - Item 5", j7),
             _r("8. MPBF Second Method", mpbf2, "bold")]
    return {"title": "Maximum Permissible Bank Finance (Tandon)", "kind": "table", "columns": cols, "rows": rows}


def _fund_flow(results, n=5):
    cols = proj_columns(results, n)
    ff = results.get("fund_flow", [])[:n]

    def c(k): return [f.get(k, 0) for f in ff]
    rows = [
        _r("1. SOURCES", [""] * len(ff), "sub"),
        _r("  (a) Net Profit", c("net_profit")),
        _r("  (b) Depreciation", c("depreciation")),
        _r("  (c) Increase in Capital", c("increase_in_capital")),
        _r("  (d) Increase in Term Liabilities", c("increase_in_term_liab")),
        _r("  Total Sources", c("total_sources"), "bold"),
        _r("2. USES", [""] * len(ff), "sub"),
        _r("  (a) Purchase of Fixed Assets", c("purchase_fixed_assets")),
        _r("  (b) Repayment of Term Liabilities", c("repayment_term_liab")),
        _r("  Total Uses", c("total_uses"), "bold"),
        _r("3. Long Term Surplus / (Deficit)", c("long_term_surplus"), "bold"),
        _r("4. Increase / (Decrease) in Current Assets", c("increase_in_ca")),
        _r("5. Increase / (Decrease) in Current Liabilities", c("increase_in_cl")),
        _r("6. Increase / (Decrease) in Working Capital", c("increase_in_wc")),
        _r("7. Net Surplus / (Deficit)", c("net_surplus"), "bold"),
    ]
    return {"title": "Fund Flow Statement", "kind": "table", "columns": cols, "rows": rows}


def _cash_flow(results, n=5):
    cols = proj_columns(results, n)
    cf = results.get("cash_flow", [])[:n]

    def c(k): return [x.get(k, 0) for x in cf]
    rows = [
        _r("A. Operating Cash Flow", c("operating_cash"), "bold"),
        _r("   Working Capital Change", c("wc_change")),
        _r("B. Investing Cash Flow", c("investing_cash"), "bold"),
        _r("C. Financing Cash Flow", c("financing_cash"), "bold"),
        _r("Net Increase in Cash (A+B+C)", c("net_cash_flow"), "bold"),
        _r("Opening Cash & Bank", c("opening_cash")),
        _r("Closing Cash & Bank (= Balance Sheet)", c("closing_cash"), "bold"),
    ]
    return {"title": "Cash Flow Statement", "kind": "table", "columns": cols, "rows": rows}


def _dscr(results, n=5):
    cols = proj_columns(results, n)
    ops = results.get("operating_statement", [])[:n]
    rat = results.get("ratios", [])[:n]
    total_a = [o.get("pat", 0) + o.get("depreciation", 0) + o.get("tl_interest", 0) for o in ops]
    total_b = [o.get("tl_interest", 0) + o.get("tl_principal", 0) for o in ops]
    rows = [
        _r("A. CASH ACCRUALS (Sources)", [""] * len(ops), "sub"),
        _r("Net Profit After Tax", [o.get("pat", 0) for o in ops]),
        _r("Add: Depreciation", [o.get("depreciation", 0) for o in ops]),
        _r("Add: Interest on Term Loan", [o.get("tl_interest", 0) for o in ops]),
        _r("Total (A)", total_a, "bold"),
        _r("B. DEBT OBLIGATIONS (Uses)", [""] * len(ops), "sub"),
        _r("Interest on Term Loan", [o.get("tl_interest", 0) for o in ops]),
        _r("Repayment of Term Loan", [o.get("tl_principal", 0) for o in ops]),
        _r("Total (B)", total_b, "bold"),
        _r("DSCR (A / B)", [round(r.get("dscr", 0), 2) for r in rat], "bold", money=False),
    ]
    return {"title": "Debt Service Coverage Ratio (DSCR)", "kind": "table", "columns": cols, "rows": rows}


def _breakeven(results, n=5):
    cols = proj_columns(results, n)
    be = results.get("breakeven", [])[:n]

    def c(k): return [b.get(k, 0) for b in be]
    rows = [
        _r("1. Net Sales", c("net_sales"), "bold"),
        _r("2. Variable Costs", c("variable_costs")),
        _r("3. Contribution (1 - 2)", c("contribution"), "bold"),
        _r("   Contribution (% of Sales)", c("contribution_pct"), money=False),
        _r("4. Fixed Costs", c("fixed_costs")),
        _r("5. Breakeven Point (Sales Value)", c("bep_sales"), "bold"),
        _r("6. Breakeven % (on Net Sales)", c("bep_pct"), money=False),
    ]
    return {"title": "Breakeven Analysis", "kind": "table", "columns": cols, "rows": rows}


def _sensitivity(results, n=5):
    cols = proj_columns(results, n)
    s = results.get("sensitivity", {})
    blocks = [
        ("1. BASE CASE (PROJECTIONS)", "base"),
        ("2. SALES DECREASE BY 10%", "sales_down_10"),
        ("3. RAW MATERIAL / CONSUMABLE COST +10%", "rm_cost_up_10"),
        ("4. INTEREST RATE INCREASE BY 2%", "interest_up_2"),
    ]
    rows = []
    for title, key in blocks:
        rws = s.get(key, [])[:n]
        rows.append(_r(title, [""] * max(len(rws), n), "sub"))
        rows.append(_r("  Net Sales", [r.get("net_sales", 0) for r in rws]))
        rows.append(_r("  Net Profit After Tax", [r.get("pat", 0) for r in rws]))
        rows.append(_r("  DSCR", [r.get("dscr", 0) for r in rws], money=False))
    return {"title": "Sensitivity Analysis", "kind": "table", "columns": cols, "rows": rows}


# Short tab names (<=31 chars, Excel limit), in section order.
_SHEET_NAMES = [
    "Summary", "Operating Statement", "Balance Sheet", "Depreciation Chart",
    "Comparative Statement", "Ratio Analysis", "Turnover Method", "MPBF",
    "Fund Flow Statement", "Cash Flow", "DSCR Analysis", "Breakeven Analysis",
    "Sensitivity Analysis",
]


def build_sections(results: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Ordered CMA sections — the shared content for Excel and PDF."""
    secs = [
        _summary(results),
        _operating_statement(results),
        _balance_sheet(results),
        _depreciation(results),
        _comparative(results),
        _ratios(results),
        _turnover(results),
        _mpbf(results),
        _fund_flow(results),
        _cash_flow(results),
        _dscr(results),
        _breakeven(results),
        _sensitivity(results),
    ]
    for sec, name in zip(secs, _SHEET_NAMES):
        sec["sheet"] = name
    return secs
