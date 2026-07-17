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


def _form_i(results):
    """
    Form I — Particulars of Borrower (KYC / applicant + business profile).
    Pure presentation of intake metadata; nothing computed.
    """
    meta = results.get("metadata", {})
    app, biz, loan = meta.get("applicant", {}), meta.get("business", {}), meta.get("loan", {})
    pairs = [
        ("A. APPLICANT / PROMOTER", ""),
        ("Name", app.get("name", "")),
        ("Father / Spouse Name", app.get("father_spouse_name", "")),
        ("Date of Birth", app.get("dob", "")),
        ("PAN", app.get("pan", "")),
        ("Aadhaar", app.get("aadhaar", "")),
        ("Mobile", app.get("mobile", "")),
        ("Email", app.get("email", "")),
        ("Address", ", ".join(x for x in [app.get("address", ""), app.get("city", ""),
                                          app.get("state", ""), app.get("pincode", "")] if x)),
        ("Education", app.get("education", "")),
        ("Experience (years)", app.get("experience_years", "")),
        ("B. BUSINESS / UNIT", ""),
        ("Entity Name", biz.get("entity_name", "")),
        ("Constitution", biz.get("constitution", "")),
        ("Activity / Industry", biz.get("activity", "")),
        ("GST Number", biz.get("gst_number", "")),
        ("Udyam Registration", biz.get("udyam_registration", "")),
        ("IEC (Export)", biz.get("iec", "") or "N/A"),
        ("Commencement Date", biz.get("commencement_date", "")),
        ("C. FACILITY SOUGHT", ""),
        ("Purpose", loan.get("purpose", "")),
        ("Loan Type", loan.get("loan_type", "")),
        ("Scheme", loan.get("scheme", "")),
        ("Preferred Bank", loan.get("preferred_bank", "")),
        ("Amount", loan.get("amount", 0)),
        ("Interest Rate (%)", loan.get("interest_rate", 0)),
        ("Tenure (months)", loan.get("tenure_months", 0)),
        ("Moratorium (months)", loan.get("moratorium_months", 0)),
    ]
    return {"title": "Form I - Particulars of Borrower", "kind": "kv", "pairs": pairs}


