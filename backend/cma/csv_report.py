"""
cma/csv_report.py
=================
Flattens the shared CMA sections (report_sections.py) into a single stacked CSV,
so the CSV export carries the SAME content as the Excel and PDF — every section,
one after another. Keeps the three exports in lock-step (single source of truth).
"""

from typing import Dict, Any
import csv
import io

from .report_sections import build_sections


def _fmt(v, money):
    if v is None or v == "":
        return ""
    if isinstance(v, (int, float)):
        return f"{v:,.0f}" if money else f"{v}"
    return str(v)


def build_cma_csv(results: Dict[str, Any]) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    for sec in build_sections(results):
        w.writerow([sec["title"].upper()])
        if sec["kind"] == "kv":
            w.writerow(["Field", "Details"])
            for k, v in sec["pairs"]:
                w.writerow([k, _fmt(v, isinstance(v, (int, float)))])
        else:
            cols = sec["columns"]
            w.writerow(["Particulars"] + [f"{c[0]} {c[1]}".strip() for c in cols])
            for row in sec["rows"]:
                if row["style"] == "sub":
                    w.writerow([row["label"]])
                else:
                    w.writerow([row["label"]] + [_fmt(v, row["money"]) for v in row["values"]])
        w.writerow([])  # blank separator between sections
    return buf.getvalue().encode("utf-8-sig")  # BOM so Excel opens ₹/UTF-8 cleanly
