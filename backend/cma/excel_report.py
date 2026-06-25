"""
cma/excel_report.py
===================
Builds the multi-sheet CMA workbook in the standard RBI / Nayak-Tandon layout
that banks expect for submission.

Phase A sheets (data-ready from the engine):
    Summary | Depreciation Chart | Cash Flow | DSCR Analysis |
    Turnover Method | MPBF (First & Second Method)

Columns are the projected years; period tags follow CMA convention
(provisional / estimated / projected). Historical (audited) columns and the
remaining statement sheets are added in later phases.
"""

from typing import Dict, Any, List
import io

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ── Palette ───────────────────────────────────────────────────────────────────
_NAVY   = "1E293B"
_ACCENT = "0D9488"
_LIGHT  = "F1F5F9"
_WHITE  = "FFFFFF"

_TITLE_FONT   = Font(bold=True, size=14, color=_WHITE)
_HEADER_FONT  = Font(bold=True, size=9, color=_WHITE)
_LABEL_FONT   = Font(bold=False, size=9)
_BOLD_FONT    = Font(bold=True, size=9)
_SUB_FONT     = Font(bold=True, size=9, color=_ACCENT)

_TITLE_FILL  = PatternFill("solid", fgColor=_NAVY)
_HEADER_FILL = PatternFill("solid", fgColor=_NAVY)
_SUB_FILL    = PatternFill("solid", fgColor=_LIGHT)
_TOTAL_FILL  = PatternFill("solid", fgColor=_LIGHT)

_THIN = Side(style="thin", color="CBD5E1")
_BORDER = Border(left=_THIN, right=_THIN, top=_THIN, bottom=_THIN)
_RIGHT = Alignment(horizontal="right")
_LEFT  = Alignment(horizontal="left")
_CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)

_TAGS = ["(provisional)", "(estimated)", "(projected)", "(projected)", "(projected)"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fy_labels(results: Dict[str, Any], n: int = 5) -> List[str]:
    cd = str(results.get("metadata", {}).get("business", {}).get("commencement_date", ""))
    try:
        start = int(cd[:4])
    except ValueError:
        start = 0
    return [f"{start + i}-{start + i + 1}" if start else f"Year {i + 1}" for i in range(n)]


def _title(ws, text: str, span: int):
    ws.append([text])
    ws.merge_cells(start_row=ws.max_row, start_column=1, end_row=ws.max_row, end_column=span)
    c = ws.cell(ws.max_row, 1)
    c.font = _TITLE_FONT
    c.fill = _TITLE_FILL
    c.alignment = _LEFT
    ws.row_dimensions[ws.max_row].height = 22


def _period_header(ws, results, n=5):
    labels = _fy_labels(results, n)
    ws.append(["Particulars"] + labels)
    r1 = ws.max_row
    ws.append([""] + _TAGS[:n])
    r2 = ws.max_row
    for col in range(1, n + 2):
        for r in (r1, r2):
            cell = ws.cell(r, col)
            cell.fill = _HEADER_FILL if r == r1 else _SUB_FILL
            cell.font = _HEADER_FONT if r == r1 else Font(italic=True, size=8, color="475569")
            cell.alignment = _CENTER if col > 1 else _LEFT
            cell.border = _BORDER


def _row(ws, label: str, values: List[Any], *, bold=False, sub=False, money=True, span=5):
    ws.append([label] + list(values))
    r = ws.max_row
    lab = ws.cell(r, 1)
    lab.font = _SUB_FONT if sub else (_BOLD_FONT if bold else _LABEL_FONT)
    lab.alignment = _LEFT
    if sub:
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=span + 1)
        lab.fill = _SUB_FILL
        return
    for col in range(2, span + 2):
        cell = ws.cell(r, col)
        cell.alignment = _RIGHT
        cell.border = _BORDER
        cell.font = _BOLD_FONT if bold else _LABEL_FONT
        if money and isinstance(cell.value, (int, float)):
            cell.number_format = '#,##0'
        if bold:
            cell.fill = _TOTAL_FILL
    lab.border = _BORDER


def _autosize(ws, first_w=46):
    ws.column_dimensions["A"].width = first_w
    for col in range(2, ws.max_column + 1):
        ws.column_dimensions[get_column_letter(col)].width = 15


# ── Sheet builders ────────────────────────────────────────────────────────────