def _ca_observations(results):
    """
    CA Observations & Recommendation — an analyst's read of the computed numbers
    against banking benchmarks. Rendered as a 3-column table:
    Parameter | Value | Benchmark | Assessment (Assessment carried in the label-less
    columns). Derived purely from the engine results.
    """
    summ = results.get("summary", {})
    ratios = results.get("ratios", [])
    rx = results.get("ratios_extended", [])
    mpbf = results.get("mpbf_by_year", [])
    bs = results.get("balance_sheet", [])
    be = results.get("breakeven", [])
    ops = results.get("operating_statement", [])
    sens = results.get("sensitivity", {})
    cont = results.get("projection_continuity", {})

    def verdict(ok, caution=None):
        if caution is True:
            return "Caution"
        return "Good" if ok else "Concern"

    rows = []

    def obs(param, value, benchmark, assess):
        rows.append(_r(param, [value, benchmark, assess], money=False))

    # DSCR
    dscr = summ.get("avg_dscr", 0)
    obs("Average DSCR", f"{dscr:.2f}", ">= 1.50 (min 1.25)",
        "Good" if dscr >= 1.5 else "Caution" if dscr >= 1.25 else "Concern")
    # Minimum DSCR (weakest year) — bankers size repayment to the worst year.
    dscrs = [r.get("dscr", 0) for r in ratios] if ratios else []
    if dscrs:
        min_dscr = min(dscrs)
        min_yr = dscrs.index(min_dscr) + 1
        obs("Minimum DSCR (weakest year)", f"{min_dscr:.2f} (Yr {min_yr})", ">= 1.20 (min 1.00)",
            "Good" if min_dscr >= 1.2 else "Caution" if min_dscr >= 1.0 else "Concern")
    # Debt-Equity
    de = summ.get("max_debt_equity", 0)
    obs("Debt-Equity Ratio", f"{de:.2f}:1", "<= 2.0 (max 3.0)",
        "Good" if de <= 2 else "Caution" if de <= 3 else "Concern")
    # Promoter contribution
    pc = summ.get("promoter_pct", 0)
    obs("Promoter Contribution", f"{pc:.1f}%", ">= 15% (min 10%)",
        "Good" if pc >= 15 else "Caution" if pc >= 10 else "Concern")
    # Current ratio (Year 1)
    cr = ratios[0].get("current_ratio", 0) if ratios else 0
    obs("Current Ratio (Yr 1)", f"{cr:.2f}", ">= 1.33",
        "Good" if cr >= 1.33 else "Caution" if cr >= 1.1 else "Concern")
    # Interest coverage (Year 1)
    ic = rx[0].get("interest_coverage", 0) if rx else 0
    obs("Interest Coverage (Yr 1)", f"{ic:.2f}", ">= 2.0",
        "Good" if ic >= 2 else "Caution" if ic >= 1.5 else "Concern")
    # TOL / TNW
    tol = rx[0].get("tol_tnw", 0) if rx else 0
    obs("TOL / TNW (Yr 1)", f"{tol:.2f}", "<= 3.0",
        "Good" if tol <= 3 else "Caution" if tol <= 4 else "Concern")
    # Total Debt / EBITDA (Yr 1) — key leverage multiple for term-loan sizing.
    if ops and bs:
        ebitda1 = ops[0].get("ebitda", 0)
        total_debt1 = bs[0]["liabilities"].get("term_loan", 0) + bs[0]["liabilities"].get("wc_loan", 0)
        if ebitda1 > 0:
            de_ebitda = total_debt1 / ebitda1
            obs("Total Debt / EBITDA (Yr 1)", f"{de_ebitda:.2f}x", "<= 3.5x (max 4.5x)",
                "Good" if de_ebitda <= 3.5 else "Caution" if de_ebitda <= 4.5 else "Concern")
        else:
            obs("Total Debt / EBITDA (Yr 1)", "N/A (EBITDA <= 0)", "<= 3.5x", "Concern")
    # MPBF vs WC sought
    if mpbf:
        m0 = mpbf[0]
        within = m0.get("within_limit", True)
        obs("WC Limit vs MPBF", f"Sought {m0.get('wc_loan_sought', 0):,.0f}",
            f"<= MPBF {m0.get('mpbf', 0):,.0f}", "Good" if within else "Concern")
    # Break-even (Year 1)
    if be:
        bep = be[0].get("bep_pct", 0)
        obs("Break-even (Yr 1)", f"{bep:.1f}% of sales", "<= 70% comfortable",
            "Good" if bep <= 70 else "Caution" if bep <= 85 else "Concern")
    # Profitability trend
    if ops:
        pat1, pat5 = ops[0].get("pat", 0), ops[-1].get("pat", 0)
        growing = pat5 >= pat1 and pat1 > 0
        obs("Net Profit (PAT) Trend", f"Yr1 {pat1:,.0f} -> Yr5 {pat5:,.0f}", "Positive & rising",
            "Good" if growing else "Caution" if pat5 > 0 else "Concern")
    # Stress resilience (sales -10%)
    if sens.get("sales_down_10"):
        stress = min((r.get("dscr", 0) for r in sens["sales_down_10"]), default=0)
        obs("Stress DSCR (Sales -10%)", f"{stress:.2f} (min yr)", ">= 1.0",
            "Good" if stress >= 1.0 else "Concern")
    # Balance sheet tally
    if bs:
        max_check = max(abs(b.get("check", 0)) for b in bs)
        obs("Balance Sheet Tally", f"max diff {max_check:.0f}", "= 0",
            "Good" if max_check < 2 else "Concern")
    # Projection continuity (existing business)
    if cont.get("applicable"):
        jp = cont.get("jump_pct", 0)
        obs("Projection vs Last Actual", f"{jp:+.1f}%", "within +/- 30%",
            "Concern" if cont.get("implausible") else "Good")

    # Overall recommendation
    concerns = sum(1 for r in rows if r["values"][2] == "Concern")
    cautions = sum(1 for r in rows if r["values"][2] == "Caution")
    if concerns == 0 and cautions <= 1:
        rec = "RECOMMEND - financials meet banking benchmarks."
    elif concerns <= 1:
        rec = "CONDITIONAL - address the flagged item(s) before sanction."
    else:
        rec = "REVIEW - multiple parameters below benchmark; restructure advised."
    rows.append(_r("OVERALL RECOMMENDATION (system)", [rec, "", ""], style="bold", money=False))

    # Analyst's manual recommendation (from the wizard scorecard step). Full
    # write-up lives in the Credit Appraisal Note section.
    car = results.get("ca_recommendation")
    if car and car.get("recommendation"):
        rating = car.get("rating", "")
        obs("Analyst's Recommendation", car.get("recommendation", ""),
            rating.upper() if rating else "", "See Credit Appraisal Note")

    cols = [("Value", ""), ("Benchmark", ""), ("Assessment", "")]
    return {"title": "CA Observations & Recommendation", "kind": "table", "columns": cols, "rows": rows}


