"""calculations/depreciation.py — WDV (Written Down Value / reducing-balance)
depreciation for CMAReportInput.

WDV only — no SLM anywhere in this module. Each year, PER ASSET POOL:
  depreciation = opening WDV x rate
  closing WDV  = opening WDV - depreciation
carried forward year over year.

CA AUDIT: computers, furniture/racks and vehicles used to be pooled into
Plant & Machinery and depreciated at the SAME machinery rate — but each is
its own Income-Tax-Act block of assets with a materially different
statutory WDV rate (Computers ~40%, Furniture ~10%, P&M ~15%, Motor
Vehicles ~15%). Pooling them meant a report's "Plant, Machinery &
Equipment" gross value silently included non-machinery assets (visibly
disagreeing with Section-B2's own itemised cost table, which always kept
them separate) and depreciated all of them at one rate. Five pools now:
  Building                        -> building_dep_rate_pct
  Plant & Machinery + Electrification (+ contingency) -> depreciation_pct
  Furniture & Fixtures + Racks/Storage -> furniture_dep_rate_pct
  Computers & IT Equipment        -> computers_dep_rate_pct
  Vehicles & Transportation       -> vehicle_dep_rate_pct
Electrification is grouped with Furniture & Fixtures (fixed wiring/fittings,
the Income-Tax-Act's own historical "furniture & fittings" block rate
treatment), not with Plant & Machinery — this also matches
schemes/router.py's existing "fixtures" grouping for total-project-cost
purposes exactly (computers+furniture+electrification+racks+transportation),
so contingency (which applies to P&M only, never to fixtures/civil-electrical
work) keeps applying to the identical base it always did.

BUG 5 FIX (kept): Gross Block for P&M must use PM_with_contingency.
  PM_with_contingency = (P&M items + tools/installation) x (1 + contingencyPct)
  GrossBlock = Building + PM_with_contingency + Furniture + Computers + Vehicles
"""
from core.engine import R

# Pool key -> (gross-amount getattr name(s), rate assumption field, default rate %)
_POOL_SPECS = [
    ("furniture", ("furniture_cost", "racks_storage_cost", "electrification_cost"), "furniture_dep_rate_pct", 10.0),
    ("computers", ("computers_cost",),                       "computers_dep_rate_pct", 40.0),
    ("vehicles",  ("transportation_cost",),                  "vehicle_dep_rate_pct",   15.0),
]


