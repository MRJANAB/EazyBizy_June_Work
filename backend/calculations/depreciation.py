"""calculations/depreciation.py — SLM depreciation for CMAReportInput.

BUG 5 FIX: Gross Block for P&M must use PM_with_contingency.
  PM_with_contingency = PM_base × (1 + contingencyPct)
  GrossBlock = Building + PM_with_contingency
  Depreciation base uses PM_with_contingency (not PM_base).
"""
from core.engine import R


def calculate_depreciation(data, scheme_data: dict) -> dict:
    """
    Calculate straight-line depreciation from structured CMAReportInput.

    Returns
    -------
    dict: building_gross, machinery_gross (pre-contingency), pm_with_contingency,
          gross_block, dep_building_slm, dep_machinery_slm, total_per_year, annual_dep
    """
    building      = float(data.project.building_cost or 0)
    machinery_base = (
        sum(float(m.quantity) * float(m.unit_price) for m in data.project.machinery_items)
        + float(data.project.tools_installation or 0)
    )
    # Fixed-asset additions (separate from P&M — still depreciable)
    fixtures = R(
        float(getattr(data.project, "computers_cost",       0) or 0)
        + float(getattr(data.project, "furniture_cost",     0) or 0)
        + float(getattr(data.project, "electrification_cost", 0) or 0)
        + float(getattr(data.project, "racks_storage_cost", 0) or 0)
        + float(getattr(data.project, "transportation_cost", 0) or 0)
    )

    # BUG 5 FIX: P&M gross block includes contingency
    contingency_pct    = float(getattr(data.assumptions, "contingency_pct", 0) or 0) / 100
    pm_with_contingency = R(machinery_base * (1 + contingency_pct))

    mach_rate  = float(getattr(data.assumptions, "depreciation_pct",      10) or 10) / 100
    bldg_rate  = float(getattr(data.assumptions, "building_dep_rate_pct",  5) or  5) / 100

    dep_building  = R(building             * bldg_rate)
    # BUG 5 FIX: Depreciation base uses PM_with_contingency
    dep_machinery = R(pm_with_contingency  * mach_rate)
    dep_fixtures  = R(fixtures             * mach_rate)
    total_dep     = R(dep_building + dep_machinery + dep_fixtures)

    return {
        "building_gross":       building,
        "machinery_gross":      machinery_base,       # pre-contingency subtotal
        "pm_with_contingency":  pm_with_contingency,  # BUG 5 — used for gross block & V10 check
        "fixtures_gross":       fixtures,
        "gross_block":          R(building + pm_with_contingency + fixtures),
        "dep_building_slm":     dep_building,
        "dep_machinery_slm":    dep_machinery,
        "dep_fixtures_slm":     dep_fixtures,
        "total_per_year":       total_dep,
        "annual_dep":           total_dep,
    }
