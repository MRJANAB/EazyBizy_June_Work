from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
from typing import Optional, Any, List
import io

# ── Professional Banking Palette ──────────────────────────────────────────────
PRIMARY   = colors.HexColor("#1e293b")
SECONDARY = colors.HexColor("#0f172a")
ACCENT    = colors.HexColor("#0d9488")
TEXT_GRAY = colors.HexColor("#64748b")
BG_LIGHT  = colors.HexColor("#f8fafc")
WHITE     = colors.white
BLACK     = colors.black


def get_styles():
    styles = getSampleStyleSheet()
    def _add(name, **kw):
        try:
            styles.add(ParagraphStyle(name=name, **kw))
        except KeyError:
            pass  # already registered

    _add('MainHeader',      fontSize=26, leading=32, alignment=TA_CENTER,
         fontName='Helvetica-Bold', textColor=WHITE, spaceAfter=8)
    _add('SubHeader',       fontSize=14, leading=18, alignment=TA_CENTER,
         fontName='Helvetica', textColor=colors.HexColor("#94a3b8"), spaceAfter=16)
    _add('SectionHeader',   fontSize=11, leading=15, fontName='Helvetica-Bold',
         textColor=WHITE, backColor=PRIMARY, leftIndent=0,
         borderPadding=8, spaceBefore=12, spaceAfter=8)
    _add('SubSectionHeader',fontSize=10, leading=13, fontName='Helvetica-Bold',
         textColor=ACCENT, spaceBefore=8, spaceAfter=4)
    _add('NormalText',      fontSize=9,  leading=12, fontName='Helvetica',    textColor=SECONDARY)
    _add('LabelText',       fontSize=9,  leading=12, fontName='Helvetica-Bold', textColor=PRIMARY)
    _add('MetricValue',     fontSize=16, leading=20, fontName='Helvetica-Bold',
         textColor=ACCENT, alignment=TA_CENTER)
    _add('MetricLabel',     fontSize=8,  leading=10, fontName='Helvetica',
         textColor=TEXT_GRAY, alignment=TA_CENTER)
    _add('TableText',       fontSize=8,  leading=10, fontName='Helvetica',
         textColor=SECONDARY, alignment=TA_RIGHT)
    _add('TableTextL',      fontSize=8,  leading=10, fontName='Helvetica',
         textColor=SECONDARY, alignment=TA_LEFT)
    _add('TableHeader',     fontSize=8,  leading=10, fontName='Helvetica-Bold',
         textColor=WHITE, alignment=TA_CENTER)
    _add('SmallGray',       fontSize=7,  leading=9,  fontName='Helvetica',
         textColor=TEXT_GRAY, alignment=TA_CENTER)
    return styles


def rs(val):
    """Format number as Indian Rs."""
    try:
        v = float(val)
        if v >= 10_000_000:
            return f"Rs. {v/10_000_000:.2f} Cr"
        if v >= 100_000:
            return f"Rs. {v/100_000:.2f} L"
        return f"Rs. {v:,.0f}"
    except Exception:
        return str(val)


def pct(val):
    try:
        return f"{float(val):.1f}%"
    except Exception:
        return "—"


def _yr_header(styles):
    return [
        Paragraph("<b>Particulars</b>",  styles['TableHeader']),
        Paragraph("<b>Year 1</b>",       styles['TableHeader']),
        Paragraph("<b>Year 2</b>",       styles['TableHeader']),
        Paragraph("<b>Year 3</b>",       styles['TableHeader']),
        Paragraph("<b>Year 4</b>",       styles['TableHeader']),
        Paragraph("<b>Year 5</b>",       styles['TableHeader']),
    ]