def calculate_depreciation(data, scheme_data: dict) -> dict:
    """
    Calculate WDV (reducing-balance) depreciation from structured CMAReportInput.

    Returns
    -------
    dict: building_gross, machinery_gross (pre-contingency P&M),
          pm_with_contingency, fixtures_gross (= furniture+electrification+
          racks+computers+vehicles, kept for backward compatibility with
          callers that want one "everything else" figure), furniture_gross
          (incl. racks/storage and electrification), computers_gross,
          vehicle_gross, gross_block, dep_building_wdv, dep_machinery_wdv,
          dep_furniture_wdv, dep_computers_wdv, dep_vehicle_wdv (Year-1
          values), total_per_year, annual_dep (both = Year-1 total, kept for
          backward compatibility with callers that only want a single
          figure), schedule (list of 5 dicts, one per year, with each
          pool's own opening/depreciation/closing WDV plus the combined
          totals every existing caller already reads).
    """
    building       = float(data.project.building_cost or 0)
    machinery_base = (
        sum(float(m.quantity) * float(m.unit_price) for m in data.project.machinery_items)
        + float(data.project.tools_installation or 0)
    )

    contingency_pct     = float(getattr(data.assumptions, "contingency_pct", 0) or 0) / 100
    pm_with_contingency = R(machinery_base * (1 + contingency_pct))

    bldg_rate = float(getattr(data.assumptions, "building_dep_rate_pct",  5) or  5) / 100
    mach_rate = float(getattr(data.assumptions, "depreciation_pct",      10) or 10) / 100

    # Each non-P&M, non-building pool's own gross amount and WDV rate —
    # never hardcoded; each rate is its own assumption (with a documented
    # Income-Tax-Act-block-rate default), same pattern as building/machinery.
    pool_gross = {}
    pool_rate  = {}
    for key, cost_fields, rate_field, default_rate in _POOL_SPECS:
        pool_gross[key] = R(sum(float(getattr(data.project, f, 0) or 0) for f in cost_fields))
        pool_rate[key]  = float(getattr(data.assumptions, rate_field, default_rate) or default_rate) / 100

    schedule = []
    bld_opening  = building
    mach_opening = pm_with_contingency
    pool_opening = {key: pool_gross[key] for key, *_ in _POOL_SPECS}
    for year in range(1, 6):
        bld_dep  = R(bld_opening  * bldg_rate)
        mach_dep = R(mach_opening * mach_rate)
        bld_closing  = R(max(bld_opening  - bld_dep,  0))
        mach_closing = R(max(mach_opening - mach_dep, 0))

        pool_dep     = {}
        pool_closing = {}
        for key, *_ in _POOL_SPECS:
            pool_dep[key]     = R(pool_opening[key] * pool_rate[key])
            pool_closing[key] = R(max(pool_opening[key] - pool_dep[key], 0))

        combined_dep     = R(bld_dep + mach_dep + sum(pool_dep.values()))
        combined_opening  = R(bld_opening + mach_opening + sum(pool_opening.values()))
        combined_closing = R(bld_closing + mach_closing + sum(pool_closing.values()))

        schedule.append({
            "year":                   year,
            "opening_wdv":            combined_opening,
            "building_opening_wdv":   bld_opening,
            "building_depreciation":  bld_dep,
            "building_closing_wdv":   bld_closing,
            "machinery_opening_wdv":  mach_opening,
            "machinery_depreciation": mach_dep,
            "machinery_closing_wdv":  mach_closing,
            "furniture_opening_wdv":  pool_opening["furniture"],
            "furniture_depreciation": pool_dep["furniture"],
            "furniture_closing_wdv":  pool_closing["furniture"],
            "computers_opening_wdv":  pool_opening["computers"],
            "computers_depreciation": pool_dep["computers"],
            "computers_closing_wdv":  pool_closing["computers"],
            "vehicles_opening_wdv":   pool_opening["vehicles"],
            "vehicles_depreciation":  pool_dep["vehicles"],
            "vehicles_closing_wdv":   pool_closing["vehicles"],
            "depreciation":           combined_dep,
            "closing_wdv":            combined_closing,
        })
        bld_opening, mach_opening = bld_closing, mach_closing
        pool_opening = pool_closing

    year1 = schedule[0]
    fixtures_gross = R(pool_gross["furniture"] + pool_gross["computers"] + pool_gross["vehicles"])

    return {
        "building_gross":       building,
        "machinery_gross":      machinery_base,       # pre-contingency P&M
        "pm_with_contingency":  pm_with_contingency,  # BUG 5 — used for gross block & V10 check
        "fixtures_gross":       fixtures_gross,        # furniture+electrification+racks + computers + vehicles combined
        "furniture_gross":      pool_gross["furniture"],  # incl. racks/storage and electrification
        "computers_gross":      pool_gross["computers"],
        "vehicle_gross":        pool_gross["vehicles"],
        "gross_block":          R(building + pm_with_contingency + fixtures_gross),
        "dep_building_wdv":     year1["building_depreciation"],
        "dep_machinery_wdv":    year1["machinery_depreciation"],
        "dep_furniture_wdv":    year1["furniture_depreciation"],
        "dep_computers_wdv":    year1["computers_depreciation"],
        "dep_vehicle_wdv":      year1["vehicles_depreciation"],
        # Kept for backward compatibility with callers expecting a single
        # "fixtures" depreciation figure — sum of the three non-P&M pools.
        "dep_fixtures_wdv":     R(year1["furniture_depreciation"] + year1["computers_depreciation"] + year1["vehicles_depreciation"]),
        # Kept for backward compatibility with callers expecting a single
        # figure (monthly_pnl, income_statement fallback, balance_sheet
        # fallback) — always the Year-1 WDV depreciation, never a flat SLM
        # amount repeated across years. Real per-year figures live in
        # "schedule" below.
        "total_per_year":       year1["depreciation"],
        "annual_dep":           year1["depreciation"],
        "schedule":             schedule,
        "method":               "WDV",
    }
