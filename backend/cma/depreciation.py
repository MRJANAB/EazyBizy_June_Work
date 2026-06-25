"""
cma/depreciation.py
===================
Written-Down-Value (WDV / reducing-balance) depreciation schedule.

The depreciation rates supplied to the CMA engine (building 5%, plant 10%,
computers 40%, vehicles 15% ...) are Income-Tax / WDV rates. They MUST be
applied on the reducing written-down value each year, not flat on original
cost — otherwise a 40% rate would write off 200% of an asset over 5 years.

Each year:  depreciation = opening_WDV x rate ; closing_WDV = opening - dep.

Land is never depreciated (excluded here). Electrical fittings and the
generator are left at cost in the balance sheet (no rate key supplied) — a
small, conservative simplification noted for future refinement.
"""

from typing import List, Dict, Any
from .intake_mapper import CMAIntake

_DEFAULT_RATES = {
    "building": 5.0, "plant_machinery": 10.0, "furniture": 10.0,
    "vehicles": 15.0, "computers": 40.0, "office_equipment": 10.0,
}


def calculate_depreciation_schedule(intake: CMAIntake, years: int = 5) -> List[Dict[str, Any]]:
    """Return per-year WDV depreciation summary across all depreciable classes."""
    rates = intake.depreciation_rates if isinstance(intake.depreciation_rates, dict) else _DEFAULT_RATES

    # Opening cost (gross block) per depreciable class.
    pc = intake.project_cost
    wdv = {
        "building":         pc.building,
        "plant_machinery":  pc.plant_machinery,
        "furniture":        pc.furniture,
        "computers":        pc.computers,
        "vehicles":         pc.vehicles,
        "office_equipment": pc.office_equipment,
    }
    gross_block = sum(wdv.values())

    schedule = []
    accumulated = 0.0
    for y in range(1, years + 1):
        year_dep = 0.0
        for cls, opening in wdv.items():
            rate = rates.get(cls, _DEFAULT_RATES.get(cls, 0.0)) / 100.0
            dep = opening * rate
            wdv[cls] = opening - dep      # carry forward written-down value
            year_dep += dep
        accumulated += year_dep
        schedule.append({
            "year":          y,
            "depreciation":  round(year_dep, 2),
            "accumulated":   round(accumulated, 2),
            "closing_wdv":   round(sum(wdv.values()), 2),
            "gross_block":   round(gross_block, 2),
        })

    return schedule


# Display labels for the Depreciation Chart (CMA sheet).
_CLASS_LABELS = [
    ("land",             "Land",                 0.0),
    ("building",         "Building",             5.0),
    ("furniture",        "Furniture & Fixtures", 10.0),
    ("plant_machinery",  "Plant & Machinery",    10.0),
    ("computers",        "Computers",            40.0),
    ("vehicles",         "Vehicles",             15.0),
    ("office_equipment", "Office Equipment",     10.0),
]


def calculate_depreciation_by_class(intake: CMAIntake, years: int = 5) -> Dict[str, Any]:
    """
    Per-asset-class WDV schedule for the CMA Depreciation Chart.

    For each class returns opening (written-down) value, depreciation and
    closing WDV per year, plus the aggregate totals row. Land carries a 0% rate
    (never depreciates).
    """
    rates = intake.depreciation_rates if isinstance(intake.depreciation_rates, dict) else _DEFAULT_RATES
    pc = intake.project_cost
    costs = {
        "land": pc.land, "building": pc.building, "furniture": pc.furniture,
        "plant_machinery": pc.plant_machinery, "computers": pc.computers,
        "vehicles": pc.vehicles, "office_equipment": pc.office_equipment,
    }

    classes = []
    for key, label, default_rate in _CLASS_LABELS:
        rate = 0.0 if key == "land" else rates.get(key, default_rate)
        opening = costs.get(key, 0.0)
        rows = []
        for _ in range(years):
            dep = opening * rate / 100.0
            wdv = opening - dep
            rows.append({
                "opening": round(opening, 2),
                "depreciation": round(dep, 2),
                "wdv": round(wdv, 2),
            })
            opening = wdv
        classes.append({"name": label, "rate": rate, "years": rows})

    totals = {"opening": [], "depreciation": [], "wdv": []}
    for y in range(years):
        totals["opening"].append(round(sum(c["years"][y]["opening"] for c in classes), 2))
        totals["depreciation"].append(round(sum(c["years"][y]["depreciation"] for c in classes), 2))
        totals["wdv"].append(round(sum(c["years"][y]["wdv"] for c in classes), 2))

    return {"classes": classes, "totals": totals}
