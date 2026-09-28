import { GTABFormData } from "@/types/gtab";

/**
 * WDV (Written Down Value / reducing-balance) depreciation — mirrors
 * backend/calculations/depreciation.py exactly, so the schedule shown to the
 * customer in the wizard is IDENTICAL to what the generated PDF report
 * shows. No SLM anywhere: each year's depreciation = opening WDV × rate,
 * closing WDV = opening − depreciation, carried forward as next year's
 * opening.
 *
 * CA AUDIT: computers, furniture/racks and vehicles used to be pooled into
 * Plant & Machinery and depreciated at the SAME machinery rate — but each is
 * its own Income-Tax-Act block of assets with a materially different
 * statutory WDV rate (Computers ~40%, Furniture ~10%, P&M ~15%, Motor
 * Vehicles ~15%). Five pools now, matching the backend exactly:
 *   Building                              -> buildingRatePct
 *   Plant & Machinery (+ contingency)      -> machineryRatePct
 *   Furniture & Fixtures + Racks/Storage + Electrification -> furnitureRatePct
 *   Computers & IT Equipment               -> computersRatePct
 *   Vehicles & Transportation              -> vehicleRatePct
 * Electrification is grouped with Furniture & Fixtures (not Plant &
 * Machinery) — this matches the fixed project cost's own "fixtures"
 * grouping, so contingency (applied to P&M only) keeps applying to the
 * identical base it always did.
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
  furnitureOpeningWdv: number;
  furnitureDepreciation: number;
  furnitureClosingWdv: number;
  computersOpeningWdv: number;
  computersDepreciation: number;
  computersClosingWdv: number;
  vehiclesOpeningWdv: number;
  vehiclesDepreciation: number;
  vehiclesClosingWdv: number;
  depreciation: number;
  closingWdv: number;
}

export interface WdvDepreciationResult {
  buildingGross: number;
  machineryGross: number;
  pmWithContingency: number;
  fixturesGross: number;
  furnitureGross: number;
  computersGross: number;
  vehicleGross: number;
  grossBlock: number;
  buildingRatePct: number;
  machineryRatePct: number;
  furnitureRatePct: number;
  computersRatePct: number;
  vehicleRatePct: number;
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

  const furnitureGross = Rs(
    Number(formData.furniture_cost || 0) +
    Number(formData.racks_storage_cost || 0) +
    Number(formData.electrification_cost || 0)
  );
  const computersGross = Rs(Number(formData.computers_cost || 0));
  const vehicleGross   = Rs(Number(formData.transportation_cost || 0));
  const fixturesGross  = Rs(furnitureGross + computersGross + vehicleGross);

  const pri = formData.project_report_inputs;
  const contingencyPct   = Number(pri?.dpr?.contingency_pct || 0);
  const machineryRatePct  = Number(pri?.revenue?.depreciation_pct || 10);
  const buildingRatePct   = Number(pri?.dpr?.building_dep_rate_pct || 5);
  const furnitureRatePct  = Number(pri?.dpr?.furniture_dep_rate_pct || 10);
  const computersRatePct  = Number(pri?.dpr?.computers_dep_rate_pct || 40);
  const vehicleRatePct    = Number(pri?.dpr?.vehicle_dep_rate_pct || 15);

  const pmWithContingency = Rs(machineryBase * (1 + contingencyPct / 100));

  const bldg_rate = buildingRatePct / 100;
  const mach_rate = machineryRatePct / 100;
  const furn_rate = furnitureRatePct / 100;
  const comp_rate = computersRatePct / 100;
  const veh_rate  = vehicleRatePct / 100;

  const schedule: WdvScheduleYear[] = [];
  let bldOpening  = building;
  let machOpening = pmWithContingency;
  let furnOpening = furnitureGross;
  let compOpening = computersGross;
  let vehOpening  = vehicleGross;
  for (let year = 1; year <= 5; year++) {
    const bldDep  = Rs(bldOpening  * bldg_rate);
    const machDep = Rs(machOpening * mach_rate);
    const furnDep = Rs(furnOpening * furn_rate);
    const compDep = Rs(compOpening * comp_rate);
    const vehDep  = Rs(vehOpening  * veh_rate);

    const bldClosing  = Rs(Math.max(bldOpening  - bldDep,  0));
    const machClosing = Rs(Math.max(machOpening - machDep, 0));
    const furnClosing = Rs(Math.max(furnOpening - furnDep, 0));
    const compClosing = Rs(Math.max(compOpening - compDep, 0));
    const vehClosing  = Rs(Math.max(vehOpening  - vehDep,  0));

    const totalDep     = Rs(bldDep + machDep + furnDep + compDep + vehDep);
    const totalOpening = Rs(bldOpening + machOpening + furnOpening + compOpening + vehOpening);
    const totalClosing = Rs(bldClosing + machClosing + furnClosing + compClosing + vehClosing);

    schedule.push({
      year,
      openingWdv: totalOpening,
      buildingOpeningWdv: bldOpening,
      buildingDepreciation: bldDep,
      buildingClosingWdv: bldClosing,
      machineryOpeningWdv: machOpening,
      machineryDepreciation: machDep,
      machineryClosingWdv: machClosing,
      furnitureOpeningWdv: furnOpening,
      furnitureDepreciation: furnDep,
      furnitureClosingWdv: furnClosing,
      computersOpeningWdv: compOpening,
      computersDepreciation: compDep,
      computersClosingWdv: compClosing,
      vehiclesOpeningWdv: vehOpening,
      vehiclesDepreciation: vehDep,
      vehiclesClosingWdv: vehClosing,
      depreciation: totalDep,
      closingWdv: totalClosing,
    });
    bldOpening = bldClosing;
    machOpening = machClosing;
    furnOpening = furnClosing;
    compOpening = compClosing;
    vehOpening = vehClosing;
  }

  return {
    buildingGross: building,
    machineryGross: machineryBase,
    pmWithContingency,
    fixturesGross,
    furnitureGross,
    computersGross,
    vehicleGross,
    grossBlock: Rs(building + pmWithContingency + fixturesGross),
    buildingRatePct,
    machineryRatePct,
    furnitureRatePct,
    computersRatePct,
    vehicleRatePct,
    contingencyPct,
    schedule,
  };
}
