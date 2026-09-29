"""calculations/balance_sheet.py — Projected balance sheet (Year 0–5)."""
from core.engine import R, _tally_projected_balance_sheet


def calculate_balance_sheet(
    data, scheme_data: dict, income: list, dep: dict,
    loan_schedule: list, wc_schedule: list,
) -> list:
    """
    Build projected balance sheet for Year 0 through Year 5.

    loan_schedule and wc_schedule are expected to have exactly 5 rows.
    """
    term_loan_0   = float(scheme_data.get("term_loan",        0) or 0)
    wc_loan_0     = float(scheme_data.get("wc_loan",          0) or 0)
    promoter      = float(scheme_data.get("promoter_amount",  0) or 0)
    margin_money  = float(scheme_data.get("margin_money",     0) or 0)   # PMEGP subsidy (TDR)
    gross_block   = float(dep.get("gross_block",              0) or 0)
    annual_dep    = float(dep.get("annual_dep",               0) or 0)
    # Fixed project cost only (excludes WC) — WC is already fully represented via
    # current_assets (asset side) and wc_bank/promoter_wc_margin (liability side),
    # so it must NOT also be subtracted here. Using "project_cost" (which nets in
    # only the promoter's WC margin) instead of "fixed_project_cost" made this go
    # negative and clamp to 0, silently dropping preliminary/fixture costs from
    # the asset side and creating a phantom "Short-Term Funding Gap".
    fixed_proj    = float(scheme_data.get("fixed_project_cost", scheme_data.get("project_cost", gross_block)) or 0)
    land          = float(getattr(getattr(data, "project", None), "land_cost", 0) or 0)

    def _ca_components(w: dict) -> dict:
        """Gross current-asset components straight from the WC schedule's own
        per-year dict.

        CA AUDIT: the Balance Sheet used to collapse Raw Material Inventory,
        WIP, Finished Goods and Trade Receivables into one blended
        "current_assets"/"Stock / Debtors" figure (and, before an earlier
        fix, netted Trade Creditors into it too). A bank-standard Balance
        Sheet shows each of these as its own line — they are already
        computed separately by calculate_wc_by_year()
        (calculations/working_capital.py); this just stops discarding that
        breakdown before it reaches the Balance Sheet. A service business
        uses a different WC model entirely (receivables/salary float/
        expense float/cash reserve, no inventory) — its non-debtor
        components are folded into "other_current_assets" rather than
        invented as fake inventory lines that don't exist for a service
        business.
        """
        rm_stock = float(w.get("rm_stock", w.get("stock", 0)) or 0)
        wip      = float(w.get("wip", 0) or 0)
        fg       = float(w.get("fg", 0) or 0)
        debtors  = float(w.get("debtors", 0) or 0)
        other_ca = (
            float(w.get("cash_reserve", 0) or 0)
            + float(w.get("salary_float", 0) or 0)
            + float(w.get("expense_float", 0) or 0)
        )
        return {
            "rm_inventory":        R(rm_stock),
            "wip":                 R(wip),
            "finished_goods":      R(fg),
            "trade_receivables":   R(debtors),
            "other_current_assets": R(other_ca),
        }

    wc_y1           = wc_schedule[0] if wc_schedule else {}
    wc_y1_bank      = float(wc_y1.get("bank_loan", 0)) if wc_schedule else wc_loan_0
    wc_y1_margin    = float(wc_y1.get("margin", 0)) if wc_schedule else 0.0
    wc_y1_creditors = float(wc_y1.get("creditors", 0)) if wc_schedule else 0.0
    wc_y1_ca        = _ca_components(wc_y1)
    _y1_gross_ca    = R(sum(wc_y1_ca.values()))
    # CA AUDIT: "current_assets" used to be wc_schedule[i]["total"] — the NET
    # WC requirement (stock + debtors − creditors), with Trade Creditors never
    # appearing anywhere on the liability side. A real balance sheet must show
    # GROSS current assets (stock + debtors, undiminished) and Trade Creditors
    # as its own current liability — netting them together on the asset side
    # understated both Total Assets and Total Liabilities by the same amount
    # and hid a real payable from the liability side entirely. Gross CA = the
    # net WC figure plus back the creditors that were subtracted from it.
    other_assets    = R(max(fixed_proj - gross_block - land, 0))
    # Other Current Liabilities — no such input exists on this platform yet;
    # shown at Rs.0 for bank-format completeness (same convention as Land /
    # Other Assets when the applicant entered none), never invented.
    other_cl        = 0.0

    rows = [{
        "year":               0,
        "equity":             promoter,
        "margin_money":       margin_money,   # PMEGP: shown as Govt Subsidy (TDR)
        "term_loan":          term_loan_0,
        "reserves":           0.0,
        "wc_bank":            wc_y1_bank,
        "trade_creditors":    wc_y1_creditors,
        "other_current_liabilities": other_cl,
        # Promoter's own working-capital margin — funds part of current_assets
        # on the asset side, so it must appear as owners' funds here too.
        "promoter_wc_margin": wc_y1_margin,
        "land":               land,
        "gross_block":        gross_block,
        "other_assets":       other_assets,
        "accum_dep":          0.0,
        "net_block":          gross_block,
        **wc_y1_ca,
        "current_assets":     _y1_gross_ca,
        "cash":               0.0,
    }]

    accum_dep = 0.0
    for i, yr in enumerate(income):
        dep_yr      = float(yr.get("depreciation", annual_dep) or annual_dep)
        accum_dep   = R(accum_dep + dep_yr)
        w_i         = wc_schedule[i] if i < len(wc_schedule) else {}
        ca_i        = _ca_components(w_i) if i < len(wc_schedule) else wc_y1_ca
        creditors_i = float(w_i.get("creditors", 0)) if i < len(wc_schedule) else wc_y1_creditors
        rows.append({
            "year":               yr["year"],
            "equity":             promoter,
            "margin_money":       margin_money,   # PMEGP: TDR released after 3 years
            "term_loan":          R(float(loan_schedule[i]["closing_balance"])),
            "reserves":           R(float(yr.get("reserves_surplus", 0) or 0)),
            "wc_bank":            R(float(w_i.get("bank_loan", 0))) if i < len(wc_schedule) else wc_y1_bank,
            "trade_creditors":    R(creditors_i),
            "other_current_liabilities": 0.0,
            "promoter_wc_margin": R(float(w_i.get("margin", 0))) if i < len(wc_schedule) else wc_y1_margin,
            "land":               land,
            "gross_block":        gross_block,
            "other_assets":       other_assets,
            "accum_dep":          R(accum_dep),
            "net_block":          R(max(gross_block - accum_dep, 0)),
            **ca_i,
            "current_assets":     R(sum(ca_i.values())),
            "cash":               0.0,
        })

    _tally_projected_balance_sheet(rows)

    # CA AUDIT: Current Ratio used to be computed only inside pdf/builder.py
    # (a display-layer recalculation from raw Balance Sheet fields, done
    # nowhere else) — moved here so it is a genuine CENTRAL-ENGINE output
    # every consumer (PDF, Level-2 formula validation) reads once, instead
    # of each recomputing it themselves. Total Current Assets INCLUDES cash
    # (a current asset like any other); Total Current Liabilities is the WC
    # bank facility + Trade Creditors + Other Current Liabilities — never
    # the Term Loan, which is carried entirely as a long-term liability.
    for row in rows:
        _cl = max(
            float(row.get("wc_bank", 0) or 0)
            + float(row.get("trade_creditors", 0) or 0)
            + float(row.get("other_current_liabilities", 0) or 0),
            1,
        )
        _ca = float(row.get("current_assets", 0) or 0) + max(float(row.get("cash", 0) or 0), 0)
        row["current_ratio"] = R(_ca / _cl, 4)

    return rows