def _table_style_base():
    return TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  PRIMARY),
        ('TEXTCOLOR',     (0, 0), (-1, 0),  WHITE),
        ('FONTNAME',      (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('GRID',          (0, 0), (-1, -1), 0.1, colors.grey),
        ('ALIGN',         (1, 0), (-1, -1), 'RIGHT'),
        ('FONTSIZE',      (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [WHITE, BG_LIGHT]),
    ])


def create_cma_pdf(data: dict, output_path: Optional[str] = None) -> Any:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        output_path or buffer,
        pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=18*mm,  bottomMargin=18*mm,
    )
    story = []
    S = get_styles()

    # ── Safely pull sub-dicts ─────────────────────────────────────────────────
    proj      = data.get('projections', {})
    os_data   = proj.get('operating_statement', [])
    bs_data   = proj.get('balance_sheet', [])
    rat_data  = proj.get('ratios', [])
    dscr_d    = proj.get('dscr', {})
    wc_mpbf   = proj.get('working_capital', {}).get('mpbf', 0)
    dscr_avg  = dscr_d.get('average', 0)
    cf_data    = proj.get('cash_flow', [])
    mpbf_data  = proj.get('mpbf_by_year', [])
    hist_data  = proj.get('historical_operating_statement', [])
    continuity = proj.get('projection_continuity', {})

    # Year 1 / Year 3 safe access
    y1 = os_data[0] if os_data else {}
    y3_pat = os_data[2]['pat'] if len(os_data) >= 3 else (os_data[-1]['pat'] if os_data else 0)

    # ── 1. COVER PAGE ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 50*mm))
    cover = [
        [Paragraph("CREDIT MONITORING ARRANGEMENT", S['MainHeader'])],
        [Paragraph("(CMA) FINANCIAL PACK",           S['MainHeader'])],
        [Spacer(1, 8*mm)],
        [Paragraph("PROVISIONAL &amp; PROJECTED FINANCIAL STATEMENTS", S['SubHeader'])],
        [Spacer(1, 16*mm)],
        [Paragraph(f"<b>ENTITY:</b> {data.get('business_name', 'N/A')}", S['NormalText'])],
        [Paragraph(f"<b>PROMOTER:</b> {data.get('promoter_name', 'N/A')}", S['NormalText'])],
        [Spacer(1, 8*mm)],
        [Paragraph(f"<b>APPLICATION ID:</b> {data.get('application_id', 'N/A')}", S['NormalText'])],
        [Paragraph(f"<b>PREPARED ON:</b> {datetime.now().strftime('%d %B %Y')}", S['NormalText'])],
        [Spacer(1, 4*mm)],
        [Paragraph("<b>PURPOSE:</b> BANK SUBMISSION &amp; CREDIT APPRAISAL", S['NormalText'])],
    ]
    ct = Table(cover, colWidths=[170*mm])
    ct.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 3),  SECONDARY),
        ('TOPPADDING',    (0, 0), (-1, -1), 16),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(ct)
    story.append(Spacer(1, 40*mm))
    story.append(Paragraph("EazyBizy Financial Analytics Engine v4.1", S['MetricLabel']))
    story.append(PageBreak())

    # ── 2. EXECUTIVE SUMMARY ──────────────────────────────────────────────────
    story.append(Paragraph("EXECUTIVE FINANCIAL SUMMARY", S['SectionHeader']))
    story.append(Spacer(1, 4*mm))

    summary_data = [
        [
            Paragraph(rs(y1.get('revenue', 0)),  S['MetricValue']),
            Paragraph(f"{dscr_avg}x",             S['MetricValue']),
            Paragraph(rs(wc_mpbf),                S['MetricValue']),
        ],
        [
            Paragraph("YEAR 1 REVENUE",           S['MetricLabel']),
            Paragraph("AVERAGE DSCR",             S['MetricLabel']),
            Paragraph("MPBF WC LIMIT",            S['MetricLabel']),
        ],
    ]
    st = Table(summary_data, colWidths=[56*mm]*3)
    st.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0),  0),
        ('TOPPADDING',    (0, 1), (-1, 1),  0),
    ]))
    story.append(st)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Analytical Observations", S['SubSectionHeader']))
    story.append(Paragraph(
        f"Based on the projections, the unit shows an Average DSCR of {dscr_avg}x, indicating "
        f"adequate debt-servicing capacity. Maximum Permissible Bank Finance (MPBF Method II) = "
        f"{rs(wc_mpbf)}. Projected Year 3 PAT = {rs(y3_pat)}.",
        S['NormalText']
    ))
    story.append(Spacer(1, 8*mm))

    # ── 2b. HISTORICAL (AUDITED) OPERATING STATEMENT — existing businesses only ──
    if hist_data:
        story.append(Paragraph("HISTORICAL (AUDITED) OPERATING STATEMENT", S['SectionHeader']))
        story.append(Spacer(1, 4*mm))

        hist_rows = [
            ("Revenue from Operations",   "revenue"),
            ("Less: Cost of Goods Sold",  "cogs"),
            ("GROSS PROFIT",              "gross_profit"),
            ("EBITDA",                    "ebitda"),
            ("Depreciation",              "depreciation"),
            ("Interest",                  "interest"),
            ("NET PROFIT AFTER TAX",      "pat"),
        ]
        hist_header = [Paragraph("<b>Particulars</b>", S['TableHeader'])] + [
            Paragraph(f"<b>{h.get('year', '')}</b>", S['TableHeader']) for h in hist_data
        ]
        hist_table: List[List[Any]] = [hist_header]
        for label, key in hist_rows:
            bold = label.isupper()
            row: List[Any] = [Paragraph(f"<b>{label}</b>" if bold else label, S['NormalText'])]
            for h in hist_data:
                fmt = rs(h.get(key, 0))
                row.append(Paragraph(f"<b>{fmt}</b>" if bold else fmt, S['TableText']))
            hist_table.append(row)

        col1 = 62*mm
        rest = (108*mm) / max(len(hist_data), 1)
        ht = Table(hist_table, colWidths=[col1] + [rest]*len(hist_data), repeatRows=1)
        ht.setStyle(_table_style_base())
        story.append(ht)
        story.append(Spacer(1, 4*mm))

        if continuity.get("applicable"):
            flag = "RED FLAG" if continuity.get("implausible") else "Reasonable"
            story.append(Paragraph(
                f"<b>Projection continuity ({flag}):</b> {continuity.get('note', '')}",
                S['NormalText']
            ))
        story.append(PageBreak())

    # ── 3. OPERATING STATEMENT ────────────────────────────────────────────────
    story.append(Paragraph("I. PROJECTED OPERATING STATEMENT", S['SectionHeader']))
    story.append(Spacer(1, 4*mm))

    # Rows: (display_label, dict_key, bold?)
    os_rows = [
        ("Revenue from Operations",   "revenue",      True),
        ("Less: Cost of Goods Sold",  "cogs",         False),
        ("GROSS PROFIT",              "gross_profit", True),
        ("  Less: Salary & Wages",    "salary",       False),
        ("  Less: Other Opex",        "other_opex",   False),
        ("EBITDA",                    "ebitda",       True),
        ("  Less: Depreciation",      "depreciation", False),
        ("  Less: Interest",          "interest",     False),
        ("Profit Before Tax (PBT)",   "pbt",          False),
        ("  Less: Income Tax",        "tax",          False),
        ("NET PROFIT AFTER TAX (PAT)","pat",          True),
        ("Cash Accruals (PAT + Dep)", "cash_accruals",False),
    ]

    os_table_data: List[List[Any]] = [_yr_header(S)]
    for label, key, bold in os_rows:
        cell_style = S['NormalText']
        row: List[Any] = [Paragraph(f"<b>{label}</b>" if bold else label, cell_style)]
        for yr in os_data:
            v = yr.get(key, 0)
            fmt = rs(v)
            row.append(Paragraph(f"<b>{fmt}</b>" if bold else fmt, S['TableText']))
        os_table_data.append(row)

    os_t = Table(os_table_data, colWidths=[62*mm] + [21.6*mm]*5, repeatRows=1)
    os_t.setStyle(_table_style_base())
    story.append(os_t)
    story.append(PageBreak())

    # ── 4. BALANCE SHEET ──────────────────────────────────────────────────────
    story.append(Paragraph("II. PROJECTED BALANCE SHEET", S['SectionHeader']))
    story.append(Spacer(1, 4*mm))

    # Assets: actual keys from balance_sheet.py
    asset_rows = [
        ("Net Fixed Assets",       lambda b: b['assets'].get('fixed_assets', 0)),
        ("  Inventory / Stock",    lambda b: b['assets']['current_assets'].get('stock', 0)),
        ("  Trade Receivables",    lambda b: b['assets']['current_assets'].get('debtors', 0)),
        ("  Cash & Bank",          lambda b: b['assets']['current_assets'].get('cash', 0)),
        ("  Other / Misc Assets",  lambda b: b['assets'].get('other_assets', 0)),
        ("TOTAL ASSETS",           lambda b: b['assets'].get('total', 0)),
    ]
    liab_rows = [
        ("Net Worth / Equity",     lambda b: b['liabilities'].get('net_worth', 0)),
        ("Term Loan (Bank)",        lambda b: b['liabilities'].get('term_loan', 0)),
        ("Working Capital Loan",    lambda b: b['liabilities'].get('wc_loan', 0)),
        ("Trade Payables",          lambda b: b['liabilities'].get('creditors', 0)),
        ("TOTAL LIABILITIES",       lambda b: b['liabilities'].get('total', 0)),
    ]

    bs_table_data: List[List[Any]] = [_yr_header(S)]
    bs_table_data.append([Paragraph("<b>── ASSETS ──</b>", S['SubSectionHeader'])] + [""]*5)
    for label, fn in asset_rows:
        bold = label.startswith("TOTAL")
        row: List[Any] = [Paragraph(f"<b>{label}</b>" if bold else label, S['NormalText'])]
        for yr_bs in bs_data:
            v = fn(yr_bs)
            row.append(Paragraph(f"<b>{rs(v)}</b>" if bold else rs(v), S['TableText']))
        bs_table_data.append(row)

    bs_table_data.append([Paragraph("<b>── LIABILITIES &amp; EQUITY ──</b>", S['SubSectionHeader'])] + [""]*5)
    for label, fn in liab_rows:
        bold = label.startswith("TOTAL")
        row = [Paragraph(f"<b>{label}</b>" if bold else label, S['NormalText'])]
        for yr_bs in bs_data:
            v = fn(yr_bs)
            row.append(Paragraph(f"<b>{rs(v)}</b>" if bold else rs(v), S['TableText']))
        bs_table_data.append(row)

    bt = Table(bs_table_data, colWidths=[62*mm] + [21.6*mm]*5, repeatRows=1)
    ts = _table_style_base()
    # Span section header rows
    asset_hdr_row = 1
    liab_hdr_row  = asset_hdr_row + 1 + len(asset_rows)
    ts.add('SPAN',       (0, asset_hdr_row), (-1, asset_hdr_row))
    ts.add('BACKGROUND', (0, asset_hdr_row), (-1, asset_hdr_row), BG_LIGHT)
    ts.add('SPAN',       (0, liab_hdr_row),  (-1, liab_hdr_row))
    ts.add('BACKGROUND', (0, liab_hdr_row),  (-1, liab_hdr_row), BG_LIGHT)
    bt.setStyle(ts)
    story.append(bt)
    story.append(PageBreak())

    # ── 5. RATIO ANALYSIS ─────────────────────────────────────────────────────
    story.append(Paragraph("III. RATIO ANALYSIS &amp; DSCR", S['SectionHeader']))
    story.append(Spacer(1, 4*mm))

    # Ratios are FLAT dicts from ratios.py — no nesting
    ratio_rows = [
        ("Gross Margin (%)",        lambda r: pct(r.get('gross_margin_pct', 0))),
        ("Net Margin (%)",          lambda r: pct(r.get('net_margin_pct', 0))),
        ("EBITDA Margin (%)",       lambda r: pct(r.get('ebitda_margin_pct', 0))),
        ("Current Ratio",           lambda r: f"{r.get('current_ratio', 0):.2f}"),
        ("Quick Ratio",             lambda r: f"{r.get('quick_ratio', 0):.2f}"),
        ("Debt-Equity Ratio",       lambda r: f"{r.get('debt_equity', 0):.2f}"),
        ("Interest Coverage",       lambda r: f"{r.get('interest_coverage', 0):.2f}x"),
        ("DSCR",                    lambda r: f"{r.get('dscr', 0):.2f}x"),
    ]

    ratio_table_data: List[List[Any]] = [_yr_header(S)]
    for label, fn in ratio_rows:
        bold = label == "DSCR"
        row: List[Any] = [Paragraph(f"<b>{label}</b>" if bold else label, S['NormalText'])]
        for yr_r in rat_data:
            v = fn(yr_r)
            row.append(Paragraph(f"<b>{v}</b>" if bold else v, S['TableText']))
        ratio_table_data.append(row)

    rt = Table(ratio_table_data, colWidths=[62*mm] + [21.6*mm]*5, repeatRows=1)
    rt.setStyle(_table_style_base())
    story.append(rt)
    story.append(Spacer(1, 10*mm))

    # ── 6. DSCR DETAIL TABLE ──────────────────────────────────────────────────
    story.append(Paragraph("Debt Service Coverage Analysis", S['SubSectionHeader']))

    dscr_table_data: List[List[Any]] = [
        [Paragraph("<b>Year</b>",   S['TableHeader']),
         Paragraph("<b>Cash Accruals (PAT+Dep)</b>", S['TableHeader']),
         Paragraph("<b>Interest</b>",                S['TableHeader']),
         Paragraph("<b>Principal</b>",               S['TableHeader']),
         Paragraph("<b>DSCR</b>",                    S['TableHeader'])],
    ]

    # DSCR detail straight from the amortisation schedule carried on each row:
    # term-loan interest and scheduled principal (not a straight-line average).
    for i, yr_op in enumerate(os_data):
        yr_r      = rat_data[i] if i < len(rat_data) else {}
        ca        = yr_op.get('cash_accruals', 0)
        intr      = yr_op.get('tl_interest', yr_op.get('interest', 0))
        principal = yr_op.get('tl_principal', 0)
        dscr_v    = yr_r.get('dscr', 0)
        dscr_table_data.append([
            f"Year {yr_op['year']}",
            rs(ca),
            rs(intr),
            rs(principal),
            f"<b>{dscr_v:.2f}x</b>",
        ])

    dt = Table(dscr_table_data, colWidths=[22*mm, 44*mm, 30*mm, 30*mm, 44*mm])
    dt.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  ACCENT),
        ('TEXTCOLOR',     (0, 0), (-1, 0),  WHITE),
        ('FONTNAME',      (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('GRID',          (0, 0), (-1, -1), 0.1, colors.grey),
        ('ALIGN',         (1, 0), (-1, -1), 'RIGHT'),
        ('FONTSIZE',      (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [WHITE, BG_LIGHT]),
    ]))
    story.append(dt)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(f"<b>Composite Average DSCR: {dscr_avg}x</b>", S['NormalText']))
    story.append(Paragraph(
        "<i>Note: DSCR ≥ 1.50x is comfortable for term loan appraisal. Minimum acceptable = 1.25x.</i>",
        S['SmallGray']
    ))
    story.append(Spacer(1, 16*mm))

    # ── 6b. CASH FLOW STATEMENT (reconciled to Balance Sheet) ─────────────────
    if cf_data:
        story.append(PageBreak())
        story.append(Paragraph("IV. CASH FLOW STATEMENT", S['SectionHeader']))
        story.append(Spacer(1, 4*mm))

        cf_rows = [
            ("Opening Cash & Bank",            "opening_cash",   False),
            ("Operating Cash Flow",            "operating_cash", True),
            ("  Working Capital Change",       "wc_change",      False),
            ("Investing Cash Flow",            "investing_cash", False),
            ("Financing Cash Flow",            "financing_cash", False),
            ("Net Cash Flow",                  "net_cash_flow",  True),
            ("Closing Cash (= Balance Sheet)", "closing_cash",   True),
        ]
        cf_table: List[List[Any]] = [_yr_header(S)]
        for label, key, bold in cf_rows:
            row: List[Any] = [Paragraph(f"<b>{label}</b>" if bold else label, S['NormalText'])]
            for yr in cf_data:
                fmt = rs(yr.get(key, 0))
                row.append(Paragraph(f"<b>{fmt}</b>" if bold else fmt, S['TableText']))
            cf_table.append(row)

        cft = Table(cf_table, colWidths=[62*mm] + [21.6*mm]*5, repeatRows=1)
        cft.setStyle(_table_style_base())
        story.append(cft)
        story.append(Spacer(1, 3*mm))
        all_recon = all(c.get("reconciles", False) for c in cf_data)
        story.append(Paragraph(
            "<i>Closing cash reconciles to the Balance Sheet cash line in every year"
            + ("." if all_recon else " — review flagged years.") + "</i>",
            S['SmallGray']
        ))

    # ── 6c. MAXIMUM PERMISSIBLE BANK FINANCE (per year) ───────────────────────
    if mpbf_data:
        story.append(Spacer(1, 10*mm))
        story.append(Paragraph("V. MAXIMUM PERMISSIBLE BANK FINANCE (MPBF)", S['SectionHeader']))
        story.append(Spacer(1, 4*mm))

        mpbf_rows = [
            ("Chargeable Current Assets",          "current_assets"),
            ("Less: Other Current Liab (Creditors)", "other_cl"),
            ("Working Capital Gap",                "wc_gap"),
            ("MPBF (Method II) - Permissible",     "mpbf"),
            ("WC Limit Sought",                    "wc_loan_sought"),
        ]
        mpbf_table: List[List[Any]] = [_yr_header(S)]
        for label, key in mpbf_rows:
            bold = key in ("mpbf", "wc_loan_sought")
            row: List[Any] = [Paragraph(f"<b>{label}</b>" if bold else label, S['NormalText'])]
            for yr in mpbf_data:
                fmt = rs(yr.get(key, 0))
                row.append(Paragraph(f"<b>{fmt}</b>" if bold else fmt, S['TableText']))
            mpbf_table.append(row)

        mt = Table(mpbf_table, colWidths=[62*mm] + [21.6*mm]*5, repeatRows=1)
        mt.setStyle(_table_style_base())
        story.append(mt)
        story.append(Spacer(1, 3*mm))
        y1m = mpbf_data[0]
        within = y1m.get("within_limit", True)
        verdict = ("within the permissible MPBF limit" if within
                   else f"ABOVE the permissible MPBF by {rs(y1m.get('excess_over_mpbf', 0))}")
        story.append(Paragraph(
            f"<i>Year 1: WC limit sought ({rs(y1m.get('wc_loan_sought', 0))}) is {verdict} "
            f"(Method II = {rs(y1m.get('mpbf', 0))}).</i>",
            S['SmallGray']
        ))

    # ── 7. DECLARATION ────────────────────────────────────────────────────────
    decl = [
        [
            Paragraph(
                "<b>CERTIFICATE OF ACCURACY</b><br/><br/>"
                "<font size='8'>This CMA report has been prepared based on information provided by the management. "
                "Calculations follow standard RBI/SIDBI/MSME banking norms (MPBF Method II) and Indian accounting standards. "
                "Forward-looking projections are estimates only.</font>",
                S['NormalText']
            ),
            ""
        ],
        [Spacer(1, 12*mm), Spacer(1, 12*mm)],
        [
            Paragraph("<b>FOR PROMOTER / APPLICANT</b><br/>(Authorized Signatory)", S['MetricLabel']),
            Paragraph("<b>FOR AUDITOR / CHARTERED ACCOUNTANT</b><br/>(Seal &amp; UDIN)", S['MetricLabel']),
        ],
    ]
    dec_t = Table(decl, colWidths=[85*mm, 85*mm])
    dec_t.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('ALIGN',         (0, 0), (0, 0),   'LEFT'),
        ('ALIGN',         (1, 2), (1, 2),   'RIGHT'),
        ('TOPPADDING',    (0, 2), (-1, 2),  16),
    ]))
    story.append(dec_t)

    doc.build(story)
    return buffer.getvalue() if output_path is None else output_path