def _sheet_summary(wb, results):
    ws = wb.create_sheet("Summary")
    meta = results.get("metadata", {})
    biz = meta.get("business", {})
    app = meta.get("applicant", {})
    loan = meta.get("loan", {})
    summ = results.get("summary", {})

    _title(ws, "CMA Report - Summary", 2)
    pairs = [
        ("Firm Name", biz.get("entity_name", "")),
        ("Promoter", app.get("name", "")),
        ("Constitution", biz.get("constitution", "")),
        ("Activity / Industry", biz.get("activity", "")),
        ("PAN No.", app.get("pan", "")),
        ("Commencement Date", biz.get("commencement_date", "")),
        ("", ""),
        ("Project Cost", summ.get("total_project_cost", 0)),
        ("Means of Finance", summ.get("means_of_finance", 0)),
        ("Term Loan", loan.get("amount", 0)),
        ("Interest Rate (%)", loan.get("interest_rate", 0)),
        ("Tenure (months)", loan.get("tenure_months", 0)),
        ("Moratorium (months)", loan.get("moratorium_months", 0)),
        ("Existing Business", "Yes" if summ.get("is_existing_business") else "No"),
        ("Average DSCR", summ.get("avg_dscr", 0)),
    ]
    ws.append(["Field", "Details"])
    for col in (1, 2):
        c = ws.cell(ws.max_row, col)
        c.font = _HEADER_FONT
        c.fill = _HEADER_FILL
    for k, v in pairs:
        ws.append([k, v])
        ws.cell(ws.max_row, 1).font = _BOLD_FONT if k else _LABEL_FONT
        ws.cell(ws.max_row, 2).alignment = _LEFT
    ws.column_dimensions["A"].width = 28
    ws.column_dimensions["B"].width = 40


def _sheet_depreciation(wb, results, n=5):
    ws = wb.create_sheet("Depreciation Chart")
    _title(ws, "Depreciation Chart (WDV Method)", n + 1)
    _period_header(ws, results, n)
    chart = results.get("depreciation_chart", {})
    for cls in chart.get("classes", []):
        yrs = cls["years"]
        if all(y["opening"] == 0 for y in yrs):
            continue  # skip asset classes with no value
        _row(ws, f"{cls['name']}  ({cls['rate']:.0f}%)",
             [y["opening"] for y in yrs], bold=True, span=n)
        _row(ws, "  Less: Depreciation", [y["depreciation"] for y in yrs], span=n)
        _row(ws, "  Written Down Value", [y["wdv"] for y in yrs], span=n)
    totals = chart.get("totals", {})
    if totals:
        _row(ws, "TOTAL Opening (Gross Block)", totals.get("opening", []), bold=True, span=n)
        _row(ws, "TOTAL Depreciation for Year", totals.get("depreciation", []), bold=True, span=n)
        _row(ws, "TOTAL Written Down Value (Net Block)", totals.get("wdv", []), bold=True, span=n)
    _autosize(ws)


def _sheet_cash_flow(wb, results, n=5):
    ws = wb.create_sheet("Cash Flow")
    _title(ws, "Cash Flow Statement", n + 1)
    _period_header(ws, results, n)
    cf = results.get("cash_flow", [])[:n]
    _row(ws, "A. Operating Cash Flow", [c.get("operating_cash", 0) for c in cf], bold=True, span=n)
    _row(ws, "   Working Capital Change", [c.get("wc_change", 0) for c in cf], span=n)
    _row(ws, "B. Investing Cash Flow", [c.get("investing_cash", 0) for c in cf], bold=True, span=n)
    _row(ws, "C. Financing Cash Flow", [c.get("financing_cash", 0) for c in cf], bold=True, span=n)
    _row(ws, "Net Increase in Cash (A+B+C)", [c.get("net_cash_flow", 0) for c in cf], bold=True, span=n)
    _row(ws, "Opening Cash & Bank", [c.get("opening_cash", 0) for c in cf], span=n)
    _row(ws, "Closing Cash & Bank (= Balance Sheet)", [c.get("closing_cash", 0) for c in cf], bold=True, span=n)
    _row(ws, "Reconciles to Balance Sheet?",
         ["Yes" if c.get("reconciles") else "No" for c in cf], money=False, span=n)
    _autosize(ws)


