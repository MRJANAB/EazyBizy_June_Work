"""
cma/pdf_report.py
=================
Renders the CMA PDF from the SAME shared sections as the Excel
(report_sections.py) — so the PDF is a faithful replica of the Excel workbook,
one section per block, including the audited + projected columns.
"""

from typing import Dict, Any, List, Optional
import io

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)
from datetime import datetime

from .report_sections import build_sections

NAVY = colors.HexColor("#1E293B")
ACCENT = colors.HexColor("#0D9488")
LIGHT = colors.HexColor("#F1F5F9")
GREY = colors.HexColor("#CBD5E1")
WHITE = colors.white


def _styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("CMATitle", fontSize=22, leading=26, fontName="Helvetica-Bold",
                         textColor=NAVY, spaceAfter=4))
    s.add(ParagraphStyle("CMASub", fontSize=10, leading=13, fontName="Helvetica",
                         textColor=colors.HexColor("#64748b")))
    s.add(ParagraphStyle("Sec", fontSize=12, leading=15, fontName="Helvetica-Bold",
                         textColor=WHITE, backColor=NAVY, borderPadding=6, spaceBefore=6, spaceAfter=8))
    s.add(ParagraphStyle("Cell", fontSize=7.5, leading=9, fontName="Helvetica"))
    s.add(ParagraphStyle("CellR", fontSize=7.5, leading=9, fontName="Helvetica", alignment=2))
    s.add(ParagraphStyle("HdrC", fontSize=7.5, leading=9, fontName="Helvetica-Bold",
                         textColor=WHITE, alignment=TA_CENTER))
    return s


def _money(v, is_money):
    if v is None or v == "":
        return ""
    if isinstance(v, (int, float)):
        return f"{v:,.0f}" if is_money else f"{v}"
    return str(v)


def _kv_table(sec, S):
    rows = [[Paragraph("<b>Field</b>", S["HdrC"]), Paragraph("<b>Details</b>", S["HdrC"])]]
    for k, v in sec["pairs"]:
        val = f"{v:,.0f}" if isinstance(v, (int, float)) else str(v)
        rows.append([Paragraph(str(k), S["Cell"]), Paragraph(val, S["Cell"])])
    t = Table(rows, colWidths=[70 * mm, 110 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.3, GREY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def _section_table(sec, S, avail_w):
    cols = sec["columns"]
    ncols = len(cols)
    # Header: Particulars + period labels (with tag on a second line)
    header = [Paragraph("<b>Particulars</b>", S["HdrC"])]
    for label, tag in cols:
        header.append(Paragraph(f"<b>{label}</b><br/><font size=6>{tag}</font>", S["HdrC"]))
    data = [header]

    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.3, GREY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
    ]
    for row in sec["rows"]:
        r_idx = len(data)
        style = row["style"]
        if style == "sub":
            data.append([Paragraph(f"<b>{row['label']}</b>", S["Cell"])] + [""] * ncols)
            style_cmds.append(("SPAN", (0, r_idx), (-1, r_idx)))
            style_cmds.append(("BACKGROUND", (0, r_idx), (-1, r_idx), LIGHT))
            style_cmds.append(("TEXTCOLOR", (0, r_idx), (0, r_idx), ACCENT))
            continue
        bold = style == "bold"
        lab = f"<b>{row['label']}</b>" if bold else row["label"]
        cells = [Paragraph(lab, S["Cell"])]
        for v in row["values"]:
            txt = _money(v, row["money"])
            cells.append(Paragraph(f"<b>{txt}</b>" if bold else txt, S["CellR"]))
        data.append(cells)
        if bold:
            style_cmds.append(("BACKGROUND", (0, r_idx), (-1, r_idx), LIGHT))

    label_w = 58 * mm
    rest = max(avail_w - label_w, 60 * mm)
    col_w = rest / ncols if ncols else rest
    t = Table(data, colWidths=[label_w] + [col_w] * ncols, repeatRows=1)
    t.setStyle(TableStyle(style_cmds))
    return t


def _make_watermark(text: str):
    """Return an onPage callback that stamps a repeating diagonal watermark."""
    def _draw(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica-Bold", 42)
        canvas.setFillColor(colors.HexColor("#0D9488"))
        try:
            canvas.setFillAlpha(0.08)
        except Exception:
            pass
        w, h = landscape(A4)
        canvas.translate(w / 2, h / 2)
        canvas.rotate(30)
        for iy in range(-3, 4):
            for ix in range(-2, 3):
                canvas.drawCentredString(ix * 320, iy * 120, text)
        canvas.restoreState()
    return _draw


def build_cma_pdf(results: Dict[str, Any], output_path: Optional[str] = None,
                  watermark: Optional[str] = None) -> Any:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        output_path or buffer, pagesize=landscape(A4),
        leftMargin=12 * mm, rightMargin=12 * mm, topMargin=12 * mm, bottomMargin=12 * mm,
    )
    S = _styles()
    avail_w = landscape(A4)[0] - 24 * mm
    meta = results.get("metadata", {})
    biz = meta.get("business", {})

    story: List[Any] = []
    # Cover
    story.append(Spacer(1, 40 * mm))
    story.append(Paragraph("CREDIT MONITORING ARRANGEMENT (CMA)", S["CMATitle"]))
    story.append(Paragraph(f"{biz.get('entity_name', '')} — Projected Financial Statements", S["CMASub"]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(f"Prepared on {datetime.now().strftime('%d %B %Y')} · For bank submission &amp; credit appraisal", S["CMASub"]))
    story.append(PageBreak())

    for sec in build_sections(results):
        story.append(Paragraph(sec["title"], S["Sec"]))
        if sec["kind"] == "kv":
            story.append(_kv_table(sec, S))
        else:
            story.append(_section_table(sec, S, avail_w))
        story.append(PageBreak())

    if watermark:
        wm = _make_watermark(watermark)
        doc.build(story, onFirstPage=wm, onLaterPages=wm)
    else:
        doc.build(story)
    return buffer.getvalue() if output_path is None else output_path
