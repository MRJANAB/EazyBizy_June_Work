import { GTABFormData } from "@/types/gtab";

/**
 * WDV (Written Down Value / reducing-balance) depreciation — mirrors
 * backend/calculations/depreciation.py exactly, so the schedule shown to the
 * customer in the wizard is IDENTICAL to what the generated PDF report
 * shows. No SLM anywhere: each year's depreciation = opening WDV × rate,
 * closing WDV = opening − depreciation, carried forward as next year's
 * opening. Building and Machinery+Fixtures are tracked as separate pools
 * (each can have its own rate), matching the backend.
 *
 * Every input here is auto-derived from what the customer already entered
 * earlier in the wizard (Capital Expenditure costs, Financial Assumptions
 * rates) — there is nothing new to fill in on this step.
 */

// Matches backend/core/engine.py's R(val, decimals=0) EXACTLY — every call
// in backend/calculations/depreciation.py uses the default (0 decimals,
// i.e. whole rupees), rounding at EVERY step, not just the final display
// value. Rounding to 2 decimals here instead compounds a real divergence
// by Year 4-5 (each year's opening balance is the previous year's ROUNDED
// closing balance) — confirmed by a side-by-side Python/Node run.
const Rs = (n: number) => Math.round(n);

export interface WdvScheduleYear {
  year: number;
  openingWdv: number;
  buildingOpeningWdv: number;
  buildingDepreciation: number;
  buildingClosingWdv: number;
  machineryOpeningWdv: number;
  machineryDepreciation: number;
  machineryClosingWdv: number;
  depreciation: number;
  closingWdv: number;
}

export interface WdvDepreciationResult {
  buildingGross: number;
  machineryGross: number;
  pmWithContingency: number;
  fixturesGross: number;
  grossBlock: number;
  buildingRatePct: number;
  machineryRatePct: number;
  contingencyPct: number;
  schedule: WdvScheduleYear[];
}

export function buildWdvDepreciationSchedule(formData: GTABFormData): WdvDepreciationResult {
  const building = Number(formData.shed_building_cost || 0);
  const machineryBase =
    (formData.plant_machinery || []).reduce((sum, item) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_cost || item.cost || 0);
      return sum + quantity * unitPrice;
    }, 0) + Number(formData.machinery_installation_cost || 0);
  const fixtures =
    Number(formData.computers_cost || 0) +
    Number(formData.furniture_cost || 0) +
    Number(formData.electrification_cost || 0) +
    Number(formData.racks_storage_cost || 0) +
    Number(formData.transportation_cost || 0);

  const pri = formData.project_report_inputs;
  const contingencyPct = Number(pri?.dpr?.contingency_pct || 0);
  const machineryRatePct = Number(pri?.revenue?.depreciation_pct || 10);
  const buildingRatePct = Number(pri?.dpr?.building_dep_rate_pct || 5);

  const pmWithContingency = Rs(machineryBase * (1 + contingencyPct / 100));
  const machineryPoolOpening0 = Rs(pmWithContingency + fixtures);
  const buildingPoolOpening0 = building;

  const mach_rate = machineryRatePct / 100;
  const bldg_rate = buildingRatePct / 100;

  const schedule: WdvScheduleYear[] = [];
  let bldOpening = buildingPoolOpening0;
  let machOpening = machineryPoolOpening0;
  for (let year = 1; year <= 5; year++) {
    const bldDep = Rs(bldOpening * bldg_rate);
    const machDep = Rs(machOpening * mach_rate);
    const bldClosing = Rs(Math.max(bldOpening - bldDep, 0));
    const machClosing = Rs(Math.max(machOpening - machDep, 0));
    schedule.push({
      year,
      openingWdv: Rs(bldOpening + machOpening),
      buildingOpeningWdv: bldOpening,
      buildingDepreciation: bldDep,
      buildingClosingWdv: bldClosing,
      machineryOpeningWdv: machOpening,
      machineryDepreciation: machDep,
      machineryClosingWdv: machClosing,
      depreciation: Rs(bldDep + machDep),
      closingWdv: Rs(bldClosing + machClosing),
    });
    bldOpening = bldClosing;
    machOpening = machClosing;
  }

  return {
    buildingGross: building,
    machineryGross: machineryBase,
    pmWithContingency,
    fixturesGross: fixtures,
    grossBlock: Rs(building + pmWithContingency + fixtures),
    buildingRatePct,
    machineryRatePct,
    contingencyPct,
    schedule,
  };
}