def _sheet_dscr(wb, results, n=5):
    ws = wb.create_sheet("DSCR Analysis")
    _title(ws, "Debt Service Coverage Ratio (DSCR)", n + 1)
    _period_header(ws, results, n)
    os_data = results.get("operating_statement", [])[:n]
    rat = results.get("ratios", [])[:n]

    _row(ws, "A. CASH ACCRUALS (Sources)", [""] * n, sub=True, span=n)
    _row(ws, "Net Profit After Tax", [o.get("pat", 0) for o in os_data], span=n)
    _row(ws, "Add: Depreciation", [o.get("depreciation", 0) for o in os_data], span=n)
    _row(ws, "Add: Interest on Term Loan", [o.get("tl_interest", 0) for o in os_data], span=n)
    total_a = [o.get("pat", 0) + o.get("depreciation", 0) + o.get("tl_interest", 0) for o in os_data]
    _row(ws, "Total (A)", total_a, bold=True, span=n)

    _row(ws, "B. DEBT OBLIGATIONS (Uses)", [""] * n, sub=True, span=n)
    _row(ws, "Interest on Term Loan", [o.get("tl_interest", 0) for o in os_data], span=n)
    _row(ws, "Repayment of Term Loan", [o.get("tl_principal", 0) for o in os_data], span=n)
    total_b = [o.get("tl_interest", 0) + o.get("tl_principal", 0) for o in os_data]
    _row(ws, "Total (B)", total_b, bold=True, span=n)

    _row(ws, "DSCR (A / B)", [round(r.get("dscr", 0), 2) for r in rat], bold=True, money=False, span=n)
    _autosize(ws)
    avg = results.get("summary", {}).get("avg_dscr", 0)
    ws.append(["Average DSCR", avg])
    ws.cell(ws.max_row, 1).font = _BOLD_FONT


def _nwc_series(results, n=5):
    """Net working capital per year = total CA - (creditors + WC bank loan)."""
    out = []
    for bs in results.get("balance_sheet", [])[:n]:
        ca = bs["assets"]["current_assets"]["total"]
        cl = bs["liabilities"]["creditors"] + bs["liabilities"]["wc_loan"]
        out.append(round(ca - cl, 2))
    return out


def _sheet_turnover(wb, results, n=5):
    ws = wb.create_sheet("Turnover Method")
    _title(ws, "Turnover Method (Nayak Committee)", n + 1)
    _period_header(ws, results, n)
    os_data = results.get("operating_statement", [])[:n]
    turnover = [o.get("revenue", 0) for o in os_data]
    nwc = _nwc_series(results, n)
    b = [round(0.25 * t, 2) for t in turnover]          # 25% of turnover
    c = [round(0.05 * t, 2) for t in turnover]          # 5% margin
    e = [round(b[i] - c[i], 2) for i in range(len(b))]  # B - C
    f = [round(b[i] - nwc[i], 2) for i in range(len(b))]  # B - actual NWC
    mpbf = [round(min(e[i], f[i]), 2) for i in range(len(b))]

    _row(ws, "A. Turnover", turnover, bold=True, span=n)
    _row(ws, "B. 25% of Turnover", b, span=n)
    _row(ws, "C. Margin @ 5% of Turnover", c, span=n)
    _row(ws, "D. Actual / Projected NWC", nwc, span=n)
    _row(ws, "E. (B - C)", e, span=n)
    _row(ws, "F. (B - D)", f, span=n)
    _row(ws, "G. MPBF (lower of E or F)", mpbf, bold=True, span=n)
    _autosize(ws)


def _sheet_mpbf(wb, results, n=5):
    ws = wb.create_sheet("MPBF")
    _title(ws, "Maximum Permissible Bank Finance (Tandon)", n + 1)
    _period_header(ws, results, n)
    bs_rows = results.get("balance_sheet", [])[:n]
    ca  = [b["assets"]["current_assets"]["total"] for b in bs_rows]
    ocl = [b["liabilities"]["creditors"] for b in bs_rows]
    gap = [round(ca[i] - ocl[i], 2) for i in range(len(ca))]
    nwc = _nwc_series(results, n)

    # First Method: min stipulated NWC = 25% of Working Capital Gap
    _row(ws, "FIRST METHOD OF LENDING", [""] * n, sub=True, span=n)
    _row(ws, "1. Total Current Assets", ca, span=n)
    _row(ws, "2. Other Current Liabilities", ocl, span=n)
    _row(ws, "3. Working Capital Gap (1-2)", gap, span=n)
    min1 = [round(0.25 * gap[i], 2) for i in range(len(gap))]
    _row(ws, "4. Min Stipulated NWC (25% of Gap)", min1, span=n)
    _row(ws, "5. Actual / Projected NWC", nwc, span=n)
    i6 = [round(gap[i] - min1[i], 2) for i in range(len(gap))]
    i7 = [round(gap[i] - nwc[i], 2) for i in range(len(gap))]
    _row(ws, "6. Item 3 - Item 4", i6, span=n)
    _row(ws, "7. Item 3 - Item 5", i7, span=n)
    mpbf1 = [round(max(min(i6[i], i7[i]), 0), 2) for i in range(len(gap))]
    _row(ws, "8. MPBF First Method (lower of 6/7)", mpbf1, bold=True, span=n)

    # Second Method: min stipulated NWC = 25% of Total Current Assets
    _row(ws, "SECOND METHOD OF LENDING", [""] * n, sub=True, span=n)
    _row(ws, "1. Total Current Assets", ca, span=n)
    _row(ws, "2. Other Current Liabilities", ocl, span=n)
    _row(ws, "3. Working Capital Gap (1-2)", gap, span=n)
    min2 = [round(0.25 * ca[i], 2) for i in range(len(ca))]
    _row(ws, "4. Min Stipulated NWC (25% of CA)", min2, span=n)
    _row(ws, "5. Actual / Projected NWC", nwc, span=n)
    j6 = [round(gap[i] - min2[i], 2) for i in range(len(gap))]
    j7 = [round(gap[i] - nwc[i], 2) for i in range(len(gap))]
    _row(ws, "6. Item 3 - Item 4", j6, span=n)
    _row(ws, "7. Item 3 - Item 5", j7, span=n)
    mpbf2 = [round(max(min(j6[i], j7[i]), 0), 2) for i in range(len(gap))]
    _row(ws, "8. MPBF Second Method (lower of 6/7)", mpbf2, bold=True, span=n)
    _autosize(ws)