def _credit_appraisal_note(results):
    """
    Credit Appraisal Note — the analyst's/banker's qualitative sign-off:
    verdict, strengths, risk factors, mitigants and the sanction covenants.
    Rendered only when the analyst has filled it in the wizard.
    """
    car = results.get("ca_recommendation")
    if not car:
        return None
    has_content = any(car.get(k) for k in
                      ("recommendation", "notes", "strengths", "weaknesses", "risk_mitigants")) \
                  or car.get("covenants")
    if not has_content:
        return None

    rating = (car.get("rating", "") or "").upper()
    verdict = car.get("recommendation", "")
    pairs = []
    if verdict:
        pairs.append(("Recommendation", f"{verdict}" + (f"  ({rating})" if rating else "")))
    if car.get("strengths"):
        pairs.append(("Strengths", car.get("strengths")))
    if car.get("weaknesses"):
        pairs.append(("Risk Factors / Weaknesses", car.get("weaknesses")))
    if car.get("risk_mitigants"):
        pairs.append(("Risk Mitigants", car.get("risk_mitigants")))
    covs = [c for c in (car.get("covenants") or []) if str(c).strip()]
    for i, c in enumerate(covs, 1):
        pairs.append((f"Covenant {i}", c))
    if car.get("notes"):
        pairs.append(("Remarks / Conditions", car.get("notes")))
    return {"title": "Credit Appraisal Note", "kind": "kv", "pairs": pairs}


