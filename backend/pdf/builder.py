"""
pdf_builder.py  —  Generates the full Combined CMA + DPR PDF.
Call:  build_pdf(inp_dict, cma_data, dpr_data, output_path)

REBUILD NOTE: the report is organised into three layers, per an explicit
restructuring request:
  Layer 1 — Banker Summary       (Sections 01-10): cover, credit summary,
            loan proposal, applicant/project/funding — a banker should be
            able to decide from this layer alone.
  Layer 2 — Financial Analysis   (Sections 11-30): assumptions through
            revenue, costs, P&L, working capital, assets, debt, cash flow,
            balance sheet, DSCR, ratios, break-even, sensitivity, risk.
  Layer 3 — Methodology & Audit  (Sections 31-34): formula definitions,
            reconciliation status, declaration.

Every number still comes from the same single calculation engine
(calculations/*.py via pdf/generator.py) — this file only changed WHERE
each figure is displayed and REMOVED duplicate restatements of the same
figure across multiple sections. No calculation logic was touched.

Sections deliberately removed as duplicates/empty (per explicit request):
  - "Profitability Index" as a separate late-report page -> merged into
    Financial Analysis right after the P&L (Section 16).
  - Q1 (Repayment Coverage) and old Section N (DSCR detail) restated DSCR
    twice -> merged into one DSCR & Debt Servicing section (26).
  - Q3 (Promoter Net Worth) was disconnected from promoter contribution ->
    merged into Promoter Contribution (10).
  - Q4 (Internal Viability Assessment) repeated ratios already in Q2 ->
    merged into Financial Ratio Analysis (27) as the closing verdict row.
  - The old standalone "SECTION IX — Executive Financial Summary" (AI
    observations) duplicated the cover-page Executive Observations ->
    merged into Executive Credit Summary (02).
  - Sensitivity Analysis: 6 scenarios reduced to 5 (dropped the +20% "Best
    Case" extreme, which added a scenario without changing the reading).
  - Form IV: the live calculation pipeline never populates it (a legacy,
    field-name-incompatible pipeline does) — removed entirely rather than
    risk showing fabricated zeros, or a header with nothing under it.
  - Appendix's separately-repeated "P&L Formula Chain" and "Initial
    Investment Structure" paragraphs — both already fully shown, once,
    as actual tables in Sections 08/09/15 — removed from the appendix to
    avoid restating the same structure a third time in prose.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, PageBreak, HRFlowable
)
from datetime import datetime
from core.engine import dscr_label, R, validate_cma_dpr

# ── Scheme name resolver (for display in PDF) ─────────────────────────────────
_SCHEME_DISPLAY: dict = {
    "pmegp":           "PMEGP — Pradhan Mantri Employment Generation Programme",
    "mudra":           "Mudra Loan — Kishor Category",
    "mudra_shishu":    "Mudra Loan -- Shishu Category (upto Rs.50,000)",
    "mudra_kishor":    "Mudra Loan -- Kishor Category (Rs.50K - Rs.5L)",
    "mudra_tarun":     "Mudra Loan -- Tarun Category (Rs.5L - Rs.10L)",
    "mudra_tarunplus": "Mudra Loan -- TarunPlus Category (Rs.10L - Rs.20L)",
    "cgtmse":          "CGTMSE — Credit Guarantee Fund Trust for Micro & Small Enterprises",
    "msme_psu":        "Normal MSME Term Loan — PSU Bank Finance",
    "normal_msme":     "Normal MSME Term Loan — PSU Bank Finance",
    "other_scheme":    "MSME Bank Loan",
}

def scheme_display(raw: str) -> str:
    """Return the full official scheme name for PDF display."""
    key = (raw or "").strip().lower().replace(" ", "_").replace("-", "_")
    return _SCHEME_DISPLAY.get(key) or raw.title() or "MSME Bank Loan"

def scheme_short(raw: str) -> str:
    """Return short form: PMEGP / Mudra Kishor / CGTMSE / MSME."""
    key = (raw or "").strip().lower().replace(" ", "_")
    short_map = {
        "pmegp": "PMEGP", "mudra": "Mudra Kishor", "mudra_shishu": "Mudra Shishu",
        "mudra_kishor": "Mudra Kishor", "mudra_tarun": "Mudra Tarun",
        "mudra_tarunplus": "Mudra TarunPlus", "cgtmse": "CGTMSE",
        "msme_psu": "MSME PSU", "normal_msme": "MSME PSU", "other_scheme": "MSME Loan",
    }
    return short_map.get(key) or raw.upper()[:15] or "MSME"

# ── Colours ───────────────────────────────────────────────────────────────────
DG  = colors.HexColor("#0B1F3A")
MG  = colors.HexColor("#173B63")
LG  = colors.HexColor("#DCEAF7")
ALT = colors.HexColor("#F6FAFE")
RED = colors.HexColor("#F8D7DA")
AMB = colors.HexColor("#FFF3CD")
GRN = colors.HexColor("#D6EAF8")
GRY = colors.HexColor("#CBD5E1")
W   = colors.white
BLK = colors.black
DGR = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748B")

# ── Styles ────────────────────────────────────────────────────────────────────
def _s(name, **kw): return ParagraphStyle(name, **kw)
ST = {
    "cover_title":  _s("ct", fontSize=22, textColor=W,   alignment=TA_CENTER, leading=28, fontName="Helvetica-Bold"),
    "cover_sub":    _s("cs", fontSize=12, textColor=LG,  alignment=TA_CENTER, leading=18, fontName="Helvetica"),
    "cover_body":   _s("cb", fontSize=10, textColor=W,   alignment=TA_CENTER, leading=15, fontName="Helvetica"),
    "h1":           _s("h1", fontSize=12, textColor=W,   leading=17, fontName="Helvetica-Bold"),
    "h2":           _s("h2", fontSize=10, textColor=DG,  leading=14, fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=2),
    "normal":       _s("nm", fontSize=8.5,textColor=DGR, leading=13, fontName="Helvetica"),
    "bold":         _s("bd", fontSize=8.5,textColor=BLK, leading=13, fontName="Helvetica-Bold"),
    "small":        _s("sm", fontSize=7,  textColor=MUTED, leading=11, fontName="Helvetica"),
    "bullet":       _s("bl", fontSize=8.5,textColor=DGR, leading=13, fontName="Helvetica",
                        leftIndent=10, bulletIndent=0, spaceAfter=1),
    "rec_approve":  _s("ra", fontSize=14, textColor=W,   alignment=TA_CENTER, leading=20, fontName="Helvetica-Bold"),
    "rec_box":      _s("rb", fontSize=9,  textColor=DGR, alignment=TA_CENTER, leading=13, fontName="Helvetica"),
}

# ── Format helpers ────────────────────────────────────────────────────────────
def rs(v):
    try:    return f"Rs. {float(v):,.0f}"
    except: return str(v)

def rp(v):
    try:    return f"{float(v)*100:.1f}%"
    except: return str(v)

def rp2(v):
    try:    return f"{float(v):.1f}%"
    except: return str(v)

def r(v):
    try:    return f"{float(v):,.0f}"
    except: return str(v)

def r2(v):
    try:    return f"{float(v):,.2f}"
    except: return str(v)

def pof(num, den):
    try:    return f"{float(num)/float(den)*100:.1f}%"
    except: return "N/A"

def _o1_expense_breakdown(cma: dict, inp: dict) -> dict:
    """Section O1's itemized monthly expense rows — reconciled to foot exactly
    to their own displayed Sub-Total Fixed / Sub-Total Variable / TOTAL MONTHLY
    EXPENSES.

    BUG FIX: "fixed_total"/"variable_total"/"total_monthly_exp" are synced to
    the annual income-statement's Year-1 figures (P1: Master Engine Sync in
    generator.py) — which apply a PF/benefits loading to salary that
    monthly_pnl.py's own (unsynced) "fixed_salary" never did. That left this
    table's own listed rows short of its own displayed total whenever that
    loading applied. Salary is derived as the residual against the
    authoritative fixed_total; the "other variable" items are scaled
    proportionally (relative shares preserved) against the authoritative
    variable_total — same technique used for the capacity/revenue table fix.
    """
    rent        = float(cma.get("rent") or inp.get("rent", 0) or inp.get("monthly_rent", 0) or 0)
    fixed_total = float(cma.get("fixed_total", 0) or 0)
    salary      = max(fixed_total - rent, 0)

    cogs         = float(cma.get("cogs_monthly", cma.get("raw_material_monthly", 0)) or 0)
    marketing    = float(cma.get("mktg_monthly", 0) or 0)
    variable_total = float(cma.get("variable_total", 0) or 0)
    other_items = {
        "stationery":           float(inp.get("stationery",           0) or 0),
        "electricity_water":    float(inp.get("electricity_water",    0) or 0),
        "repair_maintenance":   float(inp.get("repair_maintenance",   0) or 0),
        "transport_conveyance": float(inp.get("transport_conveyance", 0) or 0),
        "telephone_internet":   float(inp.get("telephone_internet",   0) or 0),
        "miscellaneous":        float(inp.get("miscellaneous",        0) or 0),
    }
    other_var_raw    = sum(other_items.values())
    other_var_target = max(variable_total - cogs - marketing, 0)
    other_scale      = (other_var_target / other_var_raw) if other_var_raw else 1

    return {
        "rent": rent, "salary": salary, "fixed_total": fixed_total,
        "cogs": cogs, "marketing": marketing, "variable_total": variable_total,
        "total_monthly_exp": float(cma.get("total_monthly_exp", 0) or 0),
        **{k: v * other_scale for k, v in other_items.items()},
    }

def _fmt_payback(cma):
    """Return payback months as string or 'N/A' — never '0 months'."""
    if cma.get("payback_not_achievable"):
        return "N/A"
    be = cma.get("breakeven_months", 0)
    if str(be).upper() == "N/A" or not be:
        return "N/A"
    try:
        v = float(be)
        return "N/A" if v <= 0 else str(round(v, 1))
    except Exception:
        return "N/A"

def _display_risk_matrix(industry: str) -> list:
    """Industry-specific displayed risks only; does not affect calculations."""
    key = str(industry or "manufacturing").lower()
    if key in ("service", "services"):
        return [
            {"category": "Client Payment Delays", "description": "Delayed collections may stretch working capital and EMI servicing.", "probability": "Medium", "impact": "High", "net_risk": "High"},
            {"category": "Customer Churn", "description": "Loss of recurring clients can reduce monthly billing visibility.", "probability": "Medium", "impact": "Medium", "net_risk": "Medium"},
            {"category": "Pricing Pressure", "description": "Competitive quotations may compress service margins.", "probability": "Medium", "impact": "Medium", "net_risk": "Medium"},
            {"category": "Manpower Dependency", "description": "Delivery quality depends on skilled staff availability and retention.", "probability": "Medium", "impact": "High", "net_risk": "High"},
            {"category": "Technology Obsolescence", "description": "Tools, software, or service platforms may require periodic upgrades.", "probability": "Low", "impact": "Medium", "net_risk": "Medium"},
            {"category": "GST / Compliance", "description": "Invoice, GST return, and TDS compliance delays may affect receivables.", "probability": "Low", "impact": "Medium", "net_risk": "Medium"},
        ]
    if key == "trading":
        return [
            {"category": "Inventory Obsolescence", "description": "Slow-moving stock may require discounting or write-downs.", "probability": "Medium", "impact": "High", "net_risk": "High"},
            {"category": "Stock Shrinkage", "description": "Pilferage, expiry, or storage losses can reduce gross margin.", "probability": "Medium", "impact": "Medium", "net_risk": "Medium"},
            {"category": "Supplier Dependency", "description": "Concentration with few suppliers can disrupt availability and pricing.", "probability": "Medium", "impact": "Medium", "net_risk": "Medium"},
            {"category": "Demand Fluctuation", "description": "Seasonality or local demand changes may affect turnover.", "probability": "Medium", "impact": "Medium", "net_risk": "Medium"},
            {"category": "Price Competition", "description": "Local competitors or online sellers may pressure selling prices.", "probability": "High", "impact": "Medium", "net_risk": "High"},
        ]
    return [
        {"category": "Raw Material Volatility", "description": "Input price movement can affect gross margin and cash cycle.", "probability": "Medium", "impact": "High", "net_risk": "High"},
        {"category": "Machine Breakdown", "description": "Equipment downtime can interrupt production and dispatches.", "probability": "Medium", "impact": "High", "net_risk": "High"},
        {"category": "WIP Delays", "description": "Longer processing cycle may increase working capital requirement.", "probability": "Medium", "impact": "Medium", "net_risk": "Medium"},
        {"category": "Production Disruption", "description": "Power, labour, or supply disruption may reduce capacity utilisation.", "probability": "Medium", "impact": "High", "net_risk": "High"},
        {"category": "Quality Failures", "description": "Rejection, rework, or warranty claims can reduce profitability.", "probability": "Low", "impact": "High", "net_risk": "Medium"},
    ]

def _scheme_advisory(inp: dict, cma: dict) -> str:
    scheme = str(inp.get("scheme", "")).lower()
    promoter_pct = float(cma.get("promoter_pct", 0) or 0)
    if "pmegp" in scheme:
        return "PMEGP advisory: verify eligible project-cost limit, category-wise promoter margin, and subsidy/TDR lock-in with DIC/KVIC before bank submission."
    if "mudra" in scheme:
        return "Mudra advisory: ensure loan amount fits the selected Shishu/Kishor/Tarun/TarunPlus band and the activity is non-farm micro enterprise."
    if "cgtmse" in scheme or "msme" in scheme:
        return "CGTMSE/PSU advisory: confirm Udyam registration, collateral-free eligibility, guarantee cover, and bank-specific promoter margin norms."
    if promoter_pct < 10:
        return "Margin advisory: promoter contribution appears below common MSME comfort levels; bank may request higher margin or support."
    return "Scheme advisory: final eligibility, margin, and guarantee treatment remain subject to bank and scheme guidelines."

# ── Table style builders ──────────────────────────────────────────────────────
def BTS(alt=True):
    cmds: list = [
        ("BACKGROUND",     (0,0),(-1, 0), MG),
        ("TEXTCOLOR",      (0,0),(-1, 0), W),
        ("FONTNAME",       (0,0),(-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",       (0,0),(-1,-1), 8),
        ("GRID",           (0,0),(-1,-1), 0.4, GRY),
        ("TOPPADDING",     (0,0),(-1,-1), 3),
        ("BOTTOMPADDING",  (0,0),(-1,-1), 3),
        ("LEFTPADDING",    (0,0),(-1,-1), 4),
        ("RIGHTPADDING",   (0,0),(-1,-1), 4),
        ("VALIGN",         (0,0),(-1,-1), "MIDDLE"),
    ]
    if alt:
        cmds.append(("ROWBACKGROUNDS", (0,1),(-1,-1), [W, ALT]))
    return TableStyle(cmds)

def TOT(row):
    return TableStyle([
        ("FONTNAME",   (0,row),(-1,row), "Helvetica-Bold"),
        ("BACKGROUND", (0,row),(-1,row), LG),
    ])

def RISK_COLOR(row, level):
    bg = RED if level=="HIGH" else AMB if level=="MEDIUM" else GRN
    return TableStyle([("BACKGROUND",(0,row),(-1,row),bg)])

def SEC(title, story):
    t = Table([[Paragraph(title, ST["h1"])]], colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), MG),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 4))

def PB(story): story.append(PageBreak())

def H2(text, story):
    story.append(Paragraph(text, ST["h2"]))

def NL(story, h=4): story.append(Spacer(1, h))

def _box(title, story):
    """A light boxed sub-heading — used for A/B/C style groupings within a section."""
    t = Table([[Paragraph(title, ST["h2"])]], colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), LG),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("BOX",           (0,0),(-1,-1), 1.2, MG),
    ]))
    story.append(t)
    NL(story, 2)

# ── Main builder ──────────────────────────────────────────────────────────────
def build_pdf(inp: dict, cma: dict, dpr: dict, output_path: str):
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=18*mm,  bottomMargin=18*mm,
    )
    story = []
    pc  = dpr["project_cost"]
    dep = dpr["depreciation"]
    mc  = dpr["machinery"]
    rm  = dpr["raw_materials"]
    man = dpr["manpower"]
    tl  = dpr["term_loan"]
    wc  = dpr["working_capital_years"]
    cop = dpr["profit_and_loss_years"]
    pbs = dpr["balance_sheet_years"]
    pcf = dpr["cash_flow_years"]
    bep = dpr["breakeven_years"]
    dscr= dpr["dscr"]
    prof= dpr["profitability"]
    ps  = dpr["project_summary"]
    primary_product = (
        inp.get("products", [{}])[0].get("category")
        if inp.get("products") else "Primary Product / Service"
    ) or "Primary Product / Service"
    # Single industry variable used by all sections for conditional labels
    _industry = str(inp.get("industry", inp.get("industry_type", "manufacturing"))).lower()
    _is_trading   = _industry == "trading"
    _is_service   = _industry == "service"
    _is_agri      = _industry in ("agriculture", "agro_processing", "agro-processing")
    _is_mfg       = not (_is_trading or _is_service or _is_agri)
    _is_trading_service = not _is_mfg
    display_total_project_cost = (
        cma.get("total_project_cost")
        or sum(float(item.get("amount", 0) or 0) for item in cma.get("project_cost_items", []))
        or pc["total_project_cost"]
    )
    display_loan_amount = cma.get("total_loan") or R(pc["term_loan"] + pc["wc_loan"], 2)
    display_promoter_fixed_equity = (
        cma.get("promoter_fixed_equity")
        or pc.get("promoter_fixed_equity")
        or pc.get("equity_capital")
        or 0
    )
    display_promoter_wc_margin = cma.get("promoter_wc_margin") or (wc[0].get("margin", 0) if wc else 0)
    display_promoter_contribution = (
        cma.get("total_promoter_contribution")
        or cma.get("promoter_contribution")
        or pc.get("total_promoter_contribution")
        or R(display_promoter_fixed_equity + display_promoter_wc_margin, 2)
    )
    _scheme_raw   = inp.get("scheme", "MSME")
    _scheme_full  = scheme_display(_scheme_raw)
    _scheme_short = scheme_short(_scheme_raw)
    _is_pmegp  = "pmegp" in _scheme_raw.lower()
    _is_mudra  = "mudra" in _scheme_raw.lower()
    _is_cgtmse = "cgtmse" in _scheme_raw.lower()
    _subsidy_label = "Govt Subsidy — PMEGP" if _is_pmegp else "State Capital Subsidy"
    _industry_str = str(inp.get("industry", inp.get("industry_type", "Manufacturing"))).title()
    _nature_biz   = inp.get("nature_of_business", inp.get("business_description", ""))
    _promoter_name= f"{inp.get('title','').strip()} {inp.get('full_name', inp.get('entrepreneur_name',''))}".strip()
    _bank_name    = inp.get("bank_name", inp.get("preferred_bank", ""))
    ref_no = f"CMA/{_scheme_short}/{datetime.now().strftime('%Y%m')}/{str(abs(hash(inp.get('entrepreneur_name','X'))))[:6]}"

    # ════════════════════════════════════════════════════════════════
    # PART I — BANKER / CREDIT SUMMARY  (Sections 01-10)
    # ════════════════════════════════════════════════════════════════

    # ── SECTION 01 — COVER PAGE ────────────────────────────────────────
    NL(story, int(15*mm))
    cover = Table([
        [Paragraph("Business Loan Feasibility Report", ST["cover_title"])],
        [Paragraph("Indicative Financial Assessment Based on Applicant Inputs", ST["cover_sub"])],
        [Spacer(1, 6)],
        [Paragraph(f"Scheme: {_scheme_short}", ST["cover_sub"])],
        [Spacer(1, 4)],
        [Paragraph(f"{_promoter_name}", ST["cover_sub"])],
        [Paragraph(f"{inp.get('business_name','')}", ST["cover_body"])],
        [Spacer(1, 4)],
        [Paragraph(f"{_industry_str} | {_nature_biz[:60] if _nature_biz else 'Business Activity'}", ST["cover_body"])],
    ], colWidths=[170*mm])
    cover.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), DG),
        ("TOPPADDING",    (0,0),(-1,-1), 10),
        ("BOTTOMPADDING", (0,0),(-1,-1), 10),
    ]))
    story.append(cover)
    NL(story, int(8*mm))

    scheme_note = ""
    if _is_pmegp:
        mm_pct = cma.get("margin_money_pct", 0)
        mm_amt = cma.get("margin_money", 0)
        scheme_note = f"PMEGP Subsidy: {mm_pct:.0f}% = Rs.{mm_amt:,.0f} (TDR held for 3 yrs) | No collateral required"
    elif _is_mudra:
        scheme_note = "Mudra Loan: Collateral-free as per RBI guidelines | CGFMU guarantee cover"
    elif _is_cgtmse:
        scheme_note = "CGTMSE Cover: No physical collateral required | Guarantee fee applicable"
    else:
        scheme_note = "Standard MSME Term Loan | Subject to bank credit policy"

    scheme_banner = Table([[Paragraph(scheme_note, ST["small"])]], colWidths=[170*mm])
    scheme_banner.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1), MG),("TEXTCOLOR",(0,0),(-1,-1), W),
        ("TOPPADDING",(0,0),(-1,-1), 5),("BOTTOMPADDING",(0,0),(-1,-1), 5),
        ("LEFTPADDING",(0,0),(-1,-1), 8),
    ]))
    story.append(scheme_banner)
    NL(story, int(6*mm))

    info = Table([
        ["Field", "Details"],
        ["Applicant / Business Name", f"{_promoter_name}  —  {inp.get('business_name','')}"],
        ["Business Type / Loan Purpose", f"{_industry_str}" + (f" | {_nature_biz[:40]}" if _nature_biz else "")],
        ["Total Project Cost",   rs(display_total_project_cost)],
        ["Term Loan Requested",  rs(pc["term_loan"])],
        ["Working Capital Facility Requested", rs(R(cma.get("working_capital_loan", pc.get("wc_loan", 0)) or 0, 2))],
        ["Total Bank Exposure",  rs(display_loan_amount)],
        ["Promoter Contribution",rs(display_promoter_contribution)],
        ["Preferred Bank",       _bank_name or "As per applicant's choice"],
        ["Report Reference",     ref_no],
        ["Date Prepared",        datetime.now().strftime("%d %B %Y")],
        ["Valid Until",          f"{inp.get('report_validity_days', 120)} days from date of preparation"],
    ], colWidths=[65*mm, 105*mm])
    info.setStyle(BTS())
    story.append(info)
    NL(story, int(8*mm))
    story.append(Paragraph(
        "Preliminary financial assessment only. Final bank appraisal subject to independent verification "
        "by the financial institution. Not for public circulation. CONFIDENTIAL.", ST["small"]))
    PB(story)

    # ── SECTION 02 — EXECUTIVE CREDIT SUMMARY ──────────────────────────
    _avg_dscr_val   = float(cma.get("avg_dscr", 0) or 0)
    _annual_pat_v   = float(cma.get("annual_pat", 0) or 0)
    _annual_ebitda_v = float(cma.get("annual_ebitda", 0) or 0)
    _is_not_bankable = (
        _avg_dscr_val < 1.25
        or _annual_pat_v < 0
        or _annual_ebitda_v < 0
        or cma.get("payback_not_achievable", False)
        or "REJECT" in str(cma.get("recommendation", "")).upper()
    )
    if _is_not_bankable:
        _reasons = []
        if _avg_dscr_val < 1.25:
            _reasons.append(f"Term Loan DSCR {round(_avg_dscr_val,2)}x is below the 1.25x illustrative benchmark")
        if _annual_pat_v < 0:
            _reasons.append("Net Profit (PAT) is negative")
        if _annual_ebitda_v < 0:
            _reasons.append("EBITDA is negative — operating losses")
        if cma.get("payback_not_achievable", False):
            _reasons.append("Payback period not achievable")
        # This platform assesses viability — it does not impersonate the
        # sanctioning bank's own credit decision.
        nb_tbl = Table(
            [[Paragraph("⚠ FINANCIAL VIABILITY ASSESSMENT — HIGH RISK UNDER CURRENT ASSUMPTIONS", ST["rec_approve"])]],
            colWidths=[170*mm]
        )
        nb_tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), colors.HexColor("#B71C1C")),
            ("TOPPADDING",    (0,0),(-1,-1), 8),
            ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ]))
        story.append(nb_tbl)
        NL(story, 3)
        story.append(Paragraph(
            "Reasons: " + " | ".join(_reasons) + ". "
            "Revise revenue projections, reduce costs, or adjust loan tenure before bank submission.",
            ST["small"]))
        NL(story, 6)

    SEC("SECTION 02 — EXECUTIVE CREDIT SUMMARY", story)

    # Neutral feasibility-assessment labels, never lending-decision language.
    _rec_raw = cma.get("recommendation", "") or ""
    _rec_display_map = {
        "APPROVED":                "MEETS VIABILITY BENCHMARKS",
        "APPROVE":                 "MEETS VIABILITY BENCHMARKS",
        "APPROVE WITH CONDITIONS": "CONDITIONALLY VIABLE — SEE CONDITIONS",
        "REFER FOR REVIEW":        "REQUIRES FURTHER REVIEW",
        "REJECT":                  "DOES NOT MEET VIABILITY BENCHMARKS",
    }
    _rec_display = str(_rec_display_map.get(_rec_raw, _rec_raw or ""))
    rec_color = DG if "VIABLE" in _rec_display or "MEETS" in _rec_display else colors.HexColor("#B71C1C")
    rec_box = Table([[Paragraph(_rec_display, ST["rec_approve"])]], colWidths=[170*mm])
    rec_box.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), rec_color),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
    ]))
    story.append(rec_box)
    NL(story, 5)

    H2("Project & Funding Snapshot", story)
    _exec_wc_loan   = R(cma.get("working_capital_loan", pc.get("wc_loan", 0)) or 0, 2)
    _exec_wc_margin = R(float(wc[0].get("margin", 0) if wc else 0), 2)
    _exec_wc_total  = R(_exec_wc_margin + _exec_wc_loan, 2)
    snap = Table([
        ["Particular", "Amount / Value", "Particular", "Amount / Value"],
        ["Total Project Cost",          rs(display_total_project_cost), "Fixed Project Cost", rs(R(pc["term_loan"] + display_promoter_fixed_equity, 2))],
        ["Working Capital Requirement", rs(_exec_wc_total),             "Promoter Contribution", rs(display_promoter_contribution)],
        ["Term Loan",                   rs(pc["term_loan"]),            "Working Capital Finance", rs(_exec_wc_loan)],
        ["Total Bank Exposure",         rs(display_loan_amount),        "Proposed Tenure", f"{inp.get('loan_tenure_years',5)} years"],
        ["Moratorium",                  f"{int(inp.get('moratorium_months', inp.get('moratorium_years', 0) * 12) or 0)} months", "Interest Rate", rp(tl.get("interest_rate", inp.get("term_loan_interest",0)))],
    ], colWidths=[45*mm,40*mm,45*mm,40*mm])
    snap.setStyle(BTS())
    story.append(snap)
    NL(story, 5)

    H2("Financial Snapshot (Year 1 → Year 5)", story)
    fin_snap = Table(
        [["Metric"] + [f"Year {i+1}" for i in range(5)]] +
        [
            ["Revenue (Rs.)"]      + [r(cy["revenue"])       for cy in cop],
            ["EBITDA (Rs.)"]       + [r(cy.get("ebitda", 0)) for cy in cop],
            ["PAT (Rs.)"]          + [r(cy["net_profit"])    for cy in cop],
            ["Term Loan DSCR"]     + [str(d["dscr"])         for d in dscr["years"]],
        ],
        colWidths=[35*mm]+[27*mm]*5
    )
    fin_snap.setStyle(BTS())
    story.append(fin_snap)
    NL(story, 3)
    story.append(Paragraph(
        f"<b>Average Term Loan DSCR:</b> {cma.get('avg_dscr', dscr['average'])}  |  "
        f"<b>Current Ratio:</b> {r2(cma['current_ratio'])}  |  "
        f"<b>Term Loan D:E:</b> {round(pc['term_loan'] / max(display_promoter_fixed_equity, 1), 2) if display_promoter_fixed_equity else 0} : 1  |  "
        f"<b>Promoter % of Initial Investment:</b> {pof(display_promoter_contribution, display_total_project_cost)}  |  "
        f"<b>Break-even:</b> " + ("Not achievable under current projections" if (cma.get("payback_not_achievable") or str(cma.get("breakeven_months","")).upper()=="N/A" or float(cma.get("breakeven_months",0) if isinstance(cma.get("breakeven_months"),(int,float)) else 0)==0) else f"within {round(float(cma.get('breakeven_months',0)),1)} months"),
        ST["small"]))
    NL(story, 5)

    H2("Credit Assessment", story)
    _obs_dscr_bench   = float(cma.get("dscr_benchmark", 1.25) or 1.25)
    _obs_avg_dscr     = float(cma.get("avg_dscr", dscr["average"]) or 0)
    _obs_annual_pat   = float(cma.get("annual_pat", 0) or 0)
    strengths, weaknesses = [], []
    if display_promoter_contribution > 0.1 * display_total_project_cost:
        strengths.append(f"Promoter contribution of {pof(display_promoter_contribution, display_total_project_cost)} of initial investment is above the common 10% comfort level.")
    if cma.get("current_ratio", 0) > 1.33:
        strengths.append(f"Current Ratio of {r2(cma['current_ratio'])} indicates adequate short-term liquidity cover.")
    if float(man.get("promoter_annual", 0) or 0) <= 0:
        weaknesses.append("Promoter remuneration not considered — profitability may be overstated.")
    if _obs_avg_dscr < _obs_dscr_bench:
        weaknesses.append(f"Average Term Loan DSCR of {round(_obs_avg_dscr,2)}x is below the {_obs_dscr_bench}x illustrative benchmark.")
    if _obs_annual_pat < 0:
        weaknesses.append(f"Annual PAT is negative (Rs.{_obs_annual_pat:,.0f}) — the project is loss-making under stated assumptions.")
    if display_promoter_contribution > 0 and display_loan_amount / max(display_promoter_contribution, 1) > 3:
        weaknesses.append("Leverage is high relative to promoter contribution.")
    _funding_gap_total = sum(float(pb.get("short_term_funding", 0) or 0) for pb in pbs[1:] if float(pb.get("short_term_funding", 0) or 0) > 0)
    if not strengths:
        strengths.append("No specific strengths identified under current assumptions — revenue and cost assumptions should be revisited.")
    for s_ in strengths:
        story.append(Paragraph(f"• <b>Strength:</b> {s_}", ST["bullet"]))
    for w_ in weaknesses:
        story.append(Paragraph(f"• <b>Weakness/Risk:</b> {w_}", ST["bullet"]))
    if _funding_gap_total > 0:
        story.append(Paragraph(
            f"• <b>Funding Gap:</b> the model shows an unfunded cash shortfall building up to "
            f"Rs.{max(float(pb.get('short_term_funding',0) or 0) for pb in pbs[1:]):,.0f} by Year 5 "
            "(see Section 25, Balance Sheet — shown as negative cash, not an arranged facility).",
            ST["bullet"]))
    story.append(Paragraph(
        f"• <b>Overall Assessment:</b> Viability Grade <b>{cma['credit_rating']}</b>, Risk Level <b>{cma['risk_level']}</b>. "
        + ("This is currently a high-risk proposal that should not be submitted without revising assumptions." if _is_not_bankable
           else "This proposal meets the platform's illustrative viability benchmarks."),
        ST["bullet"]))
    story.append(Paragraph(_scheme_advisory(inp, cma), ST["bullet"]))
    NL(story, 3)
    story.append(Paragraph(
        "<i>Note: the above assessment is derived mechanically from the financial data and assumptions "
        "provided — it is not a substitute for a qualified CA's or the sanctioning bank's own appraisal.</i>",
        ST["small"]))
    PB(story)

    # ── SECTION 03 — LOAN PROPOSAL / CREDIT STRUCTURE ──────────────────
    SEC("SECTION 03 — LOAN PROPOSAL / CREDIT STRUCTURE", story)
    _morat_mo = inp.get("moratorium_months", inp.get("moratorium_years", 0) * 12)
    _morat_str = f"{_morat_mo} Month(s)" if _morat_mo > 0 else "None"
    H2("A. Term Loan", story)
    tl_prop = Table([
        ["Parameter","Value","Parameter","Value"],
        ["Amount",              rs(tl["amount"]),               "Purpose",           "Fixed Capital Expenditure"],
        ["Interest Rate",       rp(tl["interest_rate"]),         "Moratorium",        _morat_str],
        ["Repayment Frequency", "Half-yearly (reducing balance)", "Tenure",           f"{inp.get('loan_tenure_years',5)} Years"],
        ["Half-Yearly Instalment", rs(tl["half_yearly_instalment"]), "Total Interest", rs(tl["total_interest"])],
    ], colWidths=[42*mm,43*mm,42*mm,43*mm])
    tl_prop.setStyle(BTS())
    story.append(tl_prop)
    NL(story, 5)

    H2("B. Working Capital Facility", story)
    wc_prop = Table([
        ["Parameter","Value","Parameter","Value"],
        ["WC Requirement (Year 1)", rs(wc[0]["total"]) if wc else "—", "Facility Type", "Cash Credit / Overdraft (Revolving)"],
        ["Promoter WC Margin",      rs(_exec_wc_margin),               "Bank WC Finance", rs(_exec_wc_loan)],
    ], colWidths=[42*mm,43*mm,42*mm,43*mm])
    wc_prop.setStyle(BTS())
    story.append(wc_prop)
    NL(story, 3)
    story.append(Paragraph(
        "Working Capital Finance is a revolving operational facility, renewed annually based on "
        "utilisation, and is not part of the fixed project cost.",
        ST["small"]))
    PB(story)

    # ── SECTION 04 — APPLICANT & BUSINESS PROFILE ──────────────────────
    # (Includes the promoter's own profile — the input model carries a
    # single applicant/promoter, so a separate "Promoter Profile" page
    # would only restate these same fields; kept as one section instead
    # of an empty duplicate.)
    SEC("SECTION 04 — APPLICANT & BUSINESS PROFILE", story)

    H2("A1. Personal / Promoter Profile", story)
    appl = Table([
        ["Field","Details","Field","Details"],
        ["Full Name",      inp.get("full_name",""),          "Father's Name",   inp.get("fathers_name","")],
        ["Date of Birth",  inp.get("date_of_birth",""),      "Gender",          inp.get("gender","")],
        ["Education",      inp.get("education",""),          "Social Category", inp.get("social_category","")],
        ["PAN Number",     inp.get("pan_number",""),         "Aadhaar",         inp.get("aadhar_number","")],
        ["Mobile",         inp.get("mobile",""),             "Email",           inp.get("email","")],
        ["Experience",     f"{inp.get('years_of_experience',0)} Years", "Business Status", inp.get("business_status","")],
        ["Previous Employer", inp.get("previous_employer",""), "Previous Role", inp.get("previous_role","")],
        ["Address",        inp.get("address",""),            "",                ""],
    ], colWidths=[30*mm,55*mm,30*mm,55*mm])
    appl.setStyle(BTS())
    story.append(appl)
    NL(story, 5)

    H2("A2. Business Overview", story)
    _impl_agency   = inp.get("implementing_agency", "") or ""
    _biz_status    = inp.get("business_status", "New Business")
    _biz_duration  = int(inp.get("business_duration_months", 0) or 0)
    _biz_status_str = (
        f"{_biz_status} ({_biz_duration // 12} yr {_biz_duration % 12} mo)"
        if _biz_duration > 0 else _biz_status
    )
    biz = Table([
        ["Field","Details","Field","Details"],
        ["Business Name",     inp.get("business_name",""),         "Nature of Business",  inp.get("nature_of_business","")],
        ["Registration Type", inp.get("business_type",""),         "Industry",            str(inp.get("industry", inp.get("industry_type",""))).title()],
        ["Business Status",   _biz_status_str,                    "Location / District", f"{inp.get('primary_location','')}  {inp.get('district','')}".strip()],
        ["Commencement Date", inp.get("commencement_date",""),     "Expected Employment", str(inp.get("expected_employment",0))+" persons"],
        ["Area Type",         inp.get("area_type","Rural"),        "Implementing Agency", _impl_agency or "—"],
        ["GST Number",        inp.get("gst_number","") or "—",    "MSME/Udyam No.",      inp.get("msme_number","") or "—"],
    ], colWidths=[35*mm,50*mm,35*mm,50*mm])
    biz.setStyle(BTS())
    story.append(biz)
    NL(story, 5)

    H2("A3. Product / Service Portfolio", story)
    prod_rows = [["Category / Product Description","Monthly Qty","Avg Price (Rs.)","Revenue (Rs./Mo)","Mix %"]]
    for p in cma.get("products", []):
        cat = p.get("category", "Product")
        if p.get("name") and p.get("name") != cat:
            cat = f"{cat} - {p['name']}"
        prod_rows.append([cat, r(p.get("units_per_month", 0)), r(p.get("avg_price", 0)),
                          r(p.get("monthly_revenue", 0)), rp2(p.get("mix_pct", 0))])
    if not cma.get("products"):
         prod_rows.append(["No products entered", "-", "-", "-", "-"])
    prod_rows.append(["TOTAL PORTFOLIO REVENUE","","",r(cma["gross_monthly_revenue"]),"100.0%"])
    prod_t = Table(prod_rows, colWidths=[75*mm,20*mm,22*mm,33*mm,20*mm])
    prod_t.setStyle(BTS()); prod_t.setStyle(TOT(len(prod_rows)-1))
    story.append(prod_t)
    NL(story, 6)

    _competitors = inp.get("competitors") or []
    if _competitors:
        H2("A4. Competitive Analysis", story)
        _comp_rows = [["Competitor", "Type", "Distance", "Their Strengths", "Our Advantage"]]
        for _c in _competitors:
            _name  = str(_c.get("name", "") or "")
            _type  = str(_c.get("type", "") or "")
            _dist  = str(_c.get("distance", "") or "")
            _str   = str(_c.get("strengths", "") or "")
            _weak  = str(_c.get("weaknesses", "") or "")
            if _name:
                _comp_rows.append([_name, _type, _dist, _str, _weak])
        if len(_comp_rows) > 1:
            _comp_t = Table(_comp_rows, colWidths=[35*mm, 22*mm, 20*mm, 45*mm, 48*mm])
            _comp_t.setStyle(BTS())
            story.append(_comp_t)
            NL(story, 4)
    PB(story)

    # ── SECTION 05 — EXISTING BANKING & BORROWINGS ─────────────────────
    SEC("SECTION 05 — EXISTING BANKING & BORROWINGS", story)
    _ex_turnover = float(inp.get("existing_annual_turnover", 0) or 0)
    _ex_profit   = float(inp.get("existing_annual_profit", 0) or 0)
    _ex_emi      = float(inp.get("existing_monthly_emi", 0) or 0)
    if "existing" in str(_biz_status).lower() and (_ex_turnover or _ex_profit or _ex_emi):
        exbiz = Table([
            ["Field","Details","Field","Details"],
            ["Last FY Turnover",   f"Rs. {r(_ex_turnover)}",  "Last FY Net Profit", f"Rs. {r(_ex_profit)}"],
            ["Existing Loan EMI",  f"Rs. {r(_ex_emi)} / mo",  "Net Margin",
                (f"{(_ex_profit / _ex_turnover * 100):.1f}%" if _ex_turnover else "—")],
        ], colWidths=[35*mm,50*mm,35*mm,50*mm])
        exbiz.setStyle(BTS())
        story.append(exbiz)
    else:
        story.append(Paragraph("No existing banking facilities reported by the applicant.", ST["normal"]))
    PB(story)

    # ── SECTION 06 — PROJECT OVERVIEW ──────────────────────────────────
    SEC("SECTION 06 — PROJECT OVERVIEW", story)
    _overview_rows = [
        ["Field", "Details"],
        ["Nature of Project",   inp.get("nature_of_business","") or "—"],
        ["Business Model",      _industry_str + (f" | {_nature_biz[:60]}" if _nature_biz else "")],
        ["Location",             f"{inp.get('primary_location','')}, {inp.get('district','')}".strip(", ")],
        ["Area Type",            inp.get("area_type", "Rural")],
        ["Capacity Schedule (Y1-Y5)", f"{rp(inp.get('capacity_y1',0.5))} / {rp(inp.get('capacity_y2',0.6))} / {rp(inp.get('capacity_y3',0.7))} / {rp(inp.get('capacity_y4',0.75))} / {rp(inp.get('capacity_y5',0.8))}"],
        ["Expected Employment",  f"{inp.get('expected_employment',0)} persons"],
    ]
    ov_t = Table(_overview_rows, colWidths=[50*mm, 120*mm])
    ov_t.setStyle(BTS())
    story.append(ov_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 07 — PROJECT COST
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 07 — PROJECT COST", story)
    cost_rows = [["Sl.","Particulars","Amount (Rs.)","% of Total"]]
    for item in cma["project_cost_items"]:
        cost_rows.append([str(item["code"]), item["particulars"],
                          r(item["amount"]), pof(item["amount"], cma["total_project_cost"])])
    cost_rows.append(["","TOTAL (Initial Project Investment)", r(cma["total_project_cost"]), "100.0%"])
    cost_t = Table(cost_rows, colWidths=[10*mm,90*mm,38*mm,28*mm])
    cost_t.setStyle(BTS()); cost_t.setStyle(TOT(len(cost_rows)-1))
    story.append(cost_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 08 — MEANS OF FINANCE
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 08 — MEANS OF FINANCE", story)
    _b2_margin_money = pc.get("margin_money", 0) or cma.get("margin_money", 0)
    _b2_wc_loan      = R(cma.get("working_capital_loan", pc.get("wc_loan", 0)) or 0, 2)
    _b2_wc_margin    = R(float(wc[0].get("margin", 0) if wc else 0), 2)
    _b2_wc_total     = R(_b2_wc_margin + _b2_wc_loan, 2)

    _box("A. Fixed Project Funding", story)
    if _b2_margin_money:
        _b2_promoter_cash = R(display_promoter_fixed_equity, 2)
        finance_total_a   = R(_b2_promoter_cash + _b2_margin_money + pc["term_loan"], 2)
        mof_rows = [
            ["Source","Amount (Rs.)","% of Fixed Cost"],
            ["Equity Capital (Promoter Cash)",      rs(_b2_promoter_cash),  pof(_b2_promoter_cash,  finance_total_a)],
            [f"{_subsidy_label}{' (Margin Money)' if _is_pmegp else ''}", rs(_b2_margin_money),   pof(_b2_margin_money,   finance_total_a)],
            ["Term Loan from Bank",                 rs(pc["term_loan"]),    pof(pc["term_loan"],    finance_total_a)],
            ["TOTAL (Fixed Project Cost)",           rs(finance_total_a),    "100.0%"],
        ]
        mof = Table(mof_rows, colWidths=[95*mm,45*mm,30*mm])
        mof.setStyle(BTS()); mof.setStyle(TOT(4))
    else:
        _b2_promoter_cash = display_promoter_fixed_equity
        finance_total_a   = R(display_promoter_fixed_equity + pc["term_loan"], 2)
        mof_rows = [
            ["Source","Amount (Rs.)","% of Fixed Cost"],
            ["Equity Capital (Promoter)",       rs(display_promoter_fixed_equity), pof(display_promoter_fixed_equity, finance_total_a)],
            ["Term Loan from Bank",             rs(pc["term_loan"]),               pof(pc["term_loan"],               finance_total_a)],
            ["TOTAL (Fixed Project Cost)",      rs(finance_total_a),               "100.0%"],
        ]
        mof = Table(mof_rows, colWidths=[95*mm,45*mm,30*mm])
        mof.setStyle(BTS()); mof.setStyle(TOT(3))
    story.append(mof)
    NL(story, 5)

    if _b2_wc_total > 0:
        _box("B. Working Capital Funding", story)
        wc_fin_rows = [
            ["Source","Amount (Rs.)","% of WC Requirement"],
            ["Promoter WC Margin",   rs(_b2_wc_margin), pof(_b2_wc_margin, _b2_wc_total) if _b2_wc_total else "0.0%"],
            ["WC Bank Finance",      rs(_b2_wc_loan),   pof(_b2_wc_loan,   _b2_wc_total) if _b2_wc_total else "0.0%"],
            ["TOTAL WC",             rs(_b2_wc_total),  "100.0%"],
        ]
        wc_fin = Table(wc_fin_rows, colWidths=[95*mm,45*mm,30*mm])
        wc_fin.setStyle(BTS()); wc_fin.setStyle(TOT(3))
        story.append(wc_fin)
        NL(story, 2)
        story.append(Paragraph(
            "Working Capital Bank Finance is a revolving operational facility and is not included in fixed project cost.",
            ST["small"]))
        NL(story, 5)

        _box("C. Overall Funding", story)
        _total_bank_exp = pc["term_loan"] + _b2_wc_loan
        _total_funding  = display_promoter_contribution + _total_bank_exp + _b2_margin_money
        exp_rows = [
            ["Source",                              "Amount (Rs.)"],
            ["Total Promoter Funding",              rs(display_promoter_contribution)],
            ["Total Bank Funding",                  rs(_total_bank_exp)],
            ["Other Funding (Subsidy/TDR)",         rs(_b2_margin_money)],
            ["TOTAL FUNDING",                        rs(_total_funding)],
            ["Funding Gap (Arranged Sources)",       rs(0)],
        ]
        exp_t = Table(exp_rows, colWidths=[100*mm,70*mm])
        exp_t.setStyle(BTS()); exp_t.setStyle(TOT(4))
        story.append(exp_t)
        NL(story, 3)
        story.append(Paragraph(
            "\"Funding Gap (Arranged Sources)\" is Rs.0 by construction — every rupee of Fixed Cost and "
            "WC Requirement above is funded by the sources listed. If the business subsequently runs a "
            "cash deficit from operating losses, that shows up as negative cash in the Balance Sheet "
            "(Section 25) and Cash Flow (Section 24) — it is a separate, operational shortfall, not a "
            "gap in the initial funding plan.",
            ST["small"]))
    NL(story, 5)
    _tl_de  = round(pc["term_loan"] / max(display_promoter_fixed_equity, 1), 2) if display_promoter_fixed_equity else 0
    _tot_de = round((pc["term_loan"] + _b2_wc_loan) / max(display_promoter_contribution, 1), 2) if display_promoter_contribution else 0
    story.append(Paragraph(
        f"<b>D:E (TL ÷ Promoter Fixed Equity): {_tl_de} : 1</b>"
        f" &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>Total Leverage ((TL + WC Bank) ÷ Total Promoter): {_tot_de} : 1</b>",
        ST["bold"]))
    story.append(Paragraph(
        "Formula: Term Loan D:E = TL / promoter fixed equity. "
        "Total leverage = total debt / total promoter contribution.",
        ST["small"]))
    if _b2_margin_money and _is_pmegp:
        NL(story, 3)
        story.append(Paragraph(
            f"<b>Margin Money Note:</b> Margin Money of Rs.{_b2_margin_money:,.0f} is held as TDR "
            "for 3 years as per PMEGP guidelines. "
            "Interest is charged on the full outstanding balance during the lock-in period.",
            ST["small"]))
    elif _b2_margin_money:
        NL(story, 3)
        story.append(Paragraph(
            f"<b>Subsidy Note:</b> State capital subsidy of Rs.{_b2_margin_money:,.0f} on fixed assets "
            "is treated as a source of finance, reducing the amount split between promoter and bank.",
            ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 09 — PROMOTER CONTRIBUTION
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 09 — PROMOTER CONTRIBUTION", story)
    # Three different % figures, each on a different denominator, were
    # previously all labelled "Promoter Contribution %" — labelled distinctly
    # here so a banker never has to guess which base a given % is measured against.
    _pc_fixed_project_cost   = R(pc["term_loan"] + display_promoter_fixed_equity, 2)
    _pc_wc_requirement_total = float(wc[0].get("total", 0)) if wc else 0.0
    _pc_total_funding_reqd   = R(_pc_fixed_project_cost + _pc_wc_requirement_total, 2)
    _pc_promoter_share_total_funding = round(display_promoter_contribution / _pc_total_funding_reqd * 100, 1) if _pc_total_funding_reqd else 0
    pcontrib = Table([
        ["Particular", "Amount / %"],
        ["Fixed Project Promoter Contribution",  rs(display_promoter_fixed_equity)],
        ["Promoter WC Margin",                    rs(display_promoter_wc_margin)],
        ["Total Promoter Contribution",           rs(display_promoter_contribution)],
        ["Fixed Project Promoter Contribution % (÷ Fixed Project Cost)", rp2(cma["promoter_pct"])],
        ["Total Initial Investment Promoter Contribution % (÷ Initial Project Investment)", pof(display_promoter_contribution, display_total_project_cost)],
        ["Total Funding Requirement Promoter Share % (÷ Fixed Cost + Total WC Requirement)", rp2(_pc_promoter_share_total_funding)],
    ], colWidths=[130*mm, 40*mm])
    pcontrib.setStyle(BTS()); pcontrib.setStyle(TOT(3))
    story.append(pcontrib)
    NL(story, 5)

    pnw = cma.get("promoter_net_worth", {})
    if pnw and any(float(v or 0) > 0 for v in pnw.values()):
        H2("Promoter Net Worth Statement", story)
        _res_prop  = float(pnw.get("residential_property", 0) or 0)
        _fd        = float(pnw.get("fixed_deposits", 0) or 0)
        _savings   = float(pnw.get("savings_account", 0) or 0)
        _mf        = float(pnw.get("mutual_funds", 0) or 0)
        _hl_out    = float(pnw.get("home_loan_outstanding", 0) or 0)
        _hl_emi    = float(pnw.get("home_loan_emi", 0) or 0)
        _gross_nw  = _res_prop + _fd + _savings + _mf
        _net_nw    = _gross_nw - _hl_out
        nw_t = Table([
            ["Asset / Liability", "Amount (Rs.)", "Remarks"],
            ["Residential Property",      rs(_res_prop),  "Market value"],
            ["Fixed Deposits / NSC",      rs(_fd),        "Bank / Post Office"],
            ["Savings Account Balance",   rs(_savings),   "Current balance"],
            ["Mutual Funds / Investments",rs(_mf),        "At current NAV"],
            ["GROSS ASSETS",              rs(_gross_nw),  ""],
            ["Less: Home Loan Outstanding",rs(_hl_out),   f"EMI: Rs.{_hl_emi:,.0f}/month" if _hl_emi else ""],
            ["NET WORTH",                 rs(_net_nw),    "Available as additional security"],
        ], colWidths=[80*mm, 50*mm, 40*mm])
        nw_t.setStyle(BTS())
        nw_t.setStyle(TOT(5))
        nw_t.setStyle(TOT(7))
        story.append(nw_t)
        NL(story, 3)
        story.append(Paragraph(
            f"Promoter's net worth of Rs.{_net_nw:,.0f} provides additional comfort to the lending institution.",
            ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # PART II — FINANCIAL ANALYSIS  (Sections 10-27)
    # ════════════════════════════════════════════════════════════════

    # ── SECTION 10 — KEY FINANCIAL ASSUMPTIONS ─────────────────────────
    SEC("SECTION 10 — KEY FINANCIAL ASSUMPTIONS", story)
    _assump_rows = [
        ["Assumption","Value","Assumption","Value"],
        ["Contingency Rate",         rp(inp.get("contingency_rate",0)),  "Term Loan %",          rp(inp["term_loan_pct"])],
        ["WC Loan %",                rp(inp["wc_loan_pct"]),              "Term Loan Interest",   rp(inp["term_loan_interest"])],
        ["WC Interest Rate",         rp(inp["wc_interest_rate"]),         "Annual Salary Hike",   rp(inp["salary_increase_rate"])],
        ["Admin Expense Increase",   rp(inp["admin_increase_rate"]),      "Marketing % of Rev",   rp(inp["marketing_expense_pct"])],
        ["Building Dep (WDV)",       rp(inp["building_dep_rate_wdv"]),    "Asset Dep (WDV)" if _is_service else "Machinery Dep (WDV)", rp(inp["machinery_dep_rate_wdv"])],
        ["Revenue Growth (Escalation)", rp2(inp["revenue_growth_pct"]),   "Salary Hike (Escalation)", rp2(inp["salary_increase_pct"])],
    ]
    if _is_service:
        _assump_rows += [
            ["Client Billing Cycle", str(inp["debtor_days"]), "Cash Reserve", "30 days"],
            ["Expense Float", "30 days", "Tax Rate", rp2(inp["tax_rate_pct"])],
        ]
    else:
        _assump_rows += [
            ["Stock Holding Days",       str(inp["stock_holding_days"]),      "Debtor Days",          str(inp["debtor_days"])],
            ["Creditor Days",            str(inp["creditor_days"]),           "Tax Rate",             rp2(inp["tax_rate_pct"])],
        ]
        if str(inp.get("industry", inp.get("industry_type","manufacturing"))).lower() not in ("trading", "service", "services"):
            _assump_rows.append(["WIP Holding Days", str(inp.get("wip_days", 15)), "Finished Goods Days", str(inp.get("fg_days", 30))])
    _assump_rows.append([
        "Capacity Schedule (Y1-Y5)",
        f"{round(inp.get('capacity_y1',0.50)*100)}% / {round(inp.get('capacity_y2',0.60)*100)}% / {round(inp.get('capacity_y3',0.70)*100)}%",
        "Capacity (Y4-Y5)",
        f"{round(inp.get('capacity_y4',0.75)*100)}% / {round(inp.get('capacity_y5',0.80)*100)}%",
    ])
    assump = Table(_assump_rows, colWidths=[55*mm,30*mm,55*mm,30*mm])
    assump.setStyle(BTS())
    story.append(assump)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 11 — CAPACITY & REVENUE PROJECTION
    # ════════════════════════════════════════════════════════════════
    _sec11_title = (
        "SECTION 11 — SALES MODEL & CAPACITY / REVENUE PROJECTION" if _is_trading else
        "SECTION 11 — SERVICE REVENUE MODEL & CAPACITY / REVENUE PROJECTION" if _is_service else
        "SECTION 11 — PRODUCTION PARAMETERS & CAPACITY / REVENUE PROJECTION"
    )
    SEC(_sec11_title, story)

    if _is_trading_service:
        H2("Operating Parameters", story)
        if _is_service:
            _d1_rows = [
                ["Parameter","Value","Unit"],
                ["Service Revenue Model", "Client/project billing (see Section 04, A3)", ""],
                ["Client Billing Cycle",  f"{inp.get('debtor_days', 30)} days", "Collection"],
                ["Hours of Operation / Day", str(inp["hours_of_operation"]), "Hours"],
                ["Annual Revenue (100% Cap, Year 1)", rs(ps["revenue_at_100pct"]), "Rs."],
            ]
        else:
            _d1_rows = [
                ["Parameter","Value","Unit"],
                ["Working Days per Year",     r(inp["working_days_per_year"]),  "Days"],
                ["Annual Revenue (100% Cap, Year 1)", rs(ps["revenue_at_100pct"]),      "Rs."],
                ["Revenue Model",             "Revenue-based (see Section 04, A3 for product details)", ""],
            ]
        prod_params = Table(_d1_rows, colWidths=[90*mm,55*mm,20*mm])
        prod_params.setStyle(BTS())
        story.append(prod_params)
        NL(story, 5)

        H2("Annual Sales Realization (Year 1, at 100% Capacity)", story)
        products = inp.get("products_list") or cma.get("products") or []
        if _industry == "trading" and products and len(products) > 0 and products[0].get("category") != "Products/Services":
            sales_rows = [["Product Name", "Purchase Price", "Selling Price", "Quantity", "Revenue (M)", "COGS (M)", "Gross Profit (M)"]]
            tot_rev = 0
            tot_cogs = 0
            for p in products:
                qty = p.get("units_per_month", 0)
                sp = p.get("avg_price", 0)
                pp = p.get("purchase_price", 0)
                rev = qty * sp
                cogs = qty * pp
                gp = rev - cogs
                tot_rev += rev
                tot_cogs += cogs
                sales_rows.append([p.get("category", "Product"), r(pp), r(sp), r(qty), r(rev), r(cogs), r(gp)])
            sales_rows.append(["Total per Month", "", "", "", r(tot_rev), r(tot_cogs), r(tot_rev - tot_cogs)])
            sales_t = Table(sales_rows, colWidths=[40*mm, 20*mm, 20*mm, 15*mm, 25*mm, 25*mm, 25*mm])
            sales_t.setStyle(BTS()); sales_t.setStyle(TOT(len(sales_rows)-1))
        else:
            sales_rows = [["Product / Service Category","Annual Revenue (Rs.)","% Mix"]]
            if products and len(products) > 0 and products[0].get("category") and products[0].get("category") != "Products/Services":
                # Entered monthly_revenue is the Year-1 (current-capacity) figure, not
                # 100%-capacity — scale every row to ps["revenue_at_100pct"] (the same
                # figure used above and in the P&L) so this table's total is never a
                # separate, silently-different basis.
                total_rev_y1 = sum(p.get("monthly_revenue", 0) * 12 for p in products)
                total_rev_100pct = float(ps.get("revenue_at_100pct", 0) or 0) or total_rev_y1
                scale = (total_rev_100pct / total_rev_y1) if total_rev_y1 else 1
                for p in products:
                    ann_rev_y1 = p.get("monthly_revenue", 0) * 12
                    name = p.get("name") or p.get("category") or "Product"
                    mix = (ann_rev_y1 / total_rev_y1 * 100) if total_rev_y1 else 0
                    sales_rows.append([name, r(ann_rev_y1 * scale), rp2(mix)])
                sales_rows.append(["Total at 100% Capacity (Year 1)", r(total_rev_100pct), "100.0%"])
            else:
                sales_rows.append([primary_product, r(ps["revenue_at_100pct"]), "100.0%"])
                sales_rows.append(["Total at 100% Capacity (Year 1)", r(ps["revenue_at_100pct"]), "100.0%"])
            sales_t = Table(sales_rows, colWidths=[90*mm,50*mm,30*mm])
            sales_t.setStyle(BTS()); sales_t.setStyle(TOT(len(sales_rows)-1))
        story.append(sales_t)
        NL(story, 5)
        # 100%-capacity revenue is NOT constant across years — it grows with the
        # revenue-escalation assumption, independently of the capacity ramp-up.
        # Shown as an explicit per-year table (not just a note) so it's visibly
        # clear that a later year's revenue can exceed the Year-1 100%-capacity
        # figure even at a lower stated capacity %.
        story.append(Paragraph(
            "<b>Revenue Build-Up:</b> 100%-capacity revenue grows with the revenue escalation assumption "
            f"({rp2(inp.get('revenue_growth_pct', 0))}/year, Section 10), independently of the capacity "
            "ramp-up below.",
            ST["small"]))
        NL(story, 3)
        _cap_rows = [["Year", "100% Capacity Revenue (Rs.)", "Capacity %", "Projected Revenue (Rs.)"]]
        for _cy in cop:
            _cap_pct = float(_cy.get("capacity", 0) or 0)
            _cy_rev  = float(_cy.get("revenue", 0) or 0)
            _cy_100  = R(_cy_rev / _cap_pct, 2) if _cap_pct else 0
            _cap_rows.append([str(_cy.get("year", "")), r(_cy_100), rp(_cap_pct), r(_cy_rev)])
        _cap_t = Table(_cap_rows, colWidths=[20*mm, 55*mm, 30*mm, 55*mm])
        _cap_t.setStyle(BTS())
        story.append(_cap_t)
    else:
        # Manufacturing / Agriculture: full production parameters
        H2("Production Parameters", story)
        prod_params = Table([
            ["Parameter","Value","Unit"],
            ["Working Days per Year",    r(inp["working_days_per_year"]),   "Days"],
            ["Input Quantity / Day",     r(inp["fresh_leaves_per_day_kg"]), "Units"],
            ["Finished Output Yield",    rp(inp["yield_rate"]),             ""],
            ["Annual Output",            r(ps["annual_production_kg"]),     "Units"],
            ["Hours of Operation / Day", str(inp["hours_of_operation"]),    "Hours"],
            ["Average Selling Price",    rs(inp["selling_price_per_kg"]),   "Rs./Unit"],
        ], colWidths=[90*mm,45*mm,30*mm])
        prod_params.setStyle(BTS())
        story.append(prod_params)
        NL(story, 5)

        H2("Annual Sales Realization (Year 1, at 100% Capacity)", story)
        products = inp.get("products_list") or cma.get("products") or []
        if products and len(products) > 0 and products[0].get("category") and products[0].get("category") != "Products/Services":
            sales_rows = [["Product","Price (Rs./Unit)","Quantity/Month","Annual Revenue (Rs.)"]]
            total_rev = 0
            for p in products:
                qty = p.get("units_per_month", 0)
                sp = p.get("avg_price", p.get("selling_price", 0))
                ann_rev = qty * sp * 12
                total_rev += ann_rev
                name = p.get("name") or p.get("category") or "Product"
                sales_rows.append([name, r(sp), r(qty), r(ann_rev)])
            sales_rows.append(["Total at 100% Capacity", "", "", r(total_rev)])
            sales_t = Table(sales_rows, colWidths=[65*mm,35*mm,35*mm,35*mm])
            sales_t.setStyle(BTS()); sales_t.setStyle(TOT(len(sales_rows)-1))
        else:
            sales_t = Table([
                ["Product","Price (Rs./Unit)","Quantity (Units)","Revenue (Rs.)"],
                [primary_product, r(inp.get("selling_price_per_kg", 0)), r(ps.get("annual_production_kg", 0)), r(ps.get("revenue_at_100pct", 0))],
                ["Total at 100% Capacity","","",r(ps.get("revenue_at_100pct", 0))],
            ], colWidths=[65*mm,35*mm,35*mm,35*mm])
            sales_t.setStyle(BTS()); sales_t.setStyle(TOT(2))
        story.append(sales_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 12 — COST OF OPERATIONS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 12 — COST OF OPERATIONS", story)
    if _is_trading_service:
        H2("Direct Cost Structure", story)
        if _industry == "trading":
            story.append(Paragraph(
                "Purchase cost (COGS) is calculated based on the exact purchase price and mix "
                "of the individual trading products specified in the business model.",
                ST["normal"]))
        else:
            gm_val = float(cma.get("gross_margin_pct") or inp.get("gross_margin_pct") or 30)
            _cogs_pct = round(100 - gm_val, 1)
            if _is_service:
                story.append(Paragraph(
                    f"Direct service delivery cost is estimated at {_cogs_pct}% of service revenue. "
                    "Inventory assumptions are not used for service working capital.",
                    ST["normal"]))
            else:
                story.append(Paragraph(
                    f"Direct cost is estimated at {_cogs_pct}% of sales revenue based on "
                    f"calculated margins for this {_industry.capitalize()} business.",
                    ST["normal"]))
    else:
        H2("Raw Material & Consumables (at 100% Capacity)", story)
        if rm.get("items"):
            rm_rows = [["Sl.","Item","Rate (Rs.)","Qty / Year","Cost (Rs.)"]]
            for i, item in enumerate(rm["items"]):
                rm_rows.append([str(i+1), item.get("name","Material"), r(item.get("unit_price",0)), r(item.get("annual_qty",0)), r(item.get("total_cost",0))])
            rm_rows.append(["","TOTAL","","",r(rm["total"])])
        else:
            rm_rows = [["Sl.","Item","Rate (Rs.)","Qty / Year","Cost (Rs.)"],
                       ["1","Raw Material",     r(inp.get("cost_fresh_leaves_per_kg",0)),  r(rm.get("annual_leaves_qty",0)),       r(rm.get("leaves_cost",0))],
                       ["2","Consumables",      str(inp.get("cost_consumables_per_kg",0)), r(rm.get("annual_leaves_qty",0)),       r(rm.get("consumables_cost",0))],
                       ["3","Packing Material", str(inp.get("cost_pet_bottle",0)),         r(ps.get("annual_production_kg",0)/10), r(rm.get("bottles_cost",0))],
                       ["","TOTAL","","",r(rm["total"])]]
        rm_t = Table(rm_rows, colWidths=[10*mm,70*mm,28*mm,28*mm,30*mm])
        rm_t.setStyle(BTS()); rm_t.setStyle(TOT(len(rm_rows)-1))
        story.append(rm_t)
        _prim_rm   = inp.get("primary_raw_material", "")
        _rm_supp   = inp.get("raw_material_supplier", "")
        if _prim_rm or _rm_supp:
            NL(story, 3)
            _rm_note = []
            if _prim_rm: _rm_note.append(f"Primary Raw Material: <b>{_prim_rm}</b>")
            if _rm_supp: _rm_note.append(f"Supplier: <b>{_rm_supp}</b>")
            story.append(Paragraph("  |  ".join(_rm_note), ST["small"]))
    NL(story, 6)

    H2("Gross Profit (Year 1 → Year 5)", story)
    gp_rows = [["Particulars"] + [f"Year {cy['year']}" for cy in cop]]
    gp_rows.append(["Sales Revenue"] + [r(cy["revenue"]) for cy in cop])
    gp_rows.append(["Less: Direct Cost"] + [r(cy["raw_materials"]) for cy in cop])
    gp_rows.append(["GROSS PROFIT"] + [r(cy["revenue"] - cy["raw_materials"]) for cy in cop])
    gp_t = Table(gp_rows, colWidths=[40*mm]+[26*mm]*5)
    gp_t.setStyle(BTS()); gp_t.setStyle(TOT(3))
    story.append(gp_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 13 — OPERATING EXPENSES
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 13 — OPERATING EXPENSES", story)
    H2("Manpower & Wage Structure", story)
    total_staff = (man.get("num_skilled", 0) + man.get("num_semi", 0) + man.get("num_unskilled", 0))
    hr_rows = [
        ["Sl.", "Category", "Headcount", "Monthly Salary (Rs.)", "Annual Salary (Rs.)", "Annual Total (Rs.)"],
        ["1", "Promoter / Owner", "1", rs(0), rs(man.get("promoter_annual", 0)), rs(man.get("promoter_annual", 0))],
        ["2", "Skilled Worker",
         str(man.get("num_skilled", 0)),
         rs(man.get("skilled_per_annual", man.get("skilled_annual", 0)) / 12) if man.get("num_skilled", 0) else "—",
         rs(man.get("skilled_per_annual", man.get("skilled_annual", 0))),
         rs(man.get("skilled_total", 0))],
        ["3", "Semi-Skilled Worker",
         str(man.get("num_semi", 0)),
         rs(man.get("semi_skilled_per_annual", man.get("semi_skilled_annual", 0)) / 12) if man.get("num_semi", 0) else "—",
         rs(man.get("semi_skilled_per_annual", man.get("semi_skilled_annual", 0))),
         rs(man.get("semi_skilled_total", 0))],
        ["4", "Unskilled / Helper",
         str(man.get("num_unskilled", 0)),
         rs(man.get("unskilled_per_annual", man.get("unskilled_annual", 0)) / 12) if man.get("num_unskilled", 0) else "—",
         rs(man.get("unskilled_per_annual", man.get("unskilled_annual", 0))),
         rs(man.get("unskilled_total", 0))],
        ["", "PF / ESI / Benefits (10%)", "", "", "", rs(man.get("benefits", 0))],
        ["", f"TOTAL ({total_staff} staff)", "", "", "", rs(cma.get("annual_salary_total", man.get("total_wages", 0)))],
    ]
    hr_t = Table(hr_rows, colWidths=[8*mm, 42*mm, 18*mm, 28*mm, 32*mm, 32*mm])
    hr_t.setStyle(BTS())
    hr_t.setStyle(TOT(len(hr_rows) - 1))
    story.append(hr_t)
    if float(man.get("promoter_annual", 0) or 0) <= 0:
        NL(story, 3)
        story.append(Paragraph(
            "<b>Promoter remuneration not considered.</b> Profitability may be overstated because owner salary/drawings are not included as an operating cost.",
            ST["small"]))
    NL(story, 6)

    H2("Operating Expenses Summary (Year 1 → Year 5)", story)
    opex_rows = [["Expense"] + [f"Year {cy['year']}" for cy in cop]]
    opex_rows.append(["Salary"] + [r(cma.get("annual_salary_total", cy["labour"]) if i==0 else cy["labour"]) for i,cy in enumerate(cop)])
    opex_rows.append(["Utilities / Power"] + [r(cy["power"]) for cy in cop])
    opex_rows.append(["Admin & Misc Expenses"] + [r(cy["admin_expenses"]) for cy in cop])
    opex_rows.append(["Marketing Expenses"] + [r(cy["marketing_expenses"]) for cy in cop])
    opex_rows.append(["TOTAL OPEX"] + [r(cy["labour"] + cy["power"] + cy["admin_expenses"] + cy["marketing_expenses"]) for cy in cop])
    opex_t = Table(opex_rows, colWidths=[40*mm]+[26*mm]*5)
    opex_t.setStyle(BTS()); opex_t.setStyle(TOT(5))
    story.append(opex_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 14 — PROJECTED PROFIT & LOSS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 14 — PROJECTED PROFIT & LOSS", story)
    _pl_cogs_label = (
        "Less: Purchase Cost (COGS)"          if _is_trading else
        "Less: Direct Service Delivery Cost"  if _is_service else
        "Less: COGS"
    )
    if _is_trading_service:
        pl_rows = [
            ["Particulars","Year 1","Year 2","Year 3","Year 4","Year 5"],
            ["Revenue at 100%"]       + [r(ps["revenue_at_100pct"])]*5,
            ["Capacity Utilisation"]  + [rp(cy["capacity"])          for cy in cop],
            ["Sales Revenue"]         + [r(cy["revenue"])            for cy in cop],
            [_pl_cogs_label]          + [r(cy["raw_materials"])      for cy in cop],
            ["Gross Profit"]          + [r(cy["revenue"] - cy["raw_materials"]) for cy in cop],
            ["Less: Operating Expenses", "","","","",""],
            ["Salary"]                + [r(cma.get("annual_salary_total", cy["labour"]) if i==0 else cy["labour"]) for i,cy in enumerate(cop)],
            ["Utilities / Power"]     + [r(cy["power"])              for cy in cop],
            ["Admin & Misc Expenses"] + [r(cy["admin_expenses"])     for cy in cop],
            ["Marketing Expenses"]    + [r(cy["marketing_expenses"]) for cy in cop],
            ["EBITDA"]                + [r(cy.get("ebitda", cy["revenue"] - cy["raw_materials"] - cy["labour"] - cy["power"] - cy["admin_expenses"] - cy["marketing_expenses"])) for cy in cop],
            ["Depreciation"]          + [r(cy["depreciation"])       for cy in cop],
            ["Interest on WC"]        + [r(cy["wc_interest"])        for cy in cop],
            ["Interest on Term Loan"] + [r(cy["tl_interest"])        for cy in cop],
            ["TOTAL EXPENSES"]        + [r(cy["total_expenses"])     for cy in cop],
            ["Profit Before Tax"]     + [r(cy.get("profit_before_tax", cy["net_profit"])) for cy in cop],
            ["Less: Tax"]             + [r(cy.get("tax", 0))         for cy in cop],
            ["NET PROFIT (PAT)"]      + [r(cy["net_profit"])         for cy in cop],
            ["Reserves & Surplus"]    + [r(cy["reserves_surplus"])   for cy in cop],
            ["Cash Accruals"]         + [r(cy["cash_accruals"])      for cy in cop],
        ]
        pl_t = Table(pl_rows, colWidths=[58*mm]+[22.4*mm]*5)
        pl_t.setStyle(BTS())
        for idx in [5, 6, 11, 15, 18, 20]: pl_t.setStyle(TOT(idx))
    else:
        pl_t = Table([
            ["Particulars","Year 1","Year 2","Year 3","Year 4","Year 5"],
            ["Revenue at 100%"]             + [r(ps["revenue_at_100pct"])]*5,
            ["Capacity Utilisation"]        + [rp(cy["capacity"])                    for cy in cop],
            ["Gross Sales Revenue"]         + [r(cy["revenue"])                      for cy in cop],
            ["Less: Raw Materials / COGS"]  + [r(cy["raw_materials"])                for cy in cop],
            ["Gross Profit"]                + [r(cy.get("gross_profit", 0))          for cy in cop],
            ["Less: Utilities & Variable Exp"] + [r(cy["power"])                     for cy in cop],
            ["Less: Labour & Wages"]        + [r(cma.get("annual_salary_total", cy["labour"]) if i==0 else cy["labour"]) for i,cy in enumerate(cop)],
            ["Less: Admin & Overhead"]      + [r(cy["admin_expenses"])               for cy in cop],
            ["Less: Marketing Expenses"]    + [r(cy["marketing_expenses"])           for cy in cop],
            ["EBITDA"]                      + [r(cy.get("ebitda", 0))               for cy in cop],
            ["Less: Depreciation"]          + [r(cy["depreciation"])                for cy in cop],
            ["Less: Interest on WC"]        + [r(cy["wc_interest"])                 for cy in cop],
            ["Less: Interest on Term Loan"] + [r(cy["tl_interest"])                 for cy in cop],
            ["TOTAL EXPENSES"]              + [r(cy["total_expenses"])              for cy in cop],
            ["Profit Before Tax"]           + [r(cy.get("profit_before_tax", cy["net_profit"])) for cy in cop],
            ["Less: Tax"]                   + [r(cy.get("tax", 0))                  for cy in cop],
            ["NET PROFIT (PAT)"]            + [r(cy["net_profit"])                  for cy in cop],
            ["Reserves & Surplus"]          + [r(cy["reserves_surplus"])            for cy in cop],
            ["Cash Accruals"]               + [r(cy["cash_accruals"])               for cy in cop],
        ], colWidths=[58*mm]+[22.4*mm]*5)
        pl_t.setStyle(BTS())
        for idx in [5, 10, 14, 17, 19]: pl_t.setStyle(TOT(idx))
    story.append(pl_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 15 — PROFITABILITY & RETURN ANALYSIS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 15 — PROFITABILITY & RETURN ANALYSIS (Based on Year 3)", story)
    # "Capital Employed" (CA/ROCE convention) = Promoter Equity + Term Loan —
    # the long-term funds actually deployed. ROCE and ROE are reported
    # separately with explicit definitions, rather than one ambiguous
    # "% of Capital" column that produced extreme, misleading percentages
    # whenever equity was thin relative to debt.
    ref_t = Table([
        ["Reference Sales (Rs.)","Total Project Investment (Rs.)","Promoter Equity (Rs.)","Total Debt (Rs.)","Capital Employed (Rs.)"],
        [r(prof["sales"]), r(prof["total_investment"]), r(prof.get("promoter_equity", 0)),
         r(prof.get("total_debt", 0)), r(prof["capital_employed"])],
    ], colWidths=[34*mm,38*mm,34*mm,30*mm,34*mm])
    ref_t.setStyle(BTS())
    story.append(ref_t)
    NL(story, 5)
    _t_capital_employed = max(prof["capital_employed"], 1)
    _t_promoter_equity   = max(prof.get("promoter_equity", 0), 1)
    pi_t = Table([
        ["Metric","Amount (Rs.)","EBITDA/PAT Margin\n(% of Sales)","ROCE\n(÷ Capital Employed)","ROE / ROI\n(÷ Promoter Equity / Total Investment)"],
        ["PBIDT (≈ EBITDA)", rs(prof["pbidt"]), rp2(prof["pbidt_pct_sales"]),
         pof(prof["pbidt"], _t_capital_employed), "—"],
        ["PAT (Net Profit)", rs(prof["pat"]), rp2(prof["pat_pct_sales"]),
         pof(prof["pat"], _t_capital_employed),
         f"ROE {pof(prof['pat'], _t_promoter_equity)} | ROI {pof(prof['pat'], max(prof['total_investment'],1))}"],
    ], colWidths=[34*mm,26*mm,28*mm,32*mm,50*mm])
    pi_t.setStyle(BTS())
    story.append(pi_t)
    NL(story, 3)
    story.append(Paragraph(
        "<b>ROCE</b> = PBIDT or PAT ÷ Capital Employed (Promoter Equity + Term Loan) — return on all "
        "long-term funds deployed, before financing structure is considered. "
        "<b>ROE</b> = PAT ÷ Promoter Equity — return to the promoter specifically. "
        "<b>ROI</b> = PAT ÷ Total Project Investment. "
        "ROE/ROCE can legitimately run very high (or very negative) for a thinly-capitalised, "
        "highly-leveraged project, since a small equity base amplifies both gains and losses — "
        "a large magnitude is a leverage signal, not a calculation error.",
        ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 16 — WORKING CAPITAL ASSESSMENT
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 16 — WORKING CAPITAL ASSESSMENT", story)
    _stock_days   = inp.get("stock_holding_days", inp.get("wc_raw_material_days", 30))
    _wip_days     = inp.get("wip_days",           inp.get("wc_wip_days", 15))
    _fg_days      = inp.get("fg_days",            inp.get("wc_finished_goods_days", 30))
    _debtor_days  = inp.get("debtor_days",        30)
    _creditor_days= inp.get("creditor_days",      15)

    def _wc(w, *keys):
        """Return first non-None numeric value found for the given key sequence."""
        for key in keys:
            val = w.get(key)
            if val is not None:
                try:
                    return float(val)
                except (TypeError, ValueError):
                    pass
        return 0.0

    _wc_industry   = str(inp.get("industry", inp.get("industry_type", "manufacturing"))).lower()
    _is_trading_wc = _wc_industry == "trading"
    _is_service_wc = _wc_industry in ("service", "services")
    _is_mfg_wc     = not (_is_trading_wc or _is_service_wc)
    _wc_rows = [["Particulars", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"]]
    if _is_service_wc:
        _wc_rows += [
            [f"Receivables ({_debtor_days} day client billing cycle)"] + [r(_wc(w, "debtors")) for w in wc],
            ["Salary Float (30 days payroll)"]                         + [r(_wc(w, "salary_float")) for w in wc],
            ["Expense Float (30 days delivery cost + overhead)"]       + [r(_wc(w, "expense_float")) for w in wc],
            ["Cash Reserve (15 days operating buffer)"]                + [r(_wc(w, "cash_reserve")) for w in wc],
        ]
    else:
        _stock_label = "Stock of Goods" if _is_trading_wc else "Raw Material Stock"
        _wc_rows.append([f"{_stock_label} ({_stock_days} days)"] + [r(_wc(w, "rm_stock", "rm_wc", "stock")) for w in wc])
    if _is_mfg_wc:
        _wc_rows.append([f"Work in Progress ({_wip_days} days)"] + [r(_wc(w, "wip", "wip_wc")) for w in wc])
        _wc_rows.append([f"Finished Goods ({_fg_days} days)"]    + [r(_wc(w, "fg", "fg_wc"))   for w in wc])
    if not _is_service_wc:
        _wc_rows += [
            [f"Debtors ({_debtor_days} days)"] + [r(_wc(w, "debtors")) for w in wc],
            ["Less: Creditors"]               + [r(_wc(w, "creditors")) for w in wc],
        ]
    _wc_rows.append(["Total WC Required"] + [r(w["total"]) for w in wc])
    _wc_total_row_idx = len(_wc_rows) - 1
    wc_t = Table(_wc_rows, colWidths=[62*mm] + [21.6*mm] * 5)
    wc_t.setStyle(BTS())
    wc_t.setStyle(TOT(_wc_total_row_idx))
    story.append(wc_t)
    if _is_service_wc:
        NL(story, 3)
        story.append(Paragraph(
            "Service WC uses receivables, salary float, expense float, and cash reserve. "
            "Manufacturing/trading inventory norms are intentionally excluded.",
            ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 17 — WORKING CAPITAL FINANCING
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 17 — WORKING CAPITAL FINANCING", story)
    wcfin_rows = [["Particulars", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"]]
    wcfin_rows.append(["Total WC Requirement"]    + [r(w["total"]) for w in wc])
    wcfin_rows.append(["WC Margin (Promoter's Share)"] + [r(w["margin"]) for w in wc])
    wcfin_rows.append(["Bank WC Loan"]            + [r(w["bank_loan"]) for w in wc])
    wcfin_rows.append(["Margin %"]                + [pof(w["margin"], w["total"]) for w in wc])
    wcfin_rows.append(["Bank Finance %"]          + [pof(w["bank_loan"], w["total"]) for w in wc])
    wcfin_rows.append(["WC Interest"]             + [r(w["wc_interest"]) for w in wc])
    wcfin_t = Table(wcfin_rows, colWidths=[62*mm] + [21.6*mm] * 5)
    wcfin_t.setStyle(BTS()); wcfin_t.setStyle(TOT(1))
    story.append(wcfin_t)
    NL(story, 3)
    story.append(Paragraph(
        f"<b>Note:</b> WC Bank Loan (Rs. {wc[0]['bank_loan']:,.0f}) is a revolving credit facility -- "
        "not part of project cost. Renewed annually based on utilisation. This facility is separate "
        "from the term loan (Section 21) and is not amortised.",
        ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 18 — WORKING CAPITAL CYCLE
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 18 — WORKING CAPITAL CYCLE", story)
    story.append(Paragraph(
        "Purchases → Inventory → Sales → Receivables → Cash, financed against Supplier Credit → Payables.",
        ST["normal"]))
    NL(story, 4)
    _cycle_rows = [["Component", "Days"]]
    if not _is_service_wc:
        _cycle_rows.append(["Stock / Inventory Holding Days", str(_stock_days)])
    if _is_mfg_wc:
        _cycle_rows.append(["Work-in-Progress Days", str(_wip_days)])
        _cycle_rows.append(["Finished Goods Holding Days", str(_fg_days)])
    _cycle_rows.append(["Receivable / Debtor Days", str(_debtor_days)])
    _cycle_rows.append(["Less: Creditor / Payable Days", f"-{_creditor_days}"])
    _net_cycle = (
        (0 if _is_service_wc else int(_stock_days))
        + (int(_wip_days) + int(_fg_days) if _is_mfg_wc else 0)
        + int(_debtor_days) - int(_creditor_days)
    )
    _cycle_rows.append(["NET OPERATING CYCLE (Days)", str(_net_cycle)])
    cycle_t = Table(_cycle_rows, colWidths=[130*mm, 40*mm])
    cycle_t.setStyle(BTS()); cycle_t.setStyle(TOT(len(_cycle_rows)-1))
    story.append(cycle_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 19 — FIXED ASSET SCHEDULE
    # ════════════════════════════════════════════════════════════════
    _sec19_title = (
        "SECTION 19 — SHOP EQUIPMENT, FIXTURES & INTERIORS"    if _is_trading else
        "SECTION 19 — OFFICE INFRASTRUCTURE & SERVICE SETUP"    if _is_service else
        "SECTION 19 — AGRICULTURAL EQUIPMENT & INFRASTRUCTURE"  if _is_agri   else
        "SECTION 19 — FIXED ASSET SCHEDULE (PLANT, MACHINERY & EQUIPMENT)"
    )
    SEC(_sec19_title, story)
    _cont_pct = inp.get("contingency_rate", 0)
    _cont_item_word = "fixture/fitting" if _is_trading else ("equipment" if _is_service else "machinery")
    _cont_note = (
        f"{rp(_cont_pct)} loading/fitting charges applied on {_cont_item_word} items."
        if _cont_pct > 0 else
        f"No loading or fitting charges applied on {_cont_item_word} items."
    )
    story.append(Paragraph(f"Note: {_cont_note}", ST["small"]))
    NL(story, 3)
    mach_rows = [["Sl.","Description","Qty","Unit Price (Rs.)","Total (Rs.)"]]
    for i,m in enumerate(mc["items"]):
        mach_rows.append([str(i+1), m["name"], str(m["qty"]), r(m["unit_price"]), r(m["total"])])
    mach_rows.append(["","TOTAL","","",r(mc["total"])])
    mach_t = Table(mach_rows, colWidths=[10*mm,85*mm,12*mm,35*mm,28*mm])
    mach_t.setStyle(BTS()); mach_t.setStyle(TOT(len(mach_rows)-1))
    story.append(mach_t)
    NL(story, 4)

    _supplier_rows = [["Sl.","Equipment / Asset","Supplier Name","City","Contact"]]
    for i, m in enumerate(mc["items"]):
        _sname = str(m.get("supplier_name", "") or "")
        _scity = str(m.get("supplier_city", "") or "")
        _sph   = str(m.get("supplier_phone", "") or "")
        if _sname or _scity or _sph:
            _supplier_rows.append([str(i+1), m["name"], _sname or "—", _scity or "—", _sph or "—"])
    if len(_supplier_rows) > 1:
        story.append(Paragraph("Supplier / Vendor Reference (Banks require quotations for items above Rs. 50,000)", ST["small"]))
        NL(story, 2)
        _sup_t = Table(_supplier_rows, colWidths=[8*mm,55*mm,45*mm,27*mm,32*mm])
        _sup_t.setStyle(BTS())
        story.append(_sup_t)
        NL(story, 4)

    H2("Gross Block", story)
    _dep_building_label = (
        "Shop / Showroom Space"              if _is_trading else
        "Office / Service Premises"          if _is_service else
        "Farm Shed / Storage Infrastructure" if _is_agri   else
        "Building / Factory Shed"
    )
    _dep_machinery_label = (
        "Shop Equipment, Fixtures & Interiors (incl. fitting)" if _is_trading else
        "Service Equipment & Tools"                             if _is_service else
        "Agricultural Equipment & Implements"                   if _is_agri   else
        "Plant, Machinery & Equipment (incl. contingency)"
    )
    gb_t = Table([
        ["Asset", "Gross Value (Rs.)", "Dep Rate", "Year 1 Dep (Rs.)"],
        [_dep_building_label, rs(dep["building_gross"]), rp(inp["building_dep_rate_wdv"]), rs(dep["dep_building_wdv"])],
        [_dep_machinery_label, rs(dep.get("pm_with_contingency", dep["machinery_gross"])), rp(inp["machinery_dep_rate_wdv"]), rs(dep["dep_machinery_wdv"])],
        ["Total Gross Block", rs(dep["gross_block"]), "", rs(dep["total_per_year"])],
    ], colWidths=[70*mm, 40*mm, 28*mm, 32*mm])
    gb_t.setStyle(BTS()); gb_t.setStyle(TOT(3))
    story.append(gb_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 20 — DEPRECIATION (WDV)
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 20 — DEPRECIATION SCHEDULE (WDV METHOD)", story)
    story.append(Paragraph("<b>Selected Depreciation Method: Written Down Value (WDV)</b>", ST["bold"]))
    NL(story, 3)
    _dep_sched = dep.get("schedule") or []
    _sched_opening = [r(row["opening_wdv"]) for row in _dep_sched] or [r(dep["gross_block"])] * 5
    _sched_dep     = [r(row["depreciation"]) for row in _dep_sched] or [r(dep["total_per_year"])] * 5
    _sched_closing = [r(row["closing_wdv"]) for row in _dep_sched] or [r(dep["gross_block"])] * 5
    _accum = 0.0
    _sched_accum = []
    for row in (_dep_sched or []):
        _accum += float(row["depreciation"])
        _sched_accum.append(r(_accum))
    if not _sched_accum:
        _sched_accum = [r(dep["total_per_year"] * y) for y in range(1, 6)]
    dep_t = Table([
        ["Particulars",                "Year 1",       "Year 2",       "Year 3",       "Year 4",       "Year 5"],
        ["Opening WDV"]                 + _sched_opening,
        ["Depreciation (WDV × Rate)"]   + _sched_dep,
        ["Accumulated Depreciation"]    + _sched_accum,
        ["Closing WDV (Net Block)"]     + _sched_closing,
    ], colWidths=[60*mm] + [22*mm] * 5)
    dep_t.setStyle(BTS())
    dep_t.setStyle(TOT(4))
    story.append(dep_t)
    story.append(Paragraph(
        "WDV Method: each year's depreciation = Opening WDV × Rate; Closing WDV = Opening WDV − Depreciation, "
        "carried forward as next year's Opening WDV.",
        ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 21 — TERM LOAN SCHEDULE
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 21 — TERM LOAN REPAYMENT & INTEREST SCHEDULE", story)
    tl_meta = Table([
        ["Parameter","Value","Parameter","Value"],
        ["Term Loan Amount",       rs(tl["amount"]),              "Interest Rate",    rp(tl["interest_rate"])],
        ["Half-Yearly Instalment", rs(tl["half_yearly_instalment"]),"Moratorium",    _morat_str],
        ["Total Interest Payable", rs(tl["total_interest"]),      "Loan Tenure",     f"{inp.get('loan_tenure_years',5)} Years"],
    ], colWidths=[50*mm,35*mm,50*mm,35*mm])
    tl_meta.setStyle(BTS())
    story.append(tl_meta)
    NL(story, 5)
    tl_rows = [["Year","Opening Balance","Mid-Year Balance","Principal Repaid","Closing Balance","Interest H1","Interest H2","Total Interest"]]
    for row in tl["schedule"]:
        tl_rows.append([str(row["year"]),r(row["opening"]),r(row["mid"]),r(row["principal_repaid"]),r(row["closing"]),
                         r(row["int_h1"]),r(row["int_h2"]),r(row["total_interest"])])
    tl_t = Table(tl_rows, colWidths=[12*mm]+[22.5*mm]*7)
    tl_t.setStyle(BTS())
    story.append(tl_t)
    NL(story, 3)
    _morat_note_mo = int(inp.get("moratorium_months", inp.get("moratorium_years", 0) * 12) or 0)
    if _morat_note_mo > 0:
        story.append(Paragraph(
            f"Note: First {_morat_note_mo} month(s) are moratorium period — interest accrues but no principal repayment.",
            ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 22 — TOTAL DEBT SCHEDULE
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 22 — TOTAL DEBT SCHEDULE", story)
    debt_rows = [["Year", "Term Loan Closing (Rs.)", "WC Bank Loan (Rs.)", "Total Debt (Rs.)"]]
    for i, y in enumerate(cma["yr_schedule"]):
        _wc_bank_yr = float(wc[i]["bank_loan"]) if i < len(wc) else 0.0
        debt_rows.append([str(y["year"]), r(y["closing_balance"]), r(_wc_bank_yr), r(y["closing_balance"] + _wc_bank_yr)])
    debt_t = Table(debt_rows, colWidths=[20*mm, 50*mm, 50*mm, 50*mm])
    debt_t.setStyle(BTS())
    story.append(debt_t)
    NL(story, 3)
    story.append(Paragraph(
        "Term Loan reduces to zero by the end of tenure (amortising facility); WC Bank Loan is a "
        "revolving facility renewed annually and does not amortise.",
        ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 23 — CASH FLOW STATEMENT
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 23 — PROJECTED CASH FLOW STATEMENT", story)
    cf_t = Table([
        ["Particulars","Year 1","Year 2","Year 3","Year 4","Year 5"],
        ["SOURCE OF FUNDS","","","","",""],
        ["Cash Accruals"]           + [r(p["cash_accruals"])      for p in pcf],
        ["Inc. in Bank Borrowings"] + [r(p["inc_wc_loan"])        for p in pcf],
        ["Inc. in Promoter's WC Margin"] + [r(p.get("inc_wc_margin", 0)) for p in pcf],
        ["Total Sources"]           + [r(p["total_sources"])       for p in pcf],
        ["USE OF FUNDS","","","","",""],
        ["Inc. in Current Assets"]  + [r(p["inc_current_assets"]) for p in pcf],
        ["Term Loan Repayment"]     + [r(p["tl_repayment"])       for p in pcf],
        ["Less: Promoter Drawings"] + [r(p.get("drawings", 0))    for p in pcf],
        ["Total Uses"]             + [r(p["total_uses"])           for p in pcf],
        ["Opening Cash Balance"]    + [r(p["opening_cash"])       for p in pcf],
        ["Surplus / Deficit"]       + [r(p["surplus"])            for p in pcf],
        ["Closing Cash Balance (negative = unfunded shortfall)"] + [r(p["closing_cash"]) for p in pcf],
    ], colWidths=[60*mm]+[22*mm]*5)
    cf_t.setStyle(BTS())
    cf_t.setStyle(TOT(5)); cf_t.setStyle(TOT(10)); cf_t.setStyle(TOT(13))
    story.append(cf_t)
    NL(story, 3)
    story.append(Paragraph(
        # A funding shortfall is never dressed up as an arranged borrowing
        # source — a negative Closing Cash Balance IS the shortfall.
        "<b>Note:</b> Closing Cash Balance is allowed to go negative when the term loan, WC bank finance, "
        "and promoter's WC margin already factored into this report don't cover the cash requirement — "
        "that negative figure IS the unarranged funding shortfall. It is deliberately not dressed up as a "
        "borrowing source above. If this figure is negative in any year, the applicant will need to "
        "either arrange additional promoter funding, secure a CC/OD or unsecured-loan enhancement, or "
        "revise the underlying revenue/cost assumptions before bank submission.",
        ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 24 — PROJECTED BALANCE SHEET
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 24 — PROJECTED BALANCE SHEET (Schedule III Format, Amounts in Rs.)", story)
    _has_accumulated_losses = any(float(pb.get("reserves", 0) or 0) < 0 for pb in pbs)
    _display_reserve = lambda pb: max(float(pb.get("reserves", 0) or 0), 0)
    _display_loss = lambda pb: abs(min(float(pb.get("reserves", 0) or 0), 0))
    _display_net_worth = lambda pb: (
        float(pb.get("equity", 0) or 0) + float(pb.get("promoter_wc_margin", 0) or 0) + float(pb.get("reserves", 0) or 0)
    )
    bs_rows = [
        ["Particulars","Year 0","Year 1","Year 2","Year 3","Year 4","Year 5"],
        ["I. EQUITY & LIABILITIES","","","","","",""],
        ["  (a) Owners' Funds","","","","","",""],
        ["  Equity / Promoter Capital"]  + [r(pb["equity"])                for pb in pbs],
        *(
            [["  Promoter's WC Margin"] + [r(pb.get("promoter_wc_margin", 0)) for pb in pbs]]
            if any(pb.get("promoter_wc_margin", 0) for pb in pbs) else []
        ),
        *(
            [[("  Govt Subsidy (PMEGP TDR)" if _is_pmegp else "  Govt Subsidy (Capital)")] + [r(pb.get("margin_money",0)) for pb in pbs]]
            if any(pb.get("margin_money", 0) for pb in pbs) else []
        ),
        ["  Reserves & Surplus"]         + [r(_display_reserve(pb))        for pb in pbs],
        *(
            [["  Less: Accumulated Losses"] + [r(_display_loss(pb))        for pb in pbs],
             ["  Net Worth (Equity - Losses)"] + [r(_display_net_worth(pb)) for pb in pbs]]
            if _has_accumulated_losses else []
        ),
        ["  (b) Long-Term Liabilities (Non-Current)","","","","","",""],
        ["  Term Loan (Bank)"]           + [r(pb["term_loan"])             for pb in pbs],
        ["  (c) Current Liabilities","","","","","",""],
        ["  Bank Borrowings — WC (CC/OD)"]+ [r(pb["wc_bank"])             for pb in pbs],
        ["TOTAL EQUITY & LIABILITIES"]  + [r(pb["total_liabilities"])      for pb in pbs],
        ["II. ASSETS","","","","","",""],
        ["  (a) Non-Current Assets","","","","","",""],
        ["  Land"]                       + [r(pb["land"])                  for pb in pbs],
        ["  Gross Block (Fixed Assets)"] + [r(pb["gross_block"])           for pb in pbs],
        ["  Less: Accumulated Dep."]     + [r(pb["accum_dep"])             for pb in pbs],
        ["  Net Block (NBV — WDV)"]      + [r(pb["net_block"])             for pb in pbs],
        ["  Other Long-Term Assets"]     + [r(pb["other_assets"])          for pb in pbs],
        ["  (b) Current Assets","","","","","",""],
        ["  Stock / Debtors / WC Assets"]+ [r(pb["current_assets"])        for pb in pbs],
        # A funding shortfall used to be hidden by clamping cash to zero and
        # inventing an "Additional Short-Term Funding" liability that was
        # simultaneously disclosed as "not arranged" — self-contradictory.
        # Cash is the one balancing figure and is shown negative when
        # arranged funding falls short, so the shortfall is visible here
        # directly instead of as a fake liability.
        ["  Cash & Bank Balance (negative = unfunded shortfall)"] + [r(pb["cash"]) for pb in pbs],
        ["TOTAL ASSETS"]                 + [r(pb["total_assets"])          for pb in pbs],
    ]
    bs_t = Table(bs_rows, colWidths=[52*mm]+[19.7*mm]*6)
    bs_t.setStyle(BTS())
    total_liab_row = next((i for i, row in enumerate(bs_rows) if row[0] == "TOTAL EQUITY & LIABILITIES"), None)
    total_assets_row = next((i for i, row in enumerate(bs_rows) if row[0] == "TOTAL ASSETS"), None)
    if total_liab_row:  bs_t.setStyle(TOT(total_liab_row))
    if total_assets_row: bs_t.setStyle(TOT(total_assets_row))
    _cash_row = next((i for i, row in enumerate(bs_rows) if row[0].startswith("  Cash & Bank Balance")), None)
    if _cash_row is not None and any(float(pb.get("cash", 0) or 0) < 0 for pb in pbs):
        bs_t.setStyle(TableStyle([
            ("TEXTCOLOR", (0, _cash_row), (-1, _cash_row), colors.HexColor("#B71C1C")),
            ("FONTNAME",  (0, _cash_row), (-1, _cash_row), "Helvetica-Bold"),
        ]))
    if _has_accumulated_losses:
        loss_row = next((i for i, row in enumerate(bs_rows) if row[0] == "  Less: Accumulated Losses"), None)
        nw_row = next((i for i, row in enumerate(bs_rows) if row[0] == "  Net Worth (Equity - Losses)"), None)
        if loss_row is not None:
            bs_t.setStyle(TableStyle([
                ("TEXTCOLOR", (0, loss_row), (-1, loss_row), colors.HexColor("#B71C1C")),
                ("FONTNAME",  (0, loss_row), (-1, loss_row), "Helvetica-Bold"),
            ]))
        if nw_row is not None:
            bs_t.setStyle(TOT(nw_row))
    story.append(bs_t)
    _neg_eq_yrs, _loss_yrs = [], []
    for _pb in pbs[1:]:
        _yr_num   = _pb.get("year", "?")
        _eq_total = _display_net_worth(_pb)
        _loss_amt = abs(min(float(_pb.get("reserves", 0) or 0), 0))
        if _loss_amt > 0:
            _loss_yrs.append(f"Year {_yr_num}: Accumulated Losses Rs.{_loss_amt:,.0f}")
        if _eq_total < 0:
            _neg_eq_yrs.append(f"Year {_yr_num}: Negative Net Worth Rs.{_eq_total:,.0f}")
    if _neg_eq_yrs or _loss_yrs:
        NL(story, 3)
        _cap_ero_tbl = Table(
            [[Paragraph(
                "<b>CAPITAL EROSION / ACCUMULATED LOSSES:</b> "
                + (" | ".join(_neg_eq_yrs) if _neg_eq_yrs else "Net worth remains positive, but accumulated losses are present")
                + (". " + " | ".join(_loss_yrs) if _loss_yrs else "")
                + ". The balance sheet separately presents Accumulated Losses instead of showing them as a negative liability. "
                "Revise revenue assumptions or increase promoter capital contribution before bank submission.",
                ST["small"]
            )]],
            colWidths=[170*mm]
        )
        _cap_ero_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0,0),(-1,-1), RED),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ]))
        story.append(_cap_ero_tbl)
    _funding_gap_yrs = [
        f"Year {pb.get('year','?')}: Rs.{float(pb.get('short_term_funding', pb.get('funding_gap', 0)) or 0):,.0f}"
        for pb in pbs[1:] if float(pb.get("short_term_funding", pb.get("funding_gap", 0)) or 0) > 0
    ]
    if _funding_gap_yrs:
        NL(story, 3)
        _fg_tbl = Table(
            [[Paragraph(
                "<b>UNFUNDED CASH SHORTFALL (shown as negative Cash & Bank Balance above):</b> "
                + " | ".join(_funding_gap_yrs) + ". "
                "This is the cash shortfall NOT covered by the term loan, WC bank finance, or the promoter's "
                "WC margin already factored into this report. It is deliberately NOT shown as a liability, "
                "since no such facility has actually been arranged. Before submission, either increase "
                "promoter funding, arrange an additional CC/OD or unsecured-loan facility for this amount, "
                "or revise the revenue/cost assumptions driving the shortfall.",
                ST["small"]
            )]],
            colWidths=[170*mm]
        )
        _fg_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0,0),(-1,-1), RED),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ]))
        story.append(_fg_tbl)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 25 — BREAK-EVEN ANALYSIS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 25 — BREAK-EVEN ANALYSIS", story)
    def _bep_val(b, key):
        if b.get("bep_not_achievable"):
            return "N/A"
        return r(b.get(key, 0))
    def _bep_pct_val(b):
        if b.get("bep_not_achievable"):
            return "N/A"
        return rp(b.get("bep_pct", 0))
    bep_t = Table([
        ["Particulars","Year 1","Year 2","Year 3","Year 4","Year 5"],
        ["Income from Operations"]    + [r(b["revenue"])            for b in bep],
        ["Variable Expenses"]         + [r(b["variable_expenses"])  for b in bep],
        ["Contribution"]              + [r(b["contribution"])       for b in bep],
        ["Fixed Expenses (incl Dep)"] + [r(b["fixed_expenses"])     for b in bep],
        ["BEP Sales (Rs.)"]           + [_bep_val(b, "bep_sales")   for b in bep],
        ["BEP as % of Capacity"]      + [_bep_pct_val(b)            for b in bep],
        ["Contribution Margin %"]     + [rp(b["contribution_pct"])  for b in bep],
    ], colWidths=[60*mm]+[22*mm]*5)
    bep_t.setStyle(BTS()); bep_t.setStyle(TOT(5))
    story.append(bep_t)
    if any(b.get("bep_not_achievable") for b in bep):
        NL(story, 3)
        story.append(Paragraph(
            "<b>BEP not computable</b> in year(s) where Contribution Margin ≤ 0 — variable costs "
            "exceed revenue, so there is no sales level at which fixed costs can be covered "
            "under current assumptions.",
            ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 26 — SENSITIVITY / STRESS ANALYSIS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 26 — SENSITIVITY / STRESS ANALYSIS", story)
    story.append(Paragraph(
        "<b>Base Case</b> = Year 1 monthly values from the master financial engine. "
        "Variable costs scale proportionally with revenue; fixed costs remain constant. "
        "DSCR shown is the Term Loan DSCR: (PAT + Dep + Term Loan Interest) / (Term Loan Principal + Term Loan Interest).",
        ST["small"]))
    NL(story, 2)
    # Reduced from 6 to 5 scenarios — the +20% "Best Case" extreme added a
    # row without changing the reading; Optimistic/Base/Conservative/
    # Pessimistic/Worst already span the meaningful range.
    _sens_scenarios = [s for s in cma["sensitivity"] if s.get("scenario") != "Best Case"]
    sens_rows = [["Scenario","Chg %","Revenue (Rs.)","COGS (Rs.)","EBITDA (Rs.)","PAT (Rs.)","Term Loan DSCR","Status"]]
    for s in _sens_scenarios:
        sens_rows.append([
            s["scenario"], f"{s.get('change_pct',0)}%",
            r(s["monthly_revenue"]),
            r(s.get("monthly_cogs", 0)),
            r(s.get("monthly_ebitda", s.get("monthly_revenue",0) - s.get("monthly_variable",0) - s.get("monthly_fixed",0))),
            r(s["monthly_profit"]),
            str(s["dscr"]),
            s["status"],
        ])
    sens_t = Table(sens_rows, colWidths=[26*mm,14*mm,26*mm,24*mm,26*mm,24*mm,16*mm,20*mm])
    sens_t.setStyle(BTS())
    story.append(sens_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 27 — RISK ASSESSMENT
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 27 — RISK ASSESSMENT", story)
    _risk_cell_style = _s("risk_cell", fontSize=8, alignment=TA_LEFT, fontName="Helvetica", textColor=BLK, leading=10)
    risk_rows = [["Category","Risk Description","Probability","Impact","Net Risk"]]
    _risk_matrix_display = _display_risk_matrix(_industry)
    for i,rm_ in enumerate(_risk_matrix_display):
        risk_rows.append([Paragraph(str(rm_["category"]), _risk_cell_style),
                           Paragraph(str(rm_["description"]), _risk_cell_style),
                           rm_["probability"], rm_["impact"], rm_["net_risk"]])
    risk_t = Table(risk_rows, colWidths=[32*mm,64*mm,24*mm,24*mm,26*mm])
    risk_t.setStyle(BTS())
    for i,rm_ in enumerate(_risk_matrix_display):
        risk_t.setStyle(RISK_COLOR(i+1, rm_["net_risk"]))
    story.append(risk_t)
    NL(story, 4)
    story.append(Paragraph(f"<b>Overall Risk Level: {cma['risk_level']}</b>", ST["bold"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 28 — DSCR & DEBT SERVICING
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 28 — TERM LOAN DEBT SERVICE COVERAGE (DSCR) & REPAYMENT CAPABILITY", story)
    dr = dscr["years"]
    dscr_t = Table([
        ["Particulars","Year 1","Year 2","Year 3","Year 4","Year 5"],
        ["(A) Cash Accruals (PAT + Dep)"] + [r(d["cash_accruals"])  for d in dr],
        ["(A) Add: Interest on TL"]       + [r(d["tl_interest"])    for d in dr],
        ["Total (A) — Numerator"]         + [r(d["total_a"])         for d in dr],
        ["(B) TL Principal Repayment"]    + [r(d["tl_repayment"])   for d in dr],
        ["(B) Add: Interest on TL"]       + [r(d["tl_interest"])    for d in dr],
        ["Total (B) — Denominator"]       + [r(d["total_b"])         for d in dr],
        ["Term Loan DSCR (A ÷ B)"]        + [str(d["dscr"])          for d in dr],
    ], colWidths=[60*mm]+[22*mm]*5)
    dscr_t.setStyle(BTS())
    for idx in [3, 6]: dscr_t.setStyle(TOT(idx))
    story.append(dscr_t)
    NL(story, 5)
    min_req = 1.25
    avg = dscr["average"]
    status = "ABOVE" if avg >= min_req else "BELOW"
    rep_t = Table([
        ["Metric","Value","Benchmark","Status"],
        ["Average Term Loan DSCR (5-Year)",  str(cma.get("avg_dscr_5yr", cma.get("avg_dscr", 0))),  ">= 1.25 (illustrative)", cma["dscr_label"]],
        ["Payback Period (months)", _fmt_payback(cma), "< 24 mo", ("Not Achievable" if (cma.get("payback_not_achievable") or str(cma.get("breakeven_months","")).upper()=="N/A" or float(cma.get("breakeven_months",0) if isinstance(cma.get("breakeven_months"),(int,float)) else 0)==0) else ("Good" if float(cma.get("breakeven_months",0))<24 else "Monitor"))],
        ["Margin of Safety",       rp2(cma["margin_of_safety"]),"> 0",    "Positive" if cma["margin_of_safety"]>0 else "Negative"],
    ], colWidths=[70*mm,35*mm,35*mm,30*mm])
    rep_t.setStyle(BTS())
    story.append(rep_t)
    NL(story, 4)
    story.append(Paragraph(
        f"<b>Note:</b> This is the <b>Term Loan DSCR</b> — it covers only the term loan's own principal and "
        f"interest, and deliberately excludes Working Capital interest (a separate revolving facility, "
        f"serviced out of the same cash accruals but not amortised like a term loan). "
        f"1.25x is this platform's illustrative benchmark, not a universal bank/RBI requirement — the "
        f"sanctioning bank's own norm governs. "
        f"The average of {avg} is <b>{status}</b> this illustrative benchmark.",
        ST["normal"]))
    NL(story, 3)
    # D:E leverage warning (moved here from the old Q2) — flag aggressive
    # leverage without blocking generation.
    _r_tl_de  = round(pc["term_loan"] / max(display_promoter_fixed_equity, 1), 2) if display_promoter_fixed_equity else 0
    _r_tot_de = round((pc["term_loan"] + pc.get("wc_loan", 0)) / max(display_promoter_contribution, 1), 2) if display_promoter_contribution else 0
    if _r_tl_de > 3 or _r_tot_de > 4:
        _de_warn_parts = []
        if _r_tl_de > 3:
            _de_warn_parts.append(f"Term Loan D:E of {_r_tl_de}:1 exceeds 3:1")
        if _r_tot_de > 4:
            _de_warn_parts.append(f"Total Debt D:E of {_r_tot_de}:1 exceeds 4:1")
        _de_warn_tbl = Table(
            [[Paragraph(
                "⚠ High Leverage: " + " | ".join(_de_warn_parts) + ". "
                "High leverage may reduce loan approval probability. "
                "Consider increasing promoter equity or reducing borrowing.",
                ST["small"]
            )]],
            colWidths=[170*mm]
        )
        _de_warn_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0,0),(-1,-1), AMB),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ]))
        story.append(_de_warn_tbl)
    _trend_warnings = []
    for _i, _yr in enumerate(cma.get("projections_5yr", []), start=1):
        _yr_ebitda = float(_yr.get("ebitda", 0) or 0)
        _yr_pat    = float(_yr.get("net_profit", _yr.get("profit_after_tax", 0)) or 0)
        _yr_dscr   = float(_yr.get("dscr", 0) or 0)
        if _yr_ebitda < 0:
            _trend_warnings.append(f"Year {_i}: EBITDA turns negative (Rs.{_yr_ebitda:,.0f})")
        elif _yr_pat < 0:
            _trend_warnings.append(f"Year {_i}: PAT turns negative (Rs.{_yr_pat:,.0f})")
        elif _yr_dscr > 0 and _yr_dscr < 1.0:
            _trend_warnings.append(f"Year {_i}: DSCR falls below 1.0 ({_yr_dscr}x)")
    if _trend_warnings:
        NL(story, 2)
        _trend_tbl = Table(
            [[Paragraph(
                "⚠ Projected Financial Stress in Later Years: " + " | ".join(_trend_warnings) + ". "
                "Review long-term revenue growth and cost assumptions.",
                ST["small"]
            )]],
            colWidths=[170*mm]
        )
        _trend_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0,0),(-1,-1), AMB),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ]))
        story.append(_trend_tbl)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION 29 — FINANCIAL RATIO ANALYSIS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION 29 — FINANCIAL RATIO ANALYSIS", story)
    _q2_net_annual_surplus = R(cma.get("surplus_monthly", 0) * 12, 2)
    ratios = Table([
        ["Ratio","Value","Benchmark","Assessment"],
        ["Current Ratio (Accounting Basis)", r2(cma["current_ratio"]), "> 1.33 (illustrative)", "Good" if cma["current_ratio"]>1.33 else "Monitor"],
        ["D:E (TL ÷ Promoter Fixed Equity)",          str(_r_tl_de) + " : 1",  "< 2", "Good" if _r_tl_de < 2 else "High"],
        ["Total Leverage ((TL+WC) ÷ Total Promoter)", str(_r_tot_de) + " : 1", "< 3", "Good" if _r_tot_de < 3 else "High"],
        ["EBITDA Margin (EBITDA / Sales)",     rp2(cma["ebitda_margin_pct"]), "> 20%", "Good" if cma["ebitda_margin_pct"]>20 else "Monitor"],
        ["Net Profit Margin (PAT / Sales)",    rp2(cma["net_margin_pct"]),    "> 10%", "Good" if cma["net_margin_pct"]>10 else "Monitor"],
        ["ROI (EBITDA)",               rp2(cma["roi_ebitda_pct"]),    "> 15%",  "Good" if cma["roi_ebitda_pct"]>15 else "Monitor"],
        ["ROI (PAT)",                  rp2(cma["roi_pat_pct"]),       "> 10%",  "Good" if cma["roi_pat_pct"]>10 else "Monitor"],
        ["Interest Coverage (EBITDA / Int)",   r2(cma.get("interest_coverage_y1", 0)), "> 2", "Good" if cma.get("interest_coverage_y1", 0)>2 else "Monitor"],
        ["Asset Turnover (Sales / Investment)",r2(cma.get("asset_turnover_y1", 0)),    "> 1", "Good" if cma.get("asset_turnover_y1", 0)>1 else "Monitor"],
        ["Total TL Interest Outgo",    rs(cma["total_interest_outgo"]), "—", "—"],
        ["Net Annual Surplus (PAT + Dep - TL Principal)", rs(_q2_net_annual_surplus), "> 0", "Positive" if _q2_net_annual_surplus>0 else "Negative"],
    ], colWidths=[65*mm,28*mm,30*mm,47*mm])
    ratios.setStyle(BTS())
    story.append(ratios)
    NL(story, 2)
    story.append(Paragraph(
        "ROI (EBITDA) = EBITDA / Initial Project Investment x 100  |  ROI (PAT) = PAT / Initial Project Investment x 100  |  "
        "Margins = Profit / Sales Revenue x 100  |  D:E: Term Loan D:E = TL / promoter fixed equity; "
        "Total leverage = total debt / total promoter contribution. Current Ratio here is a simplified "
        "accounting-basis ratio, not a bank's own WC assessment methodology (e.g. Tandon Committee MPBF).",
        ST["small"]))
    NL(story, 5)

    H2("Overall Interpretation", story)
    _fa_cell_style = _s("fa_cell", fontSize=9, alignment=TA_CENTER, fontName="Helvetica-Bold", textColor=BLK, leading=12)
    fa_t = Table([
        ["Internal Viability Grade","Feasibility Assessment","Risk Level","Weighted Score"],
        [Paragraph(str(cma["credit_rating"]), _fa_cell_style), Paragraph(str(_rec_display), _fa_cell_style),
         Paragraph(str(cma["risk_level"]), _fa_cell_style), Paragraph(str(cma["total_score"]), _fa_cell_style)],
    ], colWidths=[32*mm,68*mm,32*mm,38*mm])
    fa_t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),DG),("TEXTCOLOR",(0,0),(-1,0),W),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,0),10),
        ("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("BACKGROUND",(0,1),(-1,1),LG),
        ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
        ("GRID",(0,0),(-1,-1),0.5,W),
    ]))
    story.append(fa_t)
    NL(story, 2)
    story.append(Paragraph(
        "Subjective factors such as market opportunity, competitive position, and business model are excluded "
        "from the ratio table above. This grade may still use the approved backend scoring engine.",
        ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # PART III — METHODOLOGY & AUDIT TRAIL  (Sections 30-32)
    # ════════════════════════════════════════════════════════════════

    # ── SECTION 30 — ASSUMPTIONS & METHODOLOGY ─────────────────────────
    SEC("SECTION 30 — ASSUMPTIONS & METHODOLOGY", story)
    story.append(Paragraph(
        "The following formulas and conventions are used throughout this report. They are informed by "
        "common CA / RBI / SIDBI credit-appraisal practice, but the benchmarks shown below are this "
        "platform's configured/illustrative thresholds, not a universal regulatory requirement — the "
        "sanctioning bank's own scheme-specific norms take precedence.",
        ST["normal"]))
    NL(story, 3)
    _fdef_rows = [
        ["Ratio / Formula", "Definition & Method", "Benchmark"],
        ["DSCR\n(Term Loan Debt\nService Coverage Ratio)",
         "= (PAT + Depreciation + Term Loan Interest) / (Term Loan Principal + Term Loan Interest)\n"
         "Measures ability to repay the TERM LOAN from operating cash flow. Deliberately excludes\n"
         "Working Capital interest — WC is a separate revolving facility, not amortised like a term loan.",
         ">= 1.25x\n(illustrative,\nterm-loan only)"],
        ["ROI — EBITDA / PAT",
         "= Annual EBITDA (or PAT) / Initial Project Investment × 100\n"
         "Denominator = Fixed Assets + Promoter WC Margin\n"
         "Measures operational / net return on the initial investment",
         "> 15% / > 10%"],
        ["ROCE",
         "= PBIDT or PAT ÷ Capital Employed (Promoter Equity + Term Loan)\n"
         "Return on all long-term funds deployed, before financing structure is considered",
         "Illustrative"],
        ["ROE",
         "= PAT ÷ Promoter Equity\n"
         "Return to the promoter specifically — can legitimately be extreme for a thinly-\n"
         "capitalised, highly-leveraged project; a large magnitude is a leverage signal, not an error.",
         "Illustrative"],
        ["Current Ratio\n(Accounting basis)",
         "= Total Current Assets / Total Current Liabilities\n"
         "This report's Current Assets/Liabilities are WC Assets (stock + debtors) and WC Bank "
         "Borrowings (CC/OD) — a simplified accounting-basis ratio, not a bank's own WC assessment\n"
         "methodology (e.g. Tandon Committee MPBF), which each bank/scheme should apply separately.",
         "> 1.33x\n(illustrative)"],
        ["D:E Ratio\n(Term Loan D:E)",
         "= Term Loan Amount / Promoter Fixed Equity",
         "< 2 : 1"],
        ["Total Leverage\n(D:E — All Debt)",
         "= (Term Loan + WC Bank Finance) / Total Promoter Contribution",
         "< 3 : 1"],
        ["EBITDA Margin / Net Profit Margin",
         "= EBITDA (or PAT) / Sales Revenue × 100",
         "> 20% / > 10%"],
        ["Break-Even Point",
         "= Fixed Costs / (1 − Variable Cost Ratio)\n"
         "Not computable when Contribution Margin ≤ 0 (shown as N/A, not forced to a number)",
         "< Monthly\nRevenue"],
        ["Cash Accruals",
         "= PAT + Annual Depreciation — the operating cash flow available for debt service",
         "> Annual TL\nDebt Service"],
        ["Interest Coverage",
         "= EBITDA / Total Interest (TL + WC)",
         "> 2x"],
        ["Asset Turnover",
         "= Annual Revenue / Initial Project Investment",
         "> 1x"],
    ]
    _fdef_t = Table(_fdef_rows, colWidths=[38*mm, 100*mm, 32*mm])
    _fdef_t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1, 0), MG),
        ("TEXTCOLOR",     (0,0),(-1, 0), W),
        ("FONTNAME",      (0,0),(-1, 0), "Helvetica-Bold"),
        ("FONTNAME",      (0,1),( 0,-1), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),(-1,-1), 7.5),
        ("GRID",          (0,0),(-1,-1), 0.4, GRY),
        ("TOPPADDING",    (0,0),(-1,-1), 3),
        ("BOTTOMPADDING", (0,0),(-1,-1), 3),
        ("LEFTPADDING",   (0,0),(-1,-1), 4),
        ("RIGHTPADDING",  (0,0),(-1,-1), 4),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [W, ALT]),
    ]))
    story.append(_fdef_t)
    NL(story, 5)
    story.append(Paragraph(
        "<b>Methodology basis:</b> based on the selected financial modelling methodology and configured "
        "assumptions for this report. Applicable accounting, taxation, banking, RBI, government scheme "
        "and lender-specific requirements should be independently verified by the sanctioning bank.",
        ST["small"]))
    NL(story, 3)
    story.append(Paragraph(
        "<b>Sensitivity Analysis:</b> Variable costs scale proportionally with revenue; fixed costs remain "
        "constant. Five scenarios shown: Optimistic (+10%) / Base (0%) / Conservative (−10%) / "
        "Pessimistic (−20%) / Worst (−30%).",
        ST["small"]))
    PB(story)

    # ── SECTION 31 — VALIDATION / RECONCILIATION SUMMARY ───────────────
    SEC("SECTION 31 — FINANCIAL MODEL RECONCILIATION", story)
    _val_warnings = validate_cma_dpr(inp, cma, dpr)
    import logging as _logging
    _val_logger = _logging.getLogger("pdf_builder.validator")
    for _w in _val_warnings:
        _val_logger.warning(_w)
    _recon_pass = len(_val_warnings) == 0
    recon_tbl = Table(
        [[Paragraph(
            "✓ FINANCIAL MODEL RECONCILIATION: PASSED" if _recon_pass else
            f"FINANCIAL MODEL RECONCILIATION: {len(_val_warnings)} item(s) flagged for internal review",
            ST["rec_box"]
        )]],
        colWidths=[170*mm]
    )
    recon_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), GRN if _recon_pass else AMB),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
    ]))
    story.append(recon_tbl)
    NL(story, 4)
    story.append(Paragraph(
        "This platform checks, on every report: Project Cost = Means of Finance; Assets = Liabilities + "
        "Equity (every year); Loan Opening − Repayment = Closing; Fixed Asset roll-forward; and Opening "
        "Cash + Net Cash Flow = Closing Cash. Detailed reconciliation messages (where applicable) are "
        "retained for internal review and are not reproduced here.",
        ST["small"]))
    PB(story)

    # ── SECTION 32 — DECLARATION & DISCLAIMER ──────────────────────────
    SEC("SECTION 32 — DECLARATION & DISCLAIMER", story)
    NL(story, 8)
    story.append(Paragraph(
        "This Business Loan Feasibility Report (indicative financial assessment) has been prepared "
        "based on the information and data furnished by the applicant/entrepreneur. All financial projections "
        "are indicative and based on stated assumptions. Actual results may vary due to market conditions, "
        "regulatory changes, or operational factors beyond the scope of this report.",
        ST["normal"]))
    NL(story, 4)
    story.append(Paragraph(
        "The financial institution / bank is advised to independently verify all data, conduct its own "
        "due diligence, and apply its standard credit appraisal norms before sanctioning any loan. "
        "This is a preliminary borrower feasibility report, not a certified bank CMA. "
        f"This report is valid for {inp.get('report_validity_days', 120)} days from the date of preparation.",
        ST["normal"]))
    NL(story, int(20*mm))
    sig_t = Table([
        ["Prepared By","Verified By","Authorised By"],
        ["\n\n\n________________________","\n\n\n________________________","\n\n\n________________________"],
        ["Name:","Name:","Name:"],
        ["Designation:","Designation:","Designation:"],
        ["Date:","Date:","Date:"],
    ], colWidths=[56.7*mm]*3)
    sig_t.setStyle(TableStyle([
        ("ALIGN",(0,0),(-1,-1),"CENTER"),("FONTSIZE",(0,0),(-1,-1),8),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("GRID",(0,0),(-1,-1),0.3,GRY),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
    ]))
    story.append(sig_t)
    NL(story, int(8*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=MG))
    NL(story, 2)
    story.append(Paragraph(
        f"Report Reference: {ref_no}  |  Generated: {datetime.now().strftime('%d %b %Y %H:%M')}  |  "
        "Platform: GTAB — Government Loan Assistance Platform  |  CONFIDENTIAL",
        ST["small"]))

    doc.build(story)