def _sheet_ratios(wb, results, n=5):
    ws = wb.create_sheet("Ratio Analysis")
    _title(ws, "Ratio Analysis", n + 1)
    _period_header(ws, results, n)
    rx = results.get("ratios_extended", [])[:n]

    def col(key, fmt2=False):
        vals = []
        for r in rx:
            v = r.get(key)
            vals.append("N/A" if v is None else (round(v, 2) if fmt2 else v))
        return vals

    _row(ws, "PROFITABILITY", [""] * n, sub=True, span=n)
    _row(ws, "Gross Profit Ratio (%)", col("gross_profit_ratio"), money=False, span=n)
    _row(ws, "Net Profit Ratio (%)", col("net_profit_ratio"), money=False, span=n)
    _row(ws, "Return on Capital Employed (%)", col("roce_pct"), money=False, span=n)
    _row(ws, "LIQUIDITY", [""] * n, sub=True, span=n)
    _row(ws, "Current Ratio", col("current_ratio"), money=False, span=n)
    _row(ws, "Quick Ratio", col("quick_ratio"), money=False, span=n)
    _row(ws, "SOLVENCY", [""] * n, sub=True, span=n)
    _row(ws, "Debt-Equity Ratio", col("debt_equity"), money=False, span=n)
    _row(ws, "TOL / TNW", col("tol_tnw"), money=False, span=n)
    _row(ws, "TTL / TNW", col("ttl_tnw"), money=False, span=n)
    _row(ws, "Interest Coverage Ratio", col("interest_coverage"), money=False, span=n)
    _row(ws, "EFFICIENCY (TURNOVER)", [""] * n, sub=True, span=n)
    _row(ws, "Stock Turnover Ratio", col("stock_turnover"), money=False, span=n)
    _row(ws, "Total Assets Turnover Ratio", col("total_assets_turnover"), money=False, span=n)
    _row(ws, "Fixed Assets Turnover Ratio", col("fixed_assets_turnover"), money=False, span=n)
    _row(ws, "Current Assets Turnover Ratio", col("ca_turnover"), money=False, span=n)
    _row(ws, "Working Capital Turnover Ratio", col("wc_turnover"), money=False, span=n)
    _row(ws, "Capital Turnover Ratio", col("capital_turnover"), money=False, span=n)
    _row(ws, "GROWTH (YoY)", [""] * n, sub=True, span=n)
    _row(ws, "Growth in Net Sales (%)", col("growth_sales_pct"), money=False, span=n)
    _row(ws, "Growth in Net Profit (%)", col("growth_profit_pct"), money=False, span=n)
    _row(ws, "Growth in Net Worth (%)", col("growth_net_worth_pct"), money=False, span=n)
    _row(ws, "ADDITIONAL", [""] * n, sub=True, span=n)
    _row(ws, "Tangible Net Worth", col("tangible_net_worth"), span=n)
    _row(ws, "Net Working Capital", col("net_working_capital"), span=n)
    _autosize(ws)