def _operating_statement(results, n=5):
    cols, ops = op_periods(results, n)

    def g(o, k): return o.get(k, 0)
    def tl(o): return o.get("tl_interest", o.get("interest", 0))
    def wc(o): return o.get("wc_interest", 0)

    exp_pct = (results.get("export_sales_pct", 0) or 0) / 100.0
    dom = [round(g(o, "revenue") * (1 - exp_pct), 2) for o in ops]
    exp = [round(g(o, "revenue") * exp_pct, 2) for o in ops]

    rows = [
        _r("1. Gross Sales / Sales & Services", [g(o, "revenue") for o in ops], "bold"),
        _r("   i. Domestic Sales", dom),
        _r("   ii. Export Sales", exp),
        _r("2. Net Sales", [g(o, "revenue") for o in ops], "bold"),
        _r("3. COST OF SALES", [""] * len(ops), "sub"),
        _r("   Raw Material / Consumables", [g(o, "cogs") for o in ops]),
        _r("   Depreciation", [g(o, "depreciation") for o in ops]),
        _r("   Cost of Production / Sales", [g(o, "cogs") + g(o, "depreciation") for o in ops], "bold"),
        _r("4. Selling, General & Admin Expenses", [g(o, "salary") + g(o, "other_opex") + g(o, "cgtmse_fee") for o in ops]),
    ]
    if any(g(o, "cgtmse_fee") for o in ops):
        rows.append(_r("   incl. CGTMSE Guarantee Fee", [g(o, "cgtmse_fee") for o in ops]))
    rows += [
        _r("5. Total Cost of Sales (3+4)", [g(o, "cogs") + g(o, "depreciation") + g(o, "salary") + g(o, "other_opex") + g(o, "cgtmse_fee") for o in ops], "bold"),
        _r("6. Operating Profit before Interest", [g(o, "ebitda") - g(o, "depreciation") for o in ops], "bold"),
        _r("7. Interest on Working Capital", [wc(o) for o in ops]),
        _r("   Interest on Term Loan", [tl(o) for o in ops]),
    ]
    if any(g(o, "prelim_amortisation") for o in ops):
        rows.append(_r("   Less: Preliminary Expenses Written Off", [g(o, "prelim_amortisation") for o in ops]))
    rows += [
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

    # Current liabilities INCLUDE the current portion of the term loan (CPTL),
    # exactly as the Ratio Analysis section computes them — so the current ratio
    # shown here reconciles with the one in Ratio Analysis (no double figure).
    def CL(b): return L(b, "wc_loan") + L(b, "creditors") + L(b, "cptl")

    rows = [
        _r("CURRENT LIABILITIES", [""] * len(bs), "sub"),
        _r("  Working Capital Bank Borrowing", [L(b, "wc_loan") for b in bs]),
        _r("  Sundry Creditors (Trade)", [L(b, "creditors") for b in bs]),
        _r("  Current Portion of Term Loan (CPTL)", [L(b, "cptl") for b in bs]),
        _r("  TOTAL CURRENT LIABILITIES", [CL(b) for b in bs], "bold"),
        _r("TERM LIABILITIES", [""] * len(bs), "sub"),
        _r("  Term Loan (net of current portion)", [L(b, "term_loan") - L(b, "cptl") for b in bs]),
        _r("  TOTAL TERM LIABILITIES", [L(b, "term_loan") - L(b, "cptl") for b in bs], "bold"),
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
        _r("Net Working Capital", [CA(b, "total") - CL(b) for b in bs]),
        _r("Current Ratio", [round(CA(b, "total") / CL(b), 2) if CL(b) else 0 for b in bs], money=False),
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
        _r("  8. Instalments of Term Loan due within 1 yr (CPTL)", [L(b, "cptl") for b in bs]),
        _r("  TOTAL CURRENT LIABILITIES", [L(b, "creditors") + L(b, "wc_loan") + L(b, "cptl") for b in bs], "bold"),
    ]
    return {"title": "Form IV - Comparative Statement of Current Assets & Liabilities", "kind": "table", "columns": cols, "rows": rows}


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
        _r("Inventory Holding Period (days)", c("inventory_days"), money=False),
        _r("Average Collection Period (days)", c("collection_days"), money=False),
        _r("Average Credit Period (days)", c("credit_period_days"), money=False),
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
    return {"title": "Form VI - Fund Flow Statement", "kind": "table", "columns": cols, "rows": rows}


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
    return {"title": "Form V - Cash Flow Statement", "kind": "table", "columns": cols, "rows": rows}


def _dscr(results, n=5):
    cols = proj_columns(results, n)
    ops = results.get("operating_statement", [])[:n]
    rat = results.get("ratios", [])[:n]
    total_a = [o.get("pat", 0) + o.get("depreciation", 0) + o.get("prelim_amortisation", 0) + o.get("tl_interest", 0) for o in ops]
    total_b = [o.get("tl_interest", 0) + o.get("tl_principal", 0) for o in ops]
    rows = [
        _r("A. CASH ACCRUALS (Sources)", [""] * len(ops), "sub"),
        _r("Net Profit After Tax", [o.get("pat", 0) for o in ops]),
        _r("Add: Depreciation", [o.get("depreciation", 0) for o in ops]),
    ]
    if any(o.get("prelim_amortisation", 0) for o in ops):
        rows.append(_r("Add: Preliminary Expenses Written Off", [o.get("prelim_amortisation", 0) for o in ops]))
    rows += [
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
    return {"title": "Form VII - Breakeven Analysis", "kind": "table", "columns": cols, "rows": rows}


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


def _promoter_net_worth(results):
    """
    Promoter's Net Worth Statement — the personal balance sheet a banker relies on
    for the promoter guarantee. Straight from the intake (nothing computed).
    """
    pnw = results.get("promoter_net_worth", {}) or {}
    rows = [
        _r("A. ASSETS", [""], "sub"),
        _r("Residential Property", [pnw.get("residential_property", 0)]),
        _r("Commercial Property", [pnw.get("commercial_property", 0)]),
        _r("Fixed Deposits", [pnw.get("fd", 0)]),
        _r("Savings / Bank Balance", [pnw.get("savings", 0)]),
        _r("Mutual Funds", [pnw.get("mutual_funds", 0)]),
        _r("Shares / Securities", [pnw.get("shares", 0)]),
        _r("Gold / Jewellery", [pnw.get("gold", 0)]),
        _r("Other Assets", [pnw.get("other_assets", 0)]),
        _r("Total Assets", [sum(pnw.get(k, 0) for k in
            ("residential_property", "commercial_property", "fd", "savings",
             "mutual_funds", "shares", "gold", "other_assets"))], "bold"),
        _r("B. LIABILITIES", [""], "sub"),
        _r("Total Liabilities", [pnw.get("liabilities", 0)]),
        _r("NET WORTH (A - B)", [results.get("promoter_net_worth_total", 0)], "bold"),
    ]
    g = results.get("guarantor")
    if g and g.get("name"):
        rows.append(_r("GUARANTOR", [""], "sub"))
        rows.append(_r(f"  {g.get('name','')} ({g.get('relation','')})",
                       [g.get("net_worth", 0)]))
    cols = [("Amount", "(Rs.)")]
    return {"title": "Promoter's Net Worth Statement", "kind": "table", "columns": cols, "rows": rows}


def _security_coverage(results):
    """
    Security & Collateral Coverage — primary (hypothecated assets financed) +
    collateral offered, against total bank exposure, with the coverage ratios and
    CGTMSE status a banker checks first. Uses the collateral the wizard collects.
    """
    col = results.get("collateral")
    exposure = results.get("total_exposure", 0) or 0
    primary = results.get("project_cost_fixed_assets", 0) or 0
    bs = results.get("balance_sheet", [])
    # Primary security on the WC side = hypothecation of stock + book debts only
    # (cash / the balancing plug is not pledged security).
    if bs:
        ca1 = bs[0]["assets"]["current_assets"]
        ca_y1 = ca1.get("stock", 0) + ca1.get("debtors", 0)
    else:
        ca_y1 = 0

    items = (col or {}).get("collateral_items", []) if col else []
    tot_mv = sum(i.get("market_value", 0) for i in items)
    tot_fsv = sum(i.get("forced_sale_value", 0) for i in items)

    rows = [
        _r("A. PRIMARY SECURITY (hypothecation)", [""], "sub"),
        _r("Fixed Assets financed (plant, machinery, etc.)", [primary]),
        _r("Current Assets (stock + book debts), Yr 1", [round(ca_y1, 2)]),
        _r("Total Primary Security", [round(primary + ca_y1, 2)], "bold"),
    ]
    if col and col.get("primary_security"):
        rows.append(_r(f"  Description: {col.get('primary_security')}", [""]))

    rows.append(_r("B. COLLATERAL SECURITY (offered)", [""], "sub"))
    if items:
        for i in items:
            desc = f"  {i.get('type','')}: {i.get('description','')}".rstrip(": ")
            rows.append(_r(desc + f"  [owner: {i.get('owner','-')}]",
                           [i.get("market_value", 0)]))
        rows.append(_r("Total Collateral - Market Value", [round(tot_mv, 2)], "bold"))
        rows.append(_r("Total Collateral - Forced Sale Value (FSV)", [round(tot_fsv, 2)], "bold"))
    else:
        rows.append(_r("  No collateral pledged", [0]))

    rows.append(_r("C. EXPOSURE & COVERAGE", [""], "sub"))
    rows.append(_r("Total Bank Exposure (TL + WC)", [round(exposure, 2)], "bold"))
    total_sec = primary + ca_y1 + tot_mv
    rows.append(_r("Total Security (Primary + Collateral MV)", [round(total_sec, 2)], "bold"))
    asset_cov = round(total_sec / exposure, 2) if exposure else 0
    fsv_cov = round(tot_fsv / exposure, 2) if exposure else 0
    rows.append(_r("Asset Coverage Ratio (Total Security / Exposure)", [f"{asset_cov:.2f}x"], "bold", money=False))
    rows.append(_r("Collateral FSV Coverage (FSV / Exposure)", [f"{fsv_cov:.2f}x"], money=False))
    if col:
        cg = "Yes — {}%".format(col.get("cgtmse_coverage_pct", 0)) if col.get("cgtmse_covered") else "No"
        rows.append(_r("CGTMSE Guarantee Cover", [cg], money=False))
        rows.append(_r("Asset Insurance Arranged", ["Yes" if col.get("insurance_arranged") else "No"], money=False))

    cols = [("Amount", "(Rs.)")]
    return {"title": "Security & Collateral Coverage", "kind": "table", "columns": cols, "rows": rows}


def _abf(results, n=5):
    """
    Assessed Bank Finance (ABF) sheet — the working-capital assessment banks
    file alongside MPBF, plus the diagnostic %/days ratios from the CMA ABF form.
    All figures derived from the projected balance sheet + operating statement.
    """
    cols = proj_columns(results, n)
    bs = results.get("balance_sheet", [])[:n]
    ops = results.get("operating_statement", [])[:n]

    def CA(b): return b["assets"]["current_assets"]
    tca   = [CA(b)["total"] for b in bs]
    ocl   = [b["liabilities"]["creditors"] for b in bs]              # non-bank CL
    bankf = [b["liabilities"]["wc_loan"] for b in bs]               # bank finance
    wcg   = [round(tca[i] - ocl[i], 2) for i in range(len(bs))]     # working capital gap
    nwc   = [round(tca[i] - ocl[i] - bankf[i], 2) for i in range(len(bs))]
    abf   = [round(wcg[i] - nwc[i], 2) for i in range(len(bs))]     # = bank finance

    def pct(num, den):
        return [round(num[i] / den[i] * 100, 1) if den[i] else 0 for i in range(len(bs))]
    def days(num, base_key):
        out = []
        for i, b in enumerate(bs):
            base = ops[i].get(base_key, 0) if i < len(ops) else 0
            out.append(round(num[i] * 365 / base, 0) if base else 0)
        return out

    stock = [CA(b)["stock"] for b in bs]
    debt  = [CA(b)["debtors"] for b in bs]
    sales = [o.get("revenue", 0) for o in ops]

    rows = [
        _r("1. Total Current Assets (TCA)", tca, "bold"),
        _r("2. Current Liabilities (other than bank borrowing)", ocl),
        _r("3. Working Capital Gap (1 - 2)", wcg, "bold"),
        _r("4. Net Working Capital (actual / projected)", nwc),
        _r("5. Assessed Bank Finance (3 - 4)", abf, "bold"),
        _r("DIAGNOSTIC RATIOS", [""] * len(bs), "sub"),
        _r("NWC / TCA (%)", pct(nwc, tca), money=False),
        _r("Bank Finance / TCA (%)", pct(bankf, tca), money=False),
        _r("Other CL / TCA (%)", pct(ocl, tca), money=False),
        _r("Sundry Creditors / TCA (%)", pct(ocl, tca), money=False),
        _r("Inventory / Net Sales (days)", days(stock, "revenue"), money=False),
        _r("Receivables / Gross Sales (days)", days(debt, "revenue"), money=False),
        _r("Sundry Creditors / Purchases (days)", days(ocl, "cogs"), money=False),
    ]
    return {"title": "Assessed Bank Finance (ABF)", "kind": "table", "columns": cols, "rows": rows}


def _loan_schedule(results, n=5):
    """
    Term Loan Repayment Schedule — per-year amortisation (reducing balance) plus
    the revolving WC interest, straight from the single-source loan schedule.
    """
    cols = proj_columns(results, n)
    sch = results.get("loan_schedule", [])[:n]

    def c(k): return [s.get(k, 0) for s in sch]
    rows = [
        _r("TERM LOAN", [""] * len(sch), "sub"),
        _r("Opening Balance", c("tl_opening"), "bold"),
        _r("Principal Repayment (during year)", c("tl_principal")),
        _r("Interest on Term Loan", c("tl_interest")),
        _r("Closing Balance", c("tl_closing"), "bold"),
        _r("WORKING CAPITAL", [""] * len(sch), "sub"),
        _r("WC Outstanding (revolving)", c("wc_outstanding")),
        _r("Interest on Working Capital", c("wc_interest")),
        _r("TOTAL INTEREST (TL + WC)", c("total_interest"), "bold"),
    ]
    return {"title": "Term Loan Repayment Schedule", "kind": "table", "columns": cols, "rows": rows}


# Short Excel tab names (<=31 chars, unique), keyed by section title so that
# optional sections (which may be absent) never shift another sheet's name.
_SHEET_NAME_BY_TITLE = {
    "Summary": "Summary",
    "Form I - Particulars of Borrower": "Form I - Borrower",
    "Promoter's Net Worth Statement": "Promoter Net Worth",
    "CA Observations & Recommendation": "CA Observations",
    "Credit Appraisal Note": "Credit Appraisal Note",
    "Operating Statement (Form II)": "Operating Statement",
    "Balance Sheet (Form III)": "Balance Sheet",
    "Depreciation Chart (WDV Method)": "Depreciation Chart",
    "Form IV - Comparative Statement of Current Assets & Liabilities": "Comparative Statement",
    "Ratio Analysis": "Ratio Analysis",
    "Turnover Method (Nayak Committee)": "Turnover Method",
    "Maximum Permissible Bank Finance (Tandon)": "MPBF",
    "Assessed Bank Finance (ABF)": "Assessed Bank Finance",
    "Security & Collateral Coverage": "Security & Collateral",
    "Term Loan Repayment Schedule": "TL Repayment Schedule",
    "Form VI - Fund Flow Statement": "Fund Flow Statement",
    "Form V - Cash Flow Statement": "Cash Flow",
    "Debt Service Coverage Ratio (DSCR)": "DSCR Analysis",
    "Form VII - Breakeven Analysis": "Breakeven Analysis",
    "Sensitivity Analysis": "Sensitivity Analysis",
}


def build_sections(results: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Ordered CMA sections — the shared content for Excel and PDF."""
    ordered = [
        _summary(results),
        _form_i(results),
        _promoter_net_worth(results),
        _ca_observations(results),
        _credit_appraisal_note(results),
        _operating_statement(results),
        _balance_sheet(results),
        _depreciation(results),
        _comparative(results),
        _ratios(results),
        _turnover(results),
        _mpbf(results),
        _abf(results),
        _security_coverage(results),
        _loan_schedule(results),
        _fund_flow(results),
        _cash_flow(results),
        _dscr(results),
        _breakeven(results),
        _sensitivity(results),
    ]
    secs = [s for s in ordered if s is not None]
    for sec in secs:
        sec["sheet"] = _SHEET_NAME_BY_TITLE.get(sec["title"], sec["title"][:31])
    return secs
