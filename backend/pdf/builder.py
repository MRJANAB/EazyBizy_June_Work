"""
pdf_builder.py  —  Generates the full Combined CMA + DPR PDF.
Call:  build_pdf(inp_dict, cma_data, dpr_data, output_path)
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

def _objective_scorecard_rows(cma: dict, tl_de, total_leverage) -> list:
    """Display objective credit indicators only; preserves backend score output."""
    return [
        ["Metric", "Value", "Benchmark", "View"],
        ["DSCR (Year 1)", str(cma.get("dscr_y1", 0)), ">= 1.25x", cma.get("dscr_label", "")],
        ["Average DSCR", str(cma.get("avg_dscr", cma.get("avg_dscr_5yr", 0))), ">= 1.25x", dscr_label(cma.get("avg_dscr", 0))],
        ["ROI (EBITDA)", rp2(cma.get("roi_ebitda_pct", 0)), "> 15%", "Good" if cma.get("roi_ebitda_pct", 0) > 15 else "Monitor"],
        ["Current Ratio", r2(cma.get("current_ratio", 0)), "> 1.33", "Good" if cma.get("current_ratio", 0) > 1.33 else "Monitor"],
        ["D:E (TL / Fixed Equity)", f"{tl_de} : 1", "< 2", "Good" if tl_de < 2 else "High"],
        ["Total Leverage", f"{total_leverage} : 1", "< 3", "Good" if total_leverage < 3 else "High"],
        ["Promoter Contribution", rp2(cma.get("promoter_pct", 0)), ">= 10%", "Good" if cma.get("promoter_pct", 0) >= 10 else "Low"],
        ["Interest Coverage", r2(cma.get("interest_coverage_y1", 0)), "> 2", "Good" if cma.get("interest_coverage_y1", 0) > 2 else "Monitor"],
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

    # ════════════════════════════════════════════════════════════════
    # COVER PAGE
    # ════════════════════════════════════════════════════════════════
    _scheme_raw   = inp.get("scheme", "MSME")
    _scheme_full  = scheme_display(_scheme_raw)
    _scheme_short = scheme_short(_scheme_raw)
    _industry_str = str(inp.get("industry", inp.get("industry_type", "Manufacturing"))).title()
    _nature_biz   = inp.get("nature_of_business", inp.get("business_description", ""))
    _promoter_name= f"{inp.get('title','').strip()} {inp.get('full_name', inp.get('entrepreneur_name',''))}".strip()
    _bank_name    = inp.get("bank_name", inp.get("preferred_bank", ""))

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

    # Scheme highlight banner
    _is_pmegp  = "pmegp" in _scheme_raw.lower()
    _is_mudra  = "mudra" in _scheme_raw.lower()
    _is_cgtmse = "cgtmse" in _scheme_raw.lower()
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

    ref_no = f"CMA/{_scheme_short}/{datetime.now().strftime('%Y%m')}/{str(abs(hash(inp.get('entrepreneur_name','X'))))[:6]}"
    info = Table([
        ["Field", "Details"],
        ["Applicant Name",       _promoter_name],
        ["Father's Name",        inp.get("fathers_name", "")],
        ["Business Name",        inp.get("business_name","")],
        ["Location / District",  f"{inp.get('location','')} — {inp.get('district','')}".strip(" —")],
        ["Scheme",               _scheme_full],
        ["Industry / Sector",    f"{_industry_str}" + (f" | {_nature_biz[:40]}" if _nature_biz else "")],
        ["Initial Project Investment", rs(display_total_project_cost)],
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
        "by the financial institution. Not for public circulation.", ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # NOT BANKABLE BANNER (shown when assumptions fail CA viability benchmarks)
    # ════════════════════════════════════════════════════════════════
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
            _reasons.append(f"DSCR {round(_avg_dscr_val,2)}x < 1.25x benchmark")
        if _annual_pat_v < 0:
            _reasons.append("Net Profit (PAT) is negative")
        if _annual_ebitda_v < 0:
            _reasons.append("EBITDA is negative — operating losses")
        if cma.get("payback_not_achievable", False):
            _reasons.append("Payback period not achievable")
        nb_tbl = Table(
            [[Paragraph("⚠ NOT BANKABLE – REVISE ASSUMPTIONS BEFORE SUBMISSION", ST["rec_approve"])]],
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

    # ════════════════════════════════════════════════════════════════
    # EXECUTIVE SUMMARY
    # ════════════════════════════════════════════════════════════════
    SEC("EXECUTIVE SUMMARY", story)

    # FIX #14: replace lending-decision language with neutral feasibility assessment labels
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
    rec_box = Table([[Paragraph(_rec_display, ST["rec_approve"])]],
                    colWidths=[170*mm])
    rec_box.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), rec_color),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
    ]))
    story.append(rec_box)
    NL(story, 5)

    kpi = Table([
        ["Initial Project Investment", "Total Bank Exposure", "Average DSCR", "Viability Grade"],
        [rs(display_total_project_cost), rs(display_loan_amount),
         str(cma.get("avg_dscr", dscr["average"])),         cma["credit_rating"]],
    ], colWidths=[42.5*mm]*4)
    kpi.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,0), DG),
        ("BACKGROUND",    (0,1),(-1,1), LG),
        ("TEXTCOLOR",     (0,0),(-1,0), W),
        ("FONTNAME",      (0,0),(-1,1), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),(-1,-1), 9),
        ("ALIGN",         (0,0),(-1,-1), "CENTER"),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("GRID",          (0,0),(-1,-1), 0.5, W),
    ]))
    story.append(kpi)
    NL(story, 5)

    H2("Key Financial Metrics", story)
    metrics = Table([
        ["Metric", "Value", "Metric", "Value"],
        ["Monthly Revenue",     rs(cma["net_monthly_revenue"]),  "Monthly EBITDA",  rs(cma["ebitda_monthly"])],
        ["Annual Revenue",      rs(cma["annual_revenue"]),       "Annual PAT",      rs(cma["annual_pat"])],
        ["EBITDA Margin",       rp2(cma["ebitda_margin_pct"]),   "Net Margin",      rp2(cma["net_margin_pct"])],
        ["ROI (EBITDA)",        rp2(cma["roi_ebitda_pct"]),      "ROI (PAT)",       rp2(cma["roi_pat_pct"])],
        ["Payback Period",      ("N/A" if (cma.get("payback_not_achievable") or not cma.get("breakeven_months") or str(cma.get("breakeven_months","")).upper()=="N/A" or float(cma.get("breakeven_months",0) if isinstance(cma.get("breakeven_months"),( int,float)) else 0)==0) else f"{round(float(cma.get('breakeven_months',0)),1)} months"), "Monthly TL Service", rs(cma["emi"])],
        ["Interest Coverage",   r2(cma.get("interest_coverage_y1", 0)), "Current Ratio",   r2(cma["current_ratio"])],
        # Item #8: Split promoter contribution for banker clarity
        ["Promoter Fixed Equity",  rs(display_promoter_fixed_equity),
         "Promoter WC Margin",     rs(display_promoter_wc_margin)],
        ["Total Promoter Contribution", rs(display_promoter_contribution),
         "Promoter %",            pof(display_promoter_contribution, display_total_project_cost)],
    ], colWidths=[50*mm,35*mm,50*mm,35*mm])
    metrics.setStyle(BTS())
    story.append(metrics)
    NL(story, 5)

    # Means of finance — Fixed project funding only (WC shown separately below)
    H2("Means of Finance — Fixed Project Funding", story)
    _exec_margin_money = pc.get("margin_money", 0) or cma.get("margin_money", 0)
    _exec_wc_loan      = R(cma.get("working_capital_loan", pc.get("wc_loan", 0)) or 0, 2)
    _exec_wc_margin    = R(float(wc[0].get("margin", 0) if wc else 0), 2)
    _exec_wc_total     = R(_exec_wc_margin + _exec_wc_loan, 2)
    if _exec_margin_money:
        _exec_promoter_cash = R(display_promoter_fixed_equity, 2)
        _exec_fin_total = R(_exec_promoter_cash + _exec_margin_money + pc["term_loan"], 2)
        fin = Table([
            ["Source (Fixed Project Funding)", "Amount (Rs.)", "% of Fixed Cost"],
            ["Promoter's Equity (Cash)",       rs(_exec_promoter_cash),  pof(_exec_promoter_cash,  _exec_fin_total)],
            ["Govt Subsidy — PMEGP",           rs(_exec_margin_money),   pof(_exec_margin_money,   _exec_fin_total)],
            ["Term Loan from Bank",            rs(pc["term_loan"]),      pof(pc["term_loan"],      _exec_fin_total)],
            ["TOTAL (Fixed Project Cost)",     rs(_exec_fin_total),      "100.0%"],
        ], colWidths=[95*mm,45*mm,30*mm])
        fin.setStyle(BTS()); fin.setStyle(TOT(4))
    else:
        _exec_fin_total = R(display_promoter_fixed_equity + pc["term_loan"], 2)
        fin = Table([
            ["Source (Fixed Project Funding)", "Amount (Rs.)", "% of Fixed Cost"],
            ["Promoter's Equity",   rs(display_promoter_fixed_equity), pof(display_promoter_fixed_equity, _exec_fin_total)],
            ["Term Loan from Bank", rs(pc["term_loan"]),               pof(pc["term_loan"],               _exec_fin_total)],
            ["TOTAL (Fixed Project Cost)", rs(_exec_fin_total),        "100.0%"],
        ], colWidths=[95*mm,45*mm,30*mm])
        fin.setStyle(BTS()); fin.setStyle(TOT(3))
    story.append(fin)
    if _exec_wc_total > 0:
        NL(story, 2)
        story.append(Paragraph(
            f"<b>Working Capital (Revolving):</b> "
            f"Promoter Margin Rs.{_exec_wc_margin:,.0f} + "
            f"WC Bank Finance Rs.{_exec_wc_loan:,.0f} = Rs.{_exec_wc_total:,.0f}  |  "
            f"<b>Total Bank Exposure: Rs.{pc['term_loan'] + _exec_wc_loan:,.0f}</b>",
            ST["small"]))
    NL(story, 5)

    H2("5-Year Financial Highlights", story)
    hl = Table(
        [["Year","Capacity","Revenue (Rs.)","Net Profit (Rs.)","Cash Accruals (Rs.)","DSCR"]] +
        [[f"Year {cy['year']}", rp(cy["capacity"]), r(cy["revenue"]),
          r(cy["net_profit"]), r(cy["cash_accruals"]), str(dscr["years"][i]["dscr"])]
         for i,cy in enumerate(cop)],
        colWidths=[18*mm,22*mm,34*mm,34*mm,38*mm,16*mm])
    hl.setStyle(BTS())
    story.append(hl)
    NL(story, 5)

    H2("Executive Observations", story)
    _obs_dscr_bench   = float(cma.get("dscr_benchmark", 1.25) or 1.25)
    _obs_avg_dscr     = float(cma.get("avg_dscr", dscr["average"]) or 0)
    _obs_dscr_y1      = float(cma.get("dscr_y1", 0) or 0)
    _obs_annual_pat   = float(cma.get("annual_pat", 0) or 0)
    _obs_ebitda_m     = float(cma.get("ebitda_monthly", 0) or 0)
    # DSCR observation — conditional on whether it meets benchmark
    if _obs_dscr_y1 < 0 or float(cma.get("annual_ebitda", _obs_ebitda_m * 12) or 0) < 0:
        _dscr_obs = f"Projected monthly EBITDA of Rs. {_obs_ebitda_m:,.0f} results in a DSCR of {cma['dscr_y1']}x — operating losses detected, debt servicing is stressed."
    elif _obs_avg_dscr < _obs_dscr_bench:
        _dscr_obs = f"Projected monthly EBITDA of Rs. {_obs_ebitda_m:,.0f} yields a DSCR of {cma['dscr_y1']}x — this is BELOW the minimum benchmark of {_obs_dscr_bench}x. Revise revenue or reduce borrowing."
    else:
        _dscr_obs = f"Projected monthly EBITDA of Rs. {_obs_ebitda_m:,.0f} supports a DSCR of {cma['dscr_y1']}x — adequate debt-servicing capacity."
    # PAT observation
    if _obs_annual_pat < 0:
        _pat_obs = f"Annual Net Profit (PAT) is negative at Rs. {_obs_annual_pat:,.0f} — the project is currently loss-making under stated assumptions."
    elif _obs_annual_pat == 0:
        _pat_obs = "Annual Net Profit (PAT) is zero — the project breaks even but generates no surplus."
    else:
        _pat_obs = f"Annual Net Profit (PAT) of Rs. {_obs_annual_pat:,.0f} reflects positive profitability under stated assumptions."
    obs = [
        f"Initial project investment is Rs. {display_total_project_cost:,.0f} against proposed bank finance of Rs. {display_loan_amount:,.0f}.",
        f"Promoter contribution stands at Rs. {display_promoter_contribution:,.0f} ({pof(display_promoter_contribution, display_total_project_cost)} of total project cost).",
        _dscr_obs,
        f"Average 5-year DSCR of {cma.get('avg_dscr', dscr['average'])} — {cma['dscr_label']}.",
        ("Break-even NOT achievable under current projections." if (cma.get("payback_not_achievable") or str(cma.get("breakeven_months","")).upper()=="N/A" or float(cma.get("breakeven_months",0) if isinstance(cma.get("breakeven_months"),(int,float)) else 0)==0) else f"Break-even expected within {round(float(cma.get('breakeven_months',0)),1)} months."),
        _pat_obs,
        f"Viability Grade: {cma['credit_rating']} | Risk Level: {cma['risk_level']}.",
    ]
    _salary_burden_pct = (
        float(cma.get("annual_salary_total", 0) or 0) / max(float(cma.get("annual_revenue", 0) or 0), 1) * 100
    )
    if float(man.get("promoter_annual", 0) or 0) <= 0:
        obs.append("Promoter remuneration not considered. Profitability may be overstated.")
    if _salary_burden_pct > 30:
        obs.append("Salary burden is relatively high; review staffing structure and productivity before bank submission.")
    if display_promoter_contribution > 0 and display_loan_amount / max(display_promoter_contribution, 1) > 3:
        obs.append("Leverage is high; consider increasing promoter contribution or reducing borrowing.")
    if _obs_avg_dscr < _obs_dscr_bench:
        obs.append("DSCR is weak against benchmark; consider lower debt, longer tenure, or stronger revenue assumptions.")
    if _obs_annual_pat < 0:
        obs.append("PAT is negative; cost rationalisation and revenue validation are required before lender appraisal.")
    obs.append(_scheme_advisory(inp, cma))
    for o in obs:
        story.append(Paragraph(f"• {o}", ST["bullet"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION A — APPLICANT & BUSINESS PROFILE
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION A — APPLICANT & BUSINESS PROFILE", story)

    H2("A1. Personal Profile", story)
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

    # Existing-business audited snapshot — only shown when it's an existing
    # business and the applicant supplied figures on Step 3.
    _ex_turnover = float(inp.get("existing_annual_turnover", 0) or 0)
    _ex_profit   = float(inp.get("existing_annual_profit", 0) or 0)
    _ex_emi      = float(inp.get("existing_monthly_emi", 0) or 0)
    if "existing" in str(_biz_status).lower() and (_ex_turnover or _ex_profit or _ex_emi):
        H2("A2a. Existing Business — Current Financials", story)
        exbiz = Table([
            ["Field","Details","Field","Details"],
            ["Last FY Turnover",   f"Rs. {r(_ex_turnover)}",  "Last FY Net Profit", f"Rs. {r(_ex_profit)}"],
            ["Existing Loan EMI",  f"Rs. {r(_ex_emi)} / mo",  "Net Margin",
                (f"{(_ex_profit / _ex_turnover * 100):.1f}%" if _ex_turnover else "—")],
        ], colWidths=[35*mm,50*mm,35*mm,50*mm])
        exbiz.setStyle(BTS())
        story.append(exbiz)
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

    # ── A6. Competitive Analysis ──────────────────────────────────────────────
    _competitors = inp.get("competitors") or []
    if _competitors:
        H2("A6. Competitive Analysis", story)
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

    # ════════════════════════════════════════════════════════════════
    # SECTION B — PROJECT DETAILS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION B — PROJECT DETAILS", story)

    # ── BOX A — Initial Project Investment ───────────────────────────
    _box_a = Table([[Paragraph("A.  Initial Project Investment", ST["h2"])]], colWidths=[170*mm])
    _box_a.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), LG),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("BOX",           (0,0),(-1,-1), 1.2, MG),
    ]))
    story.append(_box_a); NL(story, 2)
    cost_rows = [["Sl.","Particulars","Amount (Rs.)","% of Total"]]
    for item in cma["project_cost_items"]:
        cost_rows.append([str(item["code"]), item["particulars"],
                          r(item["amount"]), pof(item["amount"], cma["total_project_cost"])])
    cost_rows.append(["","TOTAL", r(cma["total_project_cost"]), "100.0%"])
    cost_t = Table(cost_rows, colWidths=[10*mm,90*mm,38*mm,28*mm])
    cost_t.setStyle(BTS()); cost_t.setStyle(TOT(len(cost_rows)-1))
    story.append(cost_t)
    NL(story, 5)

    # ── Means of Finance — Fixed Project Funding ─────────────────────
    H2("B2. Means of Finance — Fixed Project Funding", story)
    _b2_margin_money = pc.get("margin_money", 0) or cma.get("margin_money", 0)
    _b2_wc_loan      = R(cma.get("working_capital_loan", pc.get("wc_loan", 0)) or 0, 2)
    _b2_wc_margin    = R(cma.get("fixed_project_cost", display_total_project_cost) - display_total_project_cost + _b2_wc_loan + (wc[0].get("margin", 0) if wc else 0), 2) if False else R(float(wc[0].get("margin", 0) if wc else 0), 2)
    _b2_wc_total     = R(_b2_wc_margin + _b2_wc_loan, 2)
    # Fixed project cost = total project cost minus WC margin
    _b2_fixed_pc     = R(display_total_project_cost - _b2_wc_margin, 2)

    NL(story, 2)
    if _b2_margin_money:
        _b2_promoter_cash = R(display_promoter_fixed_equity, 2)
        finance_total_a   = R(_b2_promoter_cash + _b2_margin_money + pc["term_loan"], 2)
        mof_rows = [
            ["Source","Amount (Rs.)","% of Fixed Cost"],
            ["Equity Capital (Promoter Cash)",      rs(_b2_promoter_cash),  pof(_b2_promoter_cash,  finance_total_a)],
            ["Govt Subsidy — PMEGP (Margin Money)", rs(_b2_margin_money),   pof(_b2_margin_money,   finance_total_a)],
            ["Term Loan from Bank",                 rs(pc["term_loan"]),    pof(pc["term_loan"],    finance_total_a)],
            ["SUB-TOTAL (Fixed Project Cost)",      rs(finance_total_a),    "100.0%"],
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
            ["SUB-TOTAL (Fixed Project Cost)",  rs(finance_total_a),               "100.0%"],
        ]
        mof = Table(mof_rows, colWidths=[95*mm,45*mm,30*mm])
        mof.setStyle(BTS()); mof.setStyle(TOT(3))
    story.append(mof)

    if _b2_wc_total > 0:
        # ── BOX B — Working Capital Requirement ──────────────────────
        NL(story, 5)
        _box_b = Table([[Paragraph("B.  Working Capital Requirement", ST["h2"])]], colWidths=[170*mm])
        _box_b.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), LG),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
            ("BOX",           (0,0),(-1,-1), 1.2, MG),
        ]))
        story.append(_box_b); NL(story, 2)
        wc_fin_rows = [
            ["Source","Amount (Rs.)","% of WC Requirement"],
            ["Promoter WC Margin",   rs(_b2_wc_margin), pof(_b2_wc_margin, _b2_wc_total) if _b2_wc_total else "0.0%"],
            ["WC Bank Finance",      rs(_b2_wc_loan),   pof(_b2_wc_loan,   _b2_wc_total) if _b2_wc_total else "0.0%"],
            ["TOTAL WC REQUIREMENT", rs(_b2_wc_total),  "100.0%"],
        ]
        wc_fin = Table(wc_fin_rows, colWidths=[95*mm,45*mm,30*mm])
        wc_fin.setStyle(BTS()); wc_fin.setStyle(TOT(3))
        story.append(wc_fin)
        NL(story, 2)
        story.append(Paragraph(
            "Working Capital Bank Finance is a revolving operational facility "
            "and is not included in fixed project cost.",
            ST["small"]))

        # ── BOX C — Total Bank Exposure ───────────────────────────────
        NL(story, 5)
        _box_c = Table([[Paragraph("C.  Total Bank Exposure", ST["h2"])]], colWidths=[170*mm])
        _box_c.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), LG),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
            ("BOX",           (0,0),(-1,-1), 1.2, MG),
        ]))
        story.append(_box_c); NL(story, 2)
        _total_bank_exp = pc["term_loan"] + _b2_wc_loan
        exp_rows = [
            ["Facility",                            "Amount (Rs.)",       "Nature"],
            ["Term Loan (Fixed Project Funding)",   rs(pc["term_loan"]),  "Instalment — repaid from cash accruals"],
            ["Working Capital Finance (Revolving)", rs(_b2_wc_loan),      "Revolving — renewed annually"],
            ["TOTAL BANK EXPOSURE",                 rs(_total_bank_exp),  ""],
        ]
        exp_t = Table(exp_rows, colWidths=[85*mm,45*mm,40*mm])
        exp_t.setStyle(BTS()); exp_t.setStyle(TOT(3))
        story.append(exp_t)
        NL(story, 2)

    NL(story, 3)
    # CA-standard D:E — TL only vs Total Leverage with explicit formula labels
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
    if _b2_margin_money:
        NL(story, 3)
        story.append(Paragraph(
            f"<b>Margin Money Note:</b> Margin Money of Rs.{_b2_margin_money:,.0f} is held as TDR "
            "for 3 years as per PMEGP guidelines. "
            "Interest is charged on the full outstanding balance during the lock-in period.",
            ST["small"],
        ))
    NL(story, 5)

    # B3 summary removed to avoid overlap with Section I (Working Capital Requirement)
    NL(story, 5)

    # ════════════════════════════════════════════════════════════════
    # SECTION C — CAPITAL EQUIPMENT (industry-aware label)
    # ════════════════════════════════════════════════════════════════
    _sec_c_title = (
        "SECTION C — SHOP EQUIPMENT, FIXTURES & INTERIORS"   if _is_trading else
        "SECTION C — OFFICE INFRASTRUCTURE & SERVICE SETUP"   if _is_service else
        "SECTION C — AGRICULTURAL EQUIPMENT & INFRASTRUCTURE" if _is_agri   else
        "SECTION C — PLANT, MACHINERY & EQUIPMENT"
    )
    SEC(_sec_c_title, story)
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

    # Supplier reference sub-table (only shown when supplier info is present)
    _supplier_rows = [["Sl.","Equipment / Asset","Supplier Name","City","Contact"]]
    for i, m in enumerate(mc["items"]):
        _sname = str(m.get("supplier_name", "") or "")
        _scity = str(m.get("supplier_city", "") or "")
        _sph   = str(m.get("supplier_phone", "") or "")
        if _sname or _scity or _sph:
            _supplier_rows.append([
                str(i+1), m["name"],
                _sname or "—", _scity or "—", _sph or "—",
            ])
    if len(_supplier_rows) > 1:
        story.append(Paragraph("Supplier / Vendor Reference (Banks require quotations for items above Rs. 50,000)", ST["small"]))
        NL(story, 2)
        _sup_t = Table(_supplier_rows, colWidths=[8*mm,55*mm,45*mm,27*mm,32*mm])
        _sup_t.setStyle(BTS())
        story.append(_sup_t)

    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION D — PRODUCTION / OPERATING PARAMETERS & SALES
    # ════════════════════════════════════════════════════════════════
    _sec_d_title = (
        "SECTION D — SALES MODEL & OPERATING PARAMETERS"      if _is_trading else
        "SECTION D — SERVICE REVENUE MODEL & OPERATING PARAMETERS" if _is_service else
        "SECTION D — PRODUCTION PARAMETERS & MANUFACTURING SCHEDULE"
    )
    SEC(_sec_d_title, story)
    # _industry/_is_trading/_is_service/_is_agri/_is_mfg already defined at top of build_pdf
    _is_trading_service = not _is_mfg

    if _is_trading_service:
        # Trading/Service: show revenue-based parameters instead of manufacturing production
        H2("D1. Operating Parameters", story)
        if _is_service:
            _d1_rows = [
                ["Parameter","Value","Unit"],
                ["Service Revenue Model", "Client/project billing (see Section A3)", ""],
                ["Client Billing Cycle",  f"{inp.get('debtor_days', 30)} days", "Collection"],
                ["Hours of Operation / Day", str(inp["hours_of_operation"]), "Hours"],
                ["Annual Revenue (100% Cap)", rs(ps["revenue_at_100pct"]), "Rs."],
            ]
        else:
            _d1_rows = [
                ["Parameter","Value","Unit"],
                ["Working Days per Year",     r(inp["working_days_per_year"]),  "Days"],
                ["Annual Revenue (100% Cap)", rs(ps["revenue_at_100pct"]),      "Rs."],
                ["Revenue Model",             "Revenue-based (see Section A3 for product details)", ""],
            ]
        prod_params = Table(_d1_rows, colWidths=[90*mm,55*mm,20*mm])
        prod_params.setStyle(BTS())
        story.append(prod_params)
        NL(story, 5)

        H2("D2. Annual Sales Realization (at 100% Capacity)", story)
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
                total_rev = sum(p.get("monthly_revenue", 0) * 12 for p in products)
                for p in products:
                    ann_rev = p.get("monthly_revenue", 0) * 12
                    name = p.get("name") or p.get("category") or "Product"
                    mix = (ann_rev / total_rev * 100) if total_rev else 0
                    sales_rows.append([name, r(ann_rev), rp2(mix)])
                sales_rows.append(["Total at 100% Capacity", r(total_rev), "100.0%"])
            else:
                sales_rows.append([primary_product, r(ps["revenue_at_100pct"]), "100.0%"])
                sales_rows.append(["Total at 100% Capacity", r(ps["revenue_at_100pct"]), "100.0%"])
                
            sales_t = Table(sales_rows, colWidths=[90*mm,50*mm,30*mm])
            sales_t.setStyle(BTS()); sales_t.setStyle(TOT(len(sales_rows)-1))
        story.append(sales_t)
        NL(story, 5)

        H2("D3. " + ("Service Delivery Cost Structure" if _is_service else "Purchase / Direct Cost Structure"), story)
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
        # Manufacturing / Agriculture: show full production parameters
        H2("D1. Production Parameters", story)
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

        H2("D2. Annual Sales Realization (at 100% Capacity)", story)
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
        NL(story, 5)

        H2("D3. Raw Material & Consumables (at 100% Capacity)", story)
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

    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION E — HR & MANPOWER
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION E — HR & MANPOWER", story)
    H2("E1. Manpower & Wage Structure", story)
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
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION F — FINANCIAL ASSUMPTIONS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION F — FINANCIAL ASSUMPTIONS", story)
    _assump_rows = [
        ["Assumption","Value","Assumption","Value"],
        ["Contingency Rate",         rp(inp.get("contingency_rate",0)),  "Term Loan %",          rp(inp["term_loan_pct"])],
        ["WC Loan %",                rp(inp["wc_loan_pct"]),              "Term Loan Interest",   rp(inp["term_loan_interest"])],
        ["WC Interest Rate",         rp(inp["wc_interest_rate"]),         "Annual Salary Hike",   rp(inp["salary_increase_rate"])],
        ["Admin Expense Increase",   rp(inp["admin_increase_rate"]),      "Marketing % of Rev",   rp(inp["marketing_expense_pct"])],
        ["Building Dep (SLM)",       rp(inp["building_dep_rate_slm"]),    "Asset Dep (SLM)" if _is_service else "Machinery Dep (SLM)", rp(inp["machinery_dep_rate_slm"])],
        ["Revenue Growth (CMA)",     rp2(inp["revenue_growth_pct"]),      "Salary Hike (CMA)",    rp2(inp["salary_increase_pct"])],
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
    # SECTION G — DEPRECIATION
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION G — CALCULATION OF DEPRECIATION (SLM Method)", story)
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
        ["Asset", "Gross Value (Rs.)", "Dep Rate", "Annual Dep (Rs.)"],
        [_dep_building_label,
         rs(dep["building_gross"]),
         rp(inp["building_dep_rate_slm"]),
         rs(dep["dep_building_slm"])],
        [_dep_machinery_label,
         rs(dep.get("pm_with_contingency", dep["machinery_gross"])),
         rp(inp["machinery_dep_rate_slm"]),
         rs(dep["dep_machinery_slm"])],
        ["Total Gross Block",
         rs(dep["gross_block"]),
         "",
         rs(dep["total_per_year"])],
    ], colWidths=[70*mm, 40*mm, 28*mm, 32*mm])
    gb_t.setStyle(BTS())
    gb_t.setStyle(TOT(3))
    story.append(gb_t)
    NL(story, 5)

    H2("Book Depreciation (SLM) — 5-Year Schedule", story)
    dep_t = Table([
        ["Particulars",                "Year 1",               "Year 2",                   "Year 3",                   "Year 4",                   "Year 5"],
        ["Gross Block (Fixed)"]         + [r(dep["gross_block"])] * 5,
        ["Annual Depreciation"]         + [r(dep["total_per_year"])] * 5,
        ["Accumulated Depreciation"]    + [r(dep["total_per_year"] * y) for y in range(1, 6)],
        ["Net Block (Closing)"]         + [r(max(dep["gross_block"] - dep["total_per_year"] * y, 0)) for y in range(1, 6)],
    ], colWidths=[60*mm] + [22*mm] * 5)
    dep_t.setStyle(BTS())
    dep_t.setStyle(TOT(4))
    story.append(dep_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION H — TERM LOAN SCHEDULE
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION H — TERM LOAN REPAYMENT & INTEREST SCHEDULE", story)
    _morat_mo = inp.get("moratorium_months", inp.get("moratorium_years", 0) * 12)
    _morat_str = f"{_morat_mo} Month(s)" if _morat_mo > 0 else "None"
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
    # SECTION IX — AI-POWERED EXECUTIVE OBSERVATIONS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION IX — EXECUTIVE FINANCIAL SUMMARY", story)
    story.append(Paragraph("Key observations based on the financial projections for this project:", ST["normal"]))
    NL(story, 2)
    obs_list = cma.get("ai_observations", [])
    _avg_dscr_obs   = float(cma.get("avg_dscr",        0)    or 0)
    _annual_pat_obs = float(cma.get("annual_pat",       0)    or 0)
    _annual_ebitda_obs = float(cma.get("annual_ebitda", 0)    or 0)
    _dscr_bench_obs = float(cma.get("dscr_benchmark",   1.25) or 1.25)
    _is_reject_obs  = "REJECT" in str(cma.get("recommendation", "")).upper()
    if not obs_list:
        if _annual_ebitda_obs < 0 or _annual_pat_obs < 0:
            # Loss-making — most severe
            obs_list = [
                f"The project shows operating losses: Annual EBITDA Rs. {_annual_ebitda_obs:,.0f} / "
                f"Annual PAT Rs. {_annual_pat_obs:,.0f}. Debt servicing is not sustainable under current assumptions.",
                f"Average DSCR of {round(_avg_dscr_obs, 2)}x — the project cannot reliably service its debt obligations.",
                "Recommended actions: increase revenue projections, reduce fixed costs, lower borrowing, or increase promoter equity. Do not submit to a bank without revising assumptions.",
            ]
        elif _avg_dscr_obs < _dscr_bench_obs:
            # Sub-benchmark — stressed but not loss-making
            obs_list = [
                f"Average DSCR of {round(_avg_dscr_obs, 2)}x is below the required benchmark of {_dscr_bench_obs}x. "
                "Debt servicing appears stressed under current revenue and cost assumptions.",
                f"Annual Net Profit (PAT) of Rs. {_annual_pat_obs:,.0f} — positive but insufficient to adequately cover debt service.",
                f"Recommended actions: improve revenue by at least {round(((_dscr_bench_obs / max(_avg_dscr_obs, 0.01)) - 1) * 100)}% or reduce total borrowing to bring DSCR above {_dscr_bench_obs}x.",
            ]
        elif _avg_dscr_obs < 1.5:
            # Marginal — meets benchmark but narrow cushion
            obs_list = [
                f"Average DSCR of {round(_avg_dscr_obs, 2)}x meets the {_dscr_bench_obs}x benchmark with a narrow margin. "
                "A small revenue shortfall could stress debt servicing.",
                f"Annual Net Profit (PAT) of Rs. {_annual_pat_obs:,.0f} — profitable but sensitivity to cost increases should be monitored.",
                "The project marginally meets financial viability criteria. A conservative revenue assumption is advisable before bank submission.",
            ]
        else:
            # Healthy
            obs_list = [
                f"Average DSCR of {round(_avg_dscr_obs, 2)}x is comfortably above the {_dscr_bench_obs}x benchmark — "
                "the project demonstrates strong debt-servicing capacity.",
                f"Annual Net Profit (PAT) of Rs. {_annual_pat_obs:,.0f} reflects healthy profitability under stated assumptions.",
                "The project meets financial viability criteria. Projections appear reasonable and suitable for bank submission.",
            ]
    for o in obs_list:
        story.append(Paragraph(f"- {o}", ST["bullet"]))
    story.append(Spacer(1, 15))
    story.append(Paragraph(
        "<i>Note: The above observations are derived from the financial data and assumptions provided. "
        "All projections are indicative. Consult a qualified CA or financial advisor for a certified assessment.</i>",
        ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION I — WORKING CAPITAL
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION I — WORKING CAPITAL REQUIREMENT", story)
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
        # WIP and Finished Goods only shown for manufacturing / agriculture
        _wc_rows.append([f"Work in Progress ({_wip_days} days)"] + [r(_wc(w, "wip", "wip_wc")) for w in wc])
        _wc_rows.append([f"Finished Goods ({_fg_days} days)"]    + [r(_wc(w, "fg", "fg_wc"))   for w in wc])
    if not _is_service_wc:
        _wc_rows += [
            [f"Debtors ({_debtor_days} days)"] + [r(_wc(w, "debtors")) for w in wc],
            ["Less: Creditors"]               + [r(_wc(w, "creditors")) for w in wc],
        ]
    _wc_rows += [
        ["Total WC Required"]            + [r(w["total"]) for w in wc],
        ["WC Margin (Promoter's Share)"] + [r(w["margin"]) for w in wc],
        ["Bank WC Loan"]                 + [r(w["bank_loan"]) for w in wc],
        ["WC Interest"]                  + [r(w["wc_interest"]) for w in wc],
    ]
    _wc_total_row_idx = len(_wc_rows) - 4  # "Total WC Required" position
    wc_t = Table(_wc_rows, colWidths=[62*mm] + [21.6*mm] * 5)
    wc_t.setStyle(BTS())
    wc_t.setStyle(TOT(_wc_total_row_idx))
    story.append(wc_t)
    NL(story, 3)
    story.append(Paragraph(
        f"<b>Note:</b> WC Bank Loan (Rs. {wc[0]['bank_loan']:,.0f}) is a revolving credit facility -- "
        "not part of project cost. Renewed annually based on utilisation.",
        ST["small"]))
    if _is_service_wc:
        story.append(Paragraph(
            "Service WC uses receivables, salary float, expense float, and cash reserve. "
            "Manufacturing/trading inventory norms are intentionally excluded.",
            ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION J — INCOME & EXPENDITURE (P&L)
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION J — INCOME & EXPENDITURE STATEMENT  (Amounts in Rs.)", story)
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
        # Manufacturing P&L — CA standard: Revenue → Gross Profit → EBITDA → PAT
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
    # SECTION K — BALANCE SHEET
    # ════════════════════════════════════════════════════════════════
    # FIX #13: Balance sheet follows accounting standards — Owners' Funds / Long-Term / Current split
    SEC("SECTION K — PROJECTED BALANCE SHEET (Schedule III Format, Amounts in Rs.)", story)
    _has_accumulated_losses = any(float(pb.get("reserves", 0) or 0) < 0 for pb in pbs)
    _display_reserve = lambda pb: max(float(pb.get("reserves", 0) or 0), 0)
    _display_loss = lambda pb: abs(min(float(pb.get("reserves", 0) or 0), 0))
    _display_net_worth = lambda pb: (
        float(pb.get("equity", 0) or 0) + float(pb.get("reserves", 0) or 0)
    )
    bs_rows = [
        ["Particulars","Year 0","Year 1","Year 2","Year 3","Year 4","Year 5"],
        # ── EQUITY & LIABILITIES ─────────────────────────────────────────────
        ["I. EQUITY & LIABILITIES","","","","","",""],
        ["  (a) Owners' Funds","","","","","",""],
        ["  Equity / Promoter Capital"]  + [r(pb["equity"])                for pb in pbs],
        *(
            [["  Govt Subsidy (PMEGP TDR)"] + [r(pb.get("margin_money",0)) for pb in pbs]]
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
        ["  Short-Term Funding Gap"]     + [r(pb.get("short_term_funding", pb.get("funding_gap", 0))) for pb in pbs],
        ["TOTAL EQUITY & LIABILITIES"]  + [r(pb["total_liabilities"])      for pb in pbs],
        # ── ASSETS ──────────────────────────────────────────────────────────
        ["II. ASSETS","","","","","",""],
        ["  (a) Non-Current Assets","","","","","",""],
        ["  Land"]                       + [r(pb["land"])                  for pb in pbs],
        ["  Gross Block (Fixed Assets)"] + [r(pb["gross_block"])           for pb in pbs],
        ["  Less: Accumulated Dep."]     + [r(pb["accum_dep"])             for pb in pbs],
        ["  Net Block (NBV — SLM)"]      + [r(pb["net_block"])             for pb in pbs],
        ["  Other Long-Term Assets"]     + [r(pb["other_assets"])          for pb in pbs],
        ["  (b) Current Assets","","","","","",""],
        ["  Stock / Debtors / WC Assets"]+ [r(pb["current_assets"])        for pb in pbs],
        ["  Cash & Bank Balance"]        + [r(pb["cash"])                  for pb in pbs],
        ["TOTAL ASSETS"]                 + [r(pb["total_assets"])          for pb in pbs],
    ]
    bs_t = Table(bs_rows, colWidths=[52*mm]+[19.7*mm]*6)
    bs_t.setStyle(BTS())
    # Total rows
    total_liab_row = next((i for i, row in enumerate(bs_rows) if row[0] == "TOTAL EQUITY & LIABILITIES"), None)
    total_assets_row = next((i for i, row in enumerate(bs_rows) if row[0] == "TOTAL ASSETS"), None)
    if total_liab_row:  bs_t.setStyle(TOT(total_liab_row))
    if total_assets_row: bs_t.setStyle(TOT(total_assets_row))
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
    # P6: Capital erosion warning — show if any projected year shows negative net worth
    _neg_eq_yrs = []
    _loss_yrs = []
    for _pb in pbs[1:]:   # skip Year 0
        _yr_num   = _pb.get("year", "?")
        _eq_total = float(_pb.get("equity", 0) or 0) + float(_pb.get("reserves", 0) or 0)
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
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION L — CASH FLOW
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION L — PROJECTED CASH FLOW STATEMENT", story)
    cf_t = Table([
        ["Particulars","Year 1","Year 2","Year 3","Year 4","Year 5"],
        ["SOURCE OF FUNDS","","","","",""],
        ["Cash Accruals"]           + [r(p["cash_accruals"])      for p in pcf],
        ["Inc. in Bank Borrowings"] + [r(p["inc_wc_loan"])        for p in pcf],
        ["Inc. in Short-Term Funding"] + [r(p.get("inc_short_term_funding", 0)) for p in pcf],
        ["Total Sources"]           + [r(p["total_sources"])       for p in pcf],
        ["USE OF FUNDS","","","","",""],
        ["Inc. in Current Assets"]  + [r(p["inc_current_assets"]) for p in pcf],
        ["Term Loan Repayment"]     + [r(p["tl_repayment"])       for p in pcf],
        ["Total Uses"]             + [r(p["total_uses"])           for p in pcf],
        ["Opening Cash Balance"]    + [r(p["opening_cash"])       for p in pcf],
        ["Surplus / Deficit"]       + [r(p["surplus"])            for p in pcf],
        ["Closing Cash Balance"]    + [r(p["closing_cash"])       for p in pcf],
    ], colWidths=[60*mm]+[22*mm]*5)
    cf_t.setStyle(BTS())
    cf_t.setStyle(TOT(5)); cf_t.setStyle(TOT(9)); cf_t.setStyle(TOT(12))
    story.append(cf_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION M — BREAK EVEN ANALYSIS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION M — BREAK EVEN POINT ANALYSIS", story)
    def _bep_val(b, key):
        """Show 'N/A' when contribution margin ≤ 0 (BEP not achievable)."""
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
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION N — DSCR
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION N — DEBT SERVICE COVERAGE RATIO (DSCR)", story)
    dr = dscr["years"]
    dscr_t = Table([
        ["Particulars","Year 1","Year 2","Year 3","Year 4","Year 5"],
        ["(A) Cash Accruals (PAT + Dep)"] + [r(d["cash_accruals"])  for d in dr],
        ["(A) Add: Interest on TL"]       + [r(d["tl_interest"])    for d in dr],
        ["Total (A) — Numerator"]         + [r(d["total_a"])         for d in dr],
        ["(B) TL Principal Repayment"]    + [r(d["tl_repayment"])   for d in dr],
        ["(B) Add: Interest on TL"]       + [r(d["tl_interest"])    for d in dr],
        ["Total (B) — Denominator"]       + [r(d["total_b"])         for d in dr],
        ["DSCR (A ÷ B)"]                  + [str(d["dscr"])          for d in dr],
        ["Average DSCR (5-Year)",          str(cma.get("avg_dscr", dscr["average"])),"","","",""],
    ], colWidths=[60*mm]+[22*mm]*5)
    dscr_t.setStyle(BTS())
    for idx in [3, 6, 7, 8]: dscr_t.setStyle(TOT(idx))
    story.append(dscr_t)
    NL(story, 4)
    min_req = 1.25
    avg = dscr["average"]
    status = "ABOVE" if avg >= min_req else "BELOW"
    story.append(Paragraph(
        f"<b>Note:</b> Banks typically require a minimum DSCR of {min_req}. "
        f"The average DSCR of {avg} is <b>{status}</b> the minimum benchmark.",
        ST["normal"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION O — MONTHLY P&L (CMA)
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION O — MONTHLY INCOME & EXPENDITURE ANALYSIS", story)
    H2("O1. Monthly Expense Breakdown", story)
    exp_rows = [
        ["Expense Head","Amount (Rs./Month)","Type"],
        ["Rent",                       rs(cma.get("rent") or inp.get("rent", 0) or inp.get("monthly_rent", 0)), "Fixed"],
        ["Salary & Wages (all staff)",     rs(cma.get("fixed_salary", 0)),         "Fixed"],
        ["Sub-Total Fixed",            rs((cma.get("rent") or inp.get("rent", 0) or inp.get("monthly_rent", 0)) + cma.get("fixed_salary", 0)), ""],
        ["Raw Material / COGS",        rs(cma.get("cogs_monthly", cma.get("raw_material_monthly", 0))), "Variable"],
        ["Stationery / Office",        rs(inp.get("stationery",0)),     "Variable"],
        ["Electricity & Water",        rs(inp.get("electricity_water",0)),"Variable"],
        ["Repair & Maintenance",       rs(inp.get("repair_maintenance",0)),"Variable"],
        ["Transport & Conveyance",     rs(inp.get("transport_conveyance",0)),"Variable"],
        ["Telephone & Internet",       rs(inp.get("telephone_internet",0)),"Variable"],
        ["Marketing & Advertising",    rs(cma.get("mktg_monthly", 0)),  "Variable"],
        ["Miscellaneous",              rs(inp.get("miscellaneous",0)),  "Variable"],
        ["Sub-Total Variable",         rs(cma.get("variable_total", 0)),""],
        ["TOTAL MONTHLY EXPENSES",     rs(cma.get("total_monthly_exp", 0)),""],
    ]
    exp_t = Table(exp_rows, colWidths=[90*mm,50*mm,30*mm])
    exp_t.setStyle(BTS())
    exp_t.setStyle(TOT(3)); exp_t.setStyle(TOT(12)); exp_t.setStyle(TOT(13))
    story.append(exp_t)
    NL(story, 5)

    H2("O2. Monthly Profit & Loss", story)
    if _is_trading_service:
        mpl_rows = [
            ["Particulars","Amount (Rs./Month)"],
            ["Sales Revenue",                     rs(cma.get("gross_monthly_revenue", cma.get("net_monthly_revenue", 0)))],
            ["Less: COGS",                        rs(cma.get("cogs_monthly", cma.get("raw_material_monthly", 0)))],
            ["Gross Profit",                      rs((cma.get("gross_monthly_revenue") or cma.get("net_monthly_revenue") or 0) - (cma.get("cogs_monthly") or cma.get("raw_material_monthly") or 0))],
            ["Less: Operating Expenses (Fixed+Var)", rs(cma.get("fixed_total", 0) + cma.get("variable_total", 0) - cma.get("cogs_monthly", cma.get("raw_material_monthly", 0)))],
            ["EBITDA",                            rs(cma["ebitda_monthly"])],
            ["EBITDA Margin",                     rp2(cma["ebitda_margin_pct"])],
            ["Less: Depreciation",               rs(cma["monthly_dep"])],
            ["EBIT",                             rs(round(cma["ebitda_monthly"]-cma["monthly_dep"],2))],
            ["Less: Interest",                   rs(cma["monthly_int_y1"])],
            ["Profit Before Tax (PBT)",          rs(cma["pbt_monthly"])],
            ["Less: Income Tax",                 rs(cma["tax_monthly"])],
            ["Profit After Tax (PAT)",           rs(cma["pat_monthly"])],
            ["Less: Term Loan Principal",        rs(cma.get("current_principal_monthly", 0))],
            ["Net Cash Surplus",                 rs(cma["surplus_monthly"])],
        ]
        mpl_t = Table(mpl_rows, colWidths=[110*mm,60*mm])
        mpl_t.setStyle(BTS())
        for idx in [3,5,12,14]: mpl_t.setStyle(TOT(idx))
    else:
        mpl_rows = [
            ["Particulars","Amount (Rs./Month)"],
            ["Gross Monthly Sales Revenue",       rs(cma["gross_monthly_revenue"])],
            ["Net Monthly Revenue (after margin)", rs(cma["net_monthly_revenue"])],
            ["Less: Fixed Expenses",              rs(cma["fixed_total"])],
            ["Less: Variable Expenses",           rs(cma["variable_total"])],
            ["EBITDA",                            rs(cma["ebitda_monthly"])],
            ["EBITDA Margin",                     rp2(cma["ebitda_margin_pct"])],
            ["Less: Depreciation",               rs(cma["monthly_dep"])],
            ["EBIT",                             rs(round(cma["ebitda_monthly"]-cma["monthly_dep"],2))],
            ["Less: Interest",                   rs(cma["monthly_int_y1"])],
            ["Profit Before Tax (PBT)",          rs(cma["pbt_monthly"])],
            ["Less: Income Tax",                 rs(cma["tax_monthly"])],
            ["Profit After Tax (PAT)",           rs(cma["pat_monthly"])],
            ["Less: Term Loan Principal",        rs(cma.get("current_principal_monthly", 0))],
            ["Net Cash Surplus",                 rs(cma["surplus_monthly"])],
        ]
        mpl_t = Table(mpl_rows, colWidths=[110*mm,60*mm])
        mpl_t.setStyle(BTS())
        for idx in [5,12,14]: mpl_t.setStyle(TOT(idx))
    story.append(mpl_t)
    NL(story, 3)
    # Item 7: Monthly × 12 vs Year 1 annual reconciliation note
    _m_rev_12  = float(cma.get("net_monthly_revenue", 0) or 0) * 12
    _y1_rev_cop = float(cop[0].get("revenue", 0) if cop else 0)
    _y1_gap_pct = abs(_m_rev_12 - _y1_rev_cop) / max(_y1_rev_cop, 1) * 100 if _y1_rev_cop > 0 else 0
    if _y1_gap_pct > 1.0:
        story.append(Paragraph(
            f"<b>Monthly × 12 vs Annual Note:</b> "
            f"Monthly Revenue × 12 = Rs.{_m_rev_12:,.0f} | "
            f"Year 1 Projected Annual Revenue = Rs.{_y1_rev_cop:,.0f} "
            f"({round(_y1_gap_pct, 1)}% variance). "
            "Annual projections apply capacity ramp-up; monthly figures reflect steady-state operations. "
            "All DSCR and ratio calculations use Year 1 income-statement figures.",
            ST["small"]))
    else:
        story.append(Paragraph(
            f"<b>Monthly × 12 reconciles with Year 1 Projection:</b> "
            f"Rs.{_m_rev_12:,.0f} ≈ Rs.{_y1_rev_cop:,.0f} — consistent ✓",
            ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION P — LOAN REPAYMENT SCHEDULE (CMA)
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION P — TERM LOAN & WORKING CAPITAL FACILITY", story)
    H2("P1. Loan Specifications", story)
    loan_spec = Table([
        ["Parameter","Value","Parameter","Value"],
        ["Scheme",           scheme_short(inp.get("scheme","MSME")), "Loan Type", inp.get("loan_type","Term Loan")],
        ["Term Loan",        rs(cma.get("term_loan", inp.get("term_loan_amount",0))), "WC Loan",   rs(cma.get("working_capital_loan", (wc[0].get("bank_loan", 0) if wc else 0)))],
        ["Total Bank Finance", rs(cma["total_loan"]),      "TL Interest Rate",   rp(tl.get("interest_rate", inp.get("term_loan_interest",0)))],
        ["Tenure",           f"{inp.get('loan_tenure_years',5)} years", "Monthly TL Service (Y1 avg)", rs(cma["emi"])],
        ["Processing Fee",   rs(cma["processing_fee"]),   "Total Interest",  rs(cma["total_interest_outgo"])],
        ["Collateral",       inp.get("collateral","Hypothecation of assets"), "Guarantor", inp.get("guarantor","As per sanction")],
    ], colWidths=[40*mm,45*mm,40*mm,45*mm])
    loan_spec.setStyle(BTS())
    story.append(loan_spec)
    NL(story, 5)

    H2("P2. Year-wise Repayment Summary", story)
    yr_rows = [["Year","Opening Balance (Rs.)","TL Service (Rs.)","Interest (Rs.)","Principal (Rs.)","Closing Balance (Rs.)"]]
    for y in cma["yr_schedule"]:
        yr_rows.append([str(y["year"]),r(y["opening_balance"]),r(y["emi_paid"]),
                         r(y["interest_paid"]),r(y["principal_paid"]),r(y["closing_balance"])])
    yr_t = Table(yr_rows, colWidths=[14*mm,33*mm,28*mm,28*mm,28*mm,33*mm])
    yr_t.setStyle(BTS())
    story.append(yr_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION Q — REPAYMENT CAPABILITY & RATIOS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION Q — REPAYMENT CAPABILITY & KEY RATIOS", story)
    H2("Q1. Repayment Coverage & Payback", story)
    rep_t = Table([
        ["Metric","Value","Benchmark","Status"],
        ["Year 1 DSCR",            str(cma["dscr_y1"]),       ">= 1.25", cma["dscr_label"]],
        ["Average DSCR (5-Year)",  str(cma.get("avg_dscr_5yr", cma.get("avg_dscr", 0))),  ">= 1.25", dscr_label(cma.get("avg_dscr_5yr", cma.get("avg_dscr", 0)))],
        ["Payback Period (months)", _fmt_payback(cma), "< 24 mo", ("Not Achievable" if (cma.get("payback_not_achievable") or str(cma.get("breakeven_months","")).upper()=="N/A" or float(cma.get("breakeven_months",0) if isinstance(cma.get("breakeven_months"),(int,float)) else 0)==0) else ("Good" if float(cma.get("breakeven_months",0))<24 else "Monitor"))],
        ["Margin of Safety",       rp2(cma["margin_of_safety"]),"> 0",    "Positive" if cma["margin_of_safety"]>0 else "Negative"],
    ], colWidths=[70*mm,35*mm,35*mm,30*mm])
    rep_t.setStyle(BTS())
    story.append(rep_t)
    NL(story, 5)

    H2("Q2. Return & Efficiency Metrics", story)
    # Display label only; approved backend ROI denominator is unchanged.
    ret_t = Table([
        ["Metric","Value","Metric","Value"],
        ["ROI (EBITDA)",                  rp2(cma["roi_ebitda_pct"]),  "ROI (PAT)",                 rp2(cma["roi_pat_pct"])],
        ["EBITDA Margin (EBITDA / Sales)",rp2(cma["ebitda_margin_pct"]),"Net Profit Margin (PAT / Sales)", rp2(cma["net_margin_pct"])],
        ["Interest Coverage (EBITDA / Int)",r2(cma.get("interest_coverage_y1", 0)),"Asset Turnover (Sales / Investment)", r2(cma.get("asset_turnover_y1", 0))],
        ["Total TL Interest Outgo",   rs(cma["total_interest_outgo"]),"Net Annual Surplus (PAT - EMI)", rs(R(cma["annual_pat"]-cma["annual_emi"],2))],
    ], colWidths=[55*mm,30*mm,55*mm,30*mm])
    ret_t.setStyle(BTS())
    story.append(ret_t)
    NL(story, 2)
    story.append(Paragraph(
        "ROI (EBITDA) = EBITDA / Initial Project Investment x 100  |  ROI (PAT) = PAT / Initial Project Investment x 100  |  Margins = Profit / Sales Revenue x 100",
        ST["small"]))
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION Q2 — PROMOTER NET WORTH
    # ════════════════════════════════════════════════════════════════
    pnw = cma.get("promoter_net_worth", {})
    if pnw and any(float(v or 0) > 0 for v in pnw.values()):
        H2("Q3. Promoter Net Worth Statement", story)
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
        NL(story, 5)

    # ════════════════════════════════════════════════════════════════
    # SECTION R — 5-YEAR PROJECTIONS (CMA)
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION R — 5-YEAR PROFITABILITY PROJECTIONS (CMA)", story)
    proj_rows = [["Year","Sales (Rs.)","Expenses (Rs.)","EBITDA (Rs.)","Dep (Rs.)","Interest (Rs.)","PAT (Rs.)","TL Service (Rs.)","Net Surplus (Rs.)","EMI Coverage"]]
    for p in cma["projections_5yr"]:
        proj_rows.append([str(p["year"]),r(p["sales"]),r(p["expenses"]),r(p["ebitda"]),
                           r(p["depreciation"]),r(p["interest"]),r(p["profit_after_tax"]),
                           r(p["emi_paid"]),r(p["net_surplus"]),str(p["dscr"])])
    proj_t = Table(proj_rows, colWidths=[10*mm,20*mm,20*mm,18*mm,16*mm,16*mm,18*mm,18*mm,20*mm,14*mm])
    proj_t.setStyle(BTS())
    story.append(proj_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION S — RISK ANALYSIS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION S — RISK ANALYSIS", story)
    H2("S1. Risk Matrix", story)
    risk_rows = [["Category","Risk Description","Probability","Impact","Net Risk"]]
    _risk_matrix_display = _display_risk_matrix(_industry)
    for i,rm in enumerate(_risk_matrix_display):
        risk_rows.append([rm["category"],rm["description"],rm["probability"],rm["impact"],rm["net_risk"]])
    risk_t = Table(risk_rows, colWidths=[28*mm,60*mm,25*mm,22*mm,25*mm])
    risk_t.setStyle(BTS())
    for i,rm in enumerate(_risk_matrix_display):
        risk_t.setStyle(RISK_COLOR(i+1, rm["net_risk"]))
    story.append(risk_t)
    NL(story, 5)

    H2("S2. Sensitivity Analysis", story)
    story.append(Paragraph(
        "<b>Base Case</b> = master financial engine Year 1 monthly values. "
        "Variable costs scale proportionally with revenue; fixed costs remain constant (CA standard). "
        "DSCR uses CA formula: (PAT + Dep + Interest) / (Principal + Interest).",
        ST["small"]))
    NL(story, 2)
    sens_rows = [["Scenario","Chg %","Revenue (Rs.)","COGS (Rs.)","EBITDA (Rs.)","PAT (Rs.)","DSCR","Status"]]
    for s in cma["sensitivity"]:
        sens_rows.append([
            s["scenario"], f"{s.get('change_pct',0)}%",
            r(s["monthly_revenue"]),
            r(s.get("monthly_cogs", 0)),
            r(s.get("monthly_ebitda", s.get("monthly_revenue",0) - s.get("monthly_variable",0) - s.get("monthly_fixed",0))),
            r(s["monthly_profit"]),
            str(s["dscr"]),
            s["status"],
        ])
    sens_t = Table(sens_rows, colWidths=[24*mm,12*mm,24*mm,22*mm,24*mm,22*mm,14*mm,18*mm])
    sens_t.setStyle(BTS())
    story.append(sens_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION T — CREDIT SCORECARD & RECOMMENDATION
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION T — CREDIT SCORECARD & RECOMMENDATION", story)
    H2("T1. Objective Credit Indicators", story)
    _score_tl_de = round(pc["term_loan"] / max(display_promoter_fixed_equity, 1), 2) if display_promoter_fixed_equity else 0
    _score_total_leverage = round((pc["term_loan"] + pc.get("wc_loan", 0)) / max(display_promoter_contribution, 1), 2) if display_promoter_contribution else 0
    sc_rows = _objective_scorecard_rows(cma, _score_tl_de, _score_total_leverage)
    sc_t = Table(sc_rows, colWidths=[62*mm,30*mm,35*mm,43*mm])
    sc_t.setStyle(BTS()); sc_t.setStyle(TOT(len(sc_rows)-1))
    story.append(sc_t)
    NL(story, 2)
    story.append(Paragraph(
        "Subjective factors such as market opportunity, competitive position, and business model are excluded from this displayed scorecard. "
        "Internal viability grade may still use the approved backend scoring engine.",
        ST["small"]))
    NL(story, 5)

    H2("T2. Internal Viability Assessment", story)
    fa_t = Table([
        ["Internal Viability Grade","Feasibility Assessment","Risk Level","Weighted Score"],
        [cma["credit_rating"], _rec_display, cma["risk_level"], str(cma["total_score"])],
    ], colWidths=[42.5*mm]*4)
    fa_t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),DG),("TEXTCOLOR",(0,0),(-1,0),W),
        ("FONTNAME",(0,0),(-1,1),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),10),
        ("ALIGN",(0,0),(-1,-1),"CENTER"),("BACKGROUND",(0,1),(-1,1),LG),
        ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
        ("GRID",(0,0),(-1,-1),0.5,W),
    ]))
    story.append(fa_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # SECTION U — KEY FINANCIAL RATIOS
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION U — KEY FINANCIAL RATIOS SUMMARY", story)
    # FIX #10: separate TL-only D:E from total leverage D:E for banker clarity
    _u_tl_de = round(pc["term_loan"] / max(display_promoter_fixed_equity, 1), 2) if display_promoter_fixed_equity else 0
    _u_tot_de = round((pc["term_loan"] + pc.get("wc_loan", 0)) / max(display_promoter_contribution, 1), 2) if display_promoter_contribution else 0
    ratios = Table([
        ["Ratio","Value","Benchmark","Assessment"],
        ["Current Ratio",              r2(cma["current_ratio"]),      "> 1.33", "Good" if cma["current_ratio"]>1.33 else "Monitor"],
        ["EBITDA Margin %",            rp2(cma["ebitda_margin_pct"]), "> 20%",  "Good" if cma["ebitda_margin_pct"]>20 else "Monitor"],
        ["Net Profit Margin %",        rp2(cma["net_margin_pct"]),    "> 10%",  "Good" if cma["net_margin_pct"]>10 else "Monitor"],
        ["DSCR (Year 1)",              str(cma["dscr_y1"]),           f">{float(cma.get('dscr_benchmark',1.25) or 1.25)}", cma["dscr_label"]],
        ["Avg DSCR (5-Year)",          str(cma.get("avg_dscr", 0)),   f">{float(cma.get('dscr_benchmark',1.25) or 1.25)}", dscr_label(cma.get("avg_dscr", 0))],
        ["ROI (EBITDA)",               rp2(cma["roi_ebitda_pct"]),    "> 15%",  "Good" if cma["roi_ebitda_pct"]>15 else "Monitor"],
        ["D:E (TL ÷ Promoter Fixed Equity)",          str(_u_tl_de) + " : 1",  "< 2", "Good" if _u_tl_de < 2 else "High"],
        ["Total Leverage ((TL+WC) ÷ Total Promoter)", str(_u_tot_de) + " : 1", "< 3", "Good" if _u_tot_de < 3 else "High"],
        ["Interest Coverage",          r2(cma.get("interest_coverage_y1", 0)), "> 2", "Good" if cma.get("interest_coverage_y1", 0)>2 else "Monitor"],
        ["Asset Turnover (Sales/Investment)", r2(cma.get("asset_turnover_y1", 0)), "> 1", "Good" if cma.get("asset_turnover_y1", 0)>1 else "Monitor"],
        ["Promoter Contribution",      rp2(cma["promoter_pct"]),       "> 10%", "Good" if cma["promoter_pct"]>10 else "Low"],
    ], colWidths=[65*mm,28*mm,30*mm,47*mm])
    ratios.setStyle(BTS())
    story.append(ratios)
    NL(story, 3)
    story.append(Paragraph(
        "<b>D:E Formula Note:</b> Term Loan D:E = TL / promoter fixed equity. "
        "Total leverage = total debt / total promoter contribution.",
        ST["small"]))
    NL(story, 2)
    # Item #7: D:E Risk Warning — flag aggressive leverage without blocking
    _de_tl_warn   = _u_tl_de > 3
    _de_tot_warn  = _u_tot_de > 4
    if _de_tl_warn or _de_tot_warn:
        _de_warn_parts = []
        if _de_tl_warn:
            _de_warn_parts.append(f"Term Loan D:E of {_u_tl_de}:1 exceeds 3:1")
        if _de_tot_warn:
            _de_warn_parts.append(f"Total Debt D:E of {_u_tot_de}:1 exceeds 4:1")
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

    # Item #11: Profitability Trend Warning — flag future-year deterioration
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
    # SECTION V — PROFITABILITY INDEX (DPR Sheet 15)
    # ════════════════════════════════════════════════════════════════
    SEC("SECTION V — PROFITABILITY INDEX (Based on Year 3)", story)
    ref_t = Table([
        ["Reference Sales (Rs.)","Total Investment (Rs.)","Capital Employed (Rs.)"],
        [r(prof["sales"]), r(prof["total_investment"]), r(prof["capital_employed"])],
    ], colWidths=[56.7*mm]*3)
    ref_t.setStyle(BTS())
    story.append(ref_t)
    NL(story, 5)
    pi_t = Table([
        ["Metric","Amount (Rs.)","% of Sales","% of Investment","% of Capital"],
        ["PBIDT", rs(prof["pbidt"]), rp2(prof["pbidt_pct_sales"]),
         pof(prof["pbidt"],prof["total_investment"]), pof(prof["pbidt"],prof["capital_employed"])],
        ["PAT (Net Profit)", rs(prof["pat"]), rp2(prof["pat_pct_sales"]),
         pof(prof["pat"],prof["total_investment"]), pof(prof["pat"],prof["capital_employed"])],
    ], colWidths=[42*mm,32*mm,26*mm,38*mm,32*mm])
    pi_t.setStyle(BTS())
    story.append(pi_t)
    PB(story)

    # ════════════════════════════════════════════════════════════════
    # APPENDIX — FORMULA DEFINITIONS & METHODOLOGY
    # ════════════════════════════════════════════════════════════════
    PB(story)
    SEC("APPENDIX — FORMULA DEFINITIONS & METHODOLOGY", story)
    story.append(Paragraph(
        "The following formulas and conventions are used throughout this report. "
        "All calculations follow CA / RBI / SIDBI standard norms for MSME credit appraisal.",
        ST["normal"]))
    NL(story, 3)
    _fdef_rows = [
        ["Ratio / Formula", "Definition & Method", "Benchmark"],
        ["DSCR\n(Debt Service\nCoverage Ratio)",
         "= (PAT + Depreciation + Interest) / (Principal Repayment + Interest)\n"
         "Measures ability to repay debt from operating cash flow.\n"
         "CA Rule: Cash Accruals (PAT+Dep) / Total Debt Service (P+I)",
         ">= 1.25x\n(scheme-specific)"],
        ["ROI — EBITDA\n(Return on Investment)",
         "= Annual EBITDA / Initial Project Investment × 100\n"
         "Denominator = Fixed Assets + Promoter WC Margin (CA standard investment base)\n"
         "Measures operational return before financing and tax costs",
         "> 15%"],
        ["ROI — PAT\n(Net Return)",
         "= Annual PAT / Initial Project Investment × 100\n"
         "PAT = Profit After Tax (post-interest, post-depreciation, post-tax)\n"
         "Measures true net return to the project",
         "> 10%"],
        ["Current Ratio",
         "= Total Current Assets / Total Current Liabilities\n"
         "CA / Tandon Committee: WC Assets (stock + debtors) / WC Bank Borrowings (CC/OD)\n"
         "Minimum 1.33x required for WC limits per Tandon Committee norms",
         "> 1.33x"],
        ["D:E Ratio\n(Term Loan D:E)",
         "= Term Loan Amount / Promoter Fixed Equity\n"
         "Promoter Fixed Equity = Fixed Capital Cost × (1 − TL%)\n"
         "Banker's primary leverage metric for term loan sanction",
         "< 2 : 1"],
        ["Total Leverage\n(D:E — All Debt)",
         "= (Term Loan + WC Bank Finance) / Total Promoter Contribution\n"
         "Total Promoter = Fixed Equity + WC Margin\n"
         "Measures total bank dependence against promoter stake",
         "< 3 : 1"],
        ["EBITDA Margin",
         "= EBITDA / Sales Revenue × 100\n"
         "EBITDA = Earnings Before Interest, Tax, Depreciation & Amortisation\n"
         "= Revenue − COGS − Operating Expenses (salary, rent, utilities, marketing)",
         "> 20%"],
        ["Net Profit Margin",
         "= PAT / Sales Revenue × 100\n"
         "PAT = PBT − Income Tax; PBT = EBIT − Interest; EBIT = EBITDA − Depreciation\n"
         "Bottom-line profitability after all charges",
         "> 10%"],
        ["Break-Even Point",
         "= Fixed Costs / (1 − Variable Cost Ratio)\n"
         "Break-Even Revenue = the monthly sales at which PAT = 0 and all costs are covered\n"
         "Payback months = Initial Project Investment / (Monthly Cash Accruals)",
         "< Monthly\nRevenue"],
        ["Cash Accruals",
         "= PAT + Annual Depreciation\n"
         "Represents operating cash flow available for debt service and reinvestment\n"
         "CA Rule: Cash Accruals NOT PAT alone drives DSCR numerator",
         "> Annual TL\nDebt Service"],
        ["Gross Profit Margin",
         "= (Revenue − COGS) / Revenue × 100\n"
         "COGS: Raw materials (manufacturing) | Purchase cost (trading) | "
         "Direct delivery cost (service)\n"
         "Industry benchmarks: Manufacturing ~45%, Trading ~30%, Service ~70%",
         "Industry-specific"],
        ["Interest Coverage",
         "= EBITDA / Total Interest (TL + WC)\n"
         "Measures how many times operating earnings cover interest obligations\n"
         "Low coverage (<1.5x) signals income stress",
         "> 2x"],
        ["Asset Turnover",
         "= Annual Revenue / Initial Project Investment\n"
         "Efficiency of capital deployment; higher = better asset utilisation\n"
         "Denominator = same investment base used in ROI calculation",
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
        "<b>P&L Formula Chain (CA Standard):</b> "
        "Revenue − COGS = Gross Profit → GP − Operating Expenses = EBITDA → "
        "EBITDA − Depreciation = EBIT → EBIT − Interest (TL + WC) = PBT → "
        "PBT − Tax = PAT → PAT + Depreciation − TL Principal = Net Cash Surplus",
        ST["small"]))
    NL(story, 3)
    story.append(Paragraph(
        "<b>Initial Investment Structure (CA Standard):</b> "
        "Fixed Project Cost = Land + Building + Machinery + Other Fixed Assets. "
        "Term Loan applied to Fixed Capital only (RBI/SIDBI norm). "
        "Working Capital is a separate revolving facility (Tandon Committee norms). "
        "Initial Project Investment = Fixed Cost + Promoter WC Margin (not TL-funded WC).",
        ST["small"]))
    NL(story, 3)
    story.append(Paragraph(
        "<b>Sensitivity Analysis:</b> Variable costs scale proportionally with revenue. "
        "Fixed costs (salary, rent) remain constant. Six scenarios: "
        "Best (+20%) / Optimistic (+10%) / Base (0%) / Conservative (−10%) / "
        "Pessimistic (−20%) / Worst (−30%).",
        ST["small"]))

    # ════════════════════════════════════════════════════════════════
    # LAST PAGE — DECLARATION & DISCLAIMER
    # ════════════════════════════════════════════════════════════════
    PB(story)
    SEC("DECLARATION & DISCLAIMER", story)
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
        "This report is valid for 90 days from the date of preparation.",
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

    # ════════════════════════════════════════════════════════════════
    # SECTION W — FORM IV (COMPARATIVE STATEMENT)
    # ════════════════════════════════════════════════════════════════
    PB(story)
    SEC("SECTION W — FORM IV: COMPARATIVE CURRENT ASSETS & LIABILITIES", story)
    fiv = dpr.get("form_iv", [])
    if fiv:
        fiv_rows = [
            ["Particulars", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
            ["A. CURRENT ASSETS", "", "", "", "", ""],
            ["1. Raw Material Stock"] + [r(f["rm_stock"]) for f in fiv],
            ["2. Work in Progress"]   + [r(f["wip"]) for f in fiv],
            ["3. Finished Goods"]     + [r(f["fg_stock"]) for f in fiv],
            ["4. Receivables / Debtors"] + [r(f["debtors"]) for f in fiv],
            ["5. Cash & Bank Balance"] + [r(f["cash_bank"]) for f in fiv],
            ["Total Current Assets (A)"] + [r(f["total_ca"]) for f in fiv],
            ["B. CURRENT LIABILITIES", "", "", "", "", ""],
            ["1. Sundry Creditors"]    + [r(f["creditors"]) for f in fiv],
            ["2. Bank Borrowings (WC)"] + [r(f["wc_bank"]) for f in fiv],
            ["3. Current Portion of TL"] + [r(f["cp_tl"]) for f in fiv],
            ["Total Current Liab (B)"]  + [r(f["total_cl"]) for f in fiv],
            ["Net Working Capital (A-B)"] + [r(f["nwc"]) for f in fiv],
            ["Current Ratio"]           + [r2(f["current_ratio"]) for f in fiv],
        ]
        fiv_t = Table(fiv_rows, colWidths=[58*mm]+[22.4*mm]*5)
        fiv_t.setStyle(BTS())
        fiv_t.setStyle(TOT(7)); fiv_t.setStyle(TOT(12)); fiv_t.setStyle(TOT(13))
        story.append(fiv_t)
        NL(story, 5)
        story.append(Paragraph("Form IV is mandatory for Indian Bank CMA reports to assess the working capital cycle.", ST["small"]))

    # FIX #9: Internal validator runs but is NEVER included in public PDF.
    # Results are logged server-side only so the applicant never sees audit messages.
    import logging as _logging
    _val_logger = _logging.getLogger("pdf_builder.validator")
    _val_warnings = validate_cma_dpr(inp, cma, dpr)
    for _w in _val_warnings:
        _val_logger.warning(_w)

    doc.build(story)