def _sheet_fund_flow(wb, results, n=5):
    ws = wb.create_sheet("Fund Flow Statement")
    _title(ws, "Fund Flow Statement", n + 1)
    _period_header(ws, results, n)
    ff = results.get("fund_flow", [])[:n]

    def col(key):
        return [f.get(key, 0) for f in ff]

    _row(ws, "1. SOURCES", [""] * n, sub=True, span=n)
    _row(ws, "  (a) Net Profit", col("net_profit"), span=n)
    _row(ws, "  (b) Depreciation", col("depreciation"), span=n)
    _row(ws, "  (c) Increase in Capital", col("increase_in_capital"), span=n)
    _row(ws, "  (d) Increase in Term Liabilities", col("increase_in_term_liab"), span=n)
    _row(ws, "  Total Sources", col("total_sources"), bold=True, span=n)
    _row(ws, "2. USES", [""] * n, sub=True, span=n)
    _row(ws, "  (a) Purchase of Fixed Assets", col("purchase_fixed_assets"), span=n)
    _row(ws, "  (b) Repayment of Term Liabilities", col("repayment_term_liab"), span=n)
    _row(ws, "  Total Uses", col("total_uses"), bold=True, span=n)
    _row(ws, "3. Long Term Surplus / (Deficit)", col("long_term_surplus"), bold=True, span=n)
    _row(ws, "4. Increase / (Decrease) in Current Assets", col("increase_in_ca"), span=n)
    _row(ws, "5. Increase / (Decrease) in Current Liabilities", col("increase_in_cl"), span=n)
    _row(ws, "6. Increase / (Decrease) in Working Capital", col("increase_in_wc"), span=n)
    _row(ws, "7. Net Surplus / (Deficit)", col("net_surplus"), bold=True, span=n)
    _autosize(ws, first_w=50)


def _sheet_breakeven(wb, results, n=5):
    ws = wb.create_sheet("Breakeven Analysis")
    _title(ws, "Breakeven Analysis", n + 1)
    _period_header(ws, results, n)
    be = results.get("breakeven", [])[:n]

    def col(key):
        return [b.get(key, 0) for b in be]

    _row(ws, "1. Net Sales", col("net_sales"), bold=True, span=n)
    _row(ws, "2. Variable Costs", col("variable_costs"), span=n)
    _row(ws, "3. Contribution (1 - 2)", col("contribution"), bold=True, span=n)
    _row(ws, "   Contribution (% of Sales)", col("contribution_pct"), money=False, span=n)
    _row(ws, "4. Fixed Costs", col("fixed_costs"), span=n)
    _row(ws, "5. Breakeven Point (Sales Value)", col("bep_sales"), bold=True, span=n)
    _row(ws, "6. Breakeven % (on Net Sales)", col("bep_pct"), money=False, span=n)
    _autosize(ws)


def _sheet_sensitivity(wb, results, n=5):
    ws = wb.create_sheet("Sensitivity Analysis")
    _title(ws, "Sensitivity Analysis", n + 1)
    _period_header(ws, results, n)
    s = results.get("sensitivity", {})

    blocks = [
        ("1. BASE CASE (PROJECTIONS)", "base"),
        ("2. SALES DECREASE BY 10%", "sales_down_10"),
        ("3. RAW MATERIAL / CONSUMABLE COST +10%", "rm_cost_up_10"),
        ("4. INTEREST RATE INCREASE BY 2%", "interest_up_2"),
    ]
    for title, key in blocks:
        rows = s.get(key, [])[:n]
        _row(ws, title, [""] * n, sub=True, span=n)
        _row(ws, "  Net Sales", [r.get("net_sales", 0) for r in rows], span=n)
        _row(ws, "  Net Profit After Tax", [r.get("pat", 0) for r in rows], span=n)
        _row(ws, "  DSCR", [r.get("dscr", 0) for r in rows], money=False, span=n)
    _autosize(ws)


# ── Public entry point ────────────────────────────────────────────────────────

def build_cma_workbook(results: Dict[str, Any]) -> bytes:
    """Build the CMA workbook (Phase A + B sheets) and return xlsx bytes."""
    wb = Workbook()
    wb.remove(wb.active)  # drop default sheet

    # Phase A
    _sheet_summary(wb, results)
    _sheet_depreciation(wb, results)
    _sheet_cash_flow(wb, results)
    _sheet_dscr(wb, results)
    _sheet_turnover(wb, results)
    _sheet_mpbf(wb, results)
    # Phase B
    _sheet_ratios(wb, results)
    _sheet_fund_flow(wb, results)
    _sheet_breakeven(wb, results)
    _sheet_sensitivity(wb, results)

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()
