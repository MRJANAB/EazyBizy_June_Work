import { GenericWdvInputs, GenericWdvResult, GenericWdvScheduleRow } from "@/types/depreciation";
import { validateGenericWdvInputs } from "./validation";

const round2 = (n: number) => Math.round(n * 100) / 100;

const daysBetween = (start: string, end: string) =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;

/**
 * Generic WDV — a plain mathematical reducing-balance calculator.
 * Formula: Depreciation = Opening WDV × Rate; Closing WDV = Opening WDV − Depreciation.
 * This is NOT an official Companies Act or Income Tax calculation — it exists
 * for quick estimates / non-statutory internal use. Never present its output
 * as an Income Tax WDV or a Companies Act carrying value.
 */
export function calculateGenericWdv(inputs: GenericWdvInputs): GenericWdvResult {
  const steps: string[] = [];
  const warnings: string[] = [];
  const validation = validateGenericWdvInputs(inputs);
  warnings.push(...validation.warnings);
  if (!validation.isValid) {
    return {
      basis: "generic_wdv",
      opening_wdv: inputs.opening_wdv ?? inputs.original_cost,
      depreciation_rate_pct: inputs.depreciation_rate_pct,
      full_year_depreciation: 0,
      depreciation: 0,
      closing_wdv: inputs.opening_wdv ?? inputs.original_cost,
      residual_value_floor: inputs.residual_value || 0,
      is_fully_depreciated: false,
      calculation_steps: [`Validation failed: ${validation.errors.join("; ")}`],
      warnings,
    };
  }

  const openingWdv = inputs.opening_wdv ?? inputs.original_cost;
  const rate = inputs.depreciation_rate_pct / 100;
  const residualFloor = inputs.residual_value || 0;

  const fullYearDepreciation = round2(openingWdv * rate);
  steps.push(`Opening WDV ₹${openingWdv.toLocaleString("en-IN")} × Rate ${inputs.depreciation_rate_pct}% = ₹${fullYearDepreciation.toLocaleString("en-IN")}`);

  let depreciation = fullYearDepreciation;
  let daysUsed: number | undefined;
  let daysInYear: number | undefined;

  if (inputs.partial_year_depreciation && inputs.start_date && inputs.end_date) {
    daysInYear = daysBetween(inputs.start_date, inputs.end_date);
    // If a distinct "asset available" date isn't tracked separately here, the
    // partial period is the full start_date-to-end_date span supplied by the
    // caller (e.g. asset put to use mid-way through the FY).
    daysUsed = daysInYear;
    depreciation = round2(fullYearDepreciation * (daysUsed / 365));
    steps.push(`Partial-year adjustment: ₹${fullYearDepreciation.toLocaleString("en-IN")} × ${daysUsed}/365 days = ₹${depreciation.toLocaleString("en-IN")}`);
  }

  const maxAllowed = Math.max(openingWdv - residualFloor, 0);
  if (depreciation > maxAllowed) {
    steps.push(`Depreciation capped at ₹${maxAllowed.toLocaleString("en-IN")} to prevent WDV falling below the residual value floor ₹${residualFloor.toLocaleString("en-IN")}`);
    depreciation = maxAllowed;
  }

  const closingWdv = round2(openingWdv - depreciation);
  steps.push(`Closing WDV = ₹${openingWdv.toLocaleString("en-IN")} − ₹${depreciation.toLocaleString("en-IN")} = ₹${closingWdv.toLocaleString("en-IN")}`);

  return {
    basis: "generic_wdv",
    opening_wdv: openingWdv,
    depreciation_rate_pct: inputs.depreciation_rate_pct,
    days_used: daysUsed,
    days_in_year: daysInYear,
    full_year_depreciation: fullYearDepreciation,
    depreciation,
    closing_wdv: closingWdv,
    residual_value_floor: residualFloor,
    is_fully_depreciated: closingWdv <= residualFloor + 0.01,
    calculation_steps: steps,
    warnings,
  };
}

/** Year-by-year Generic WDV schedule — each year's closing WDV becomes the next year's opening WDV. */
export function buildGenericWdvSchedule(
  inputs: GenericWdvInputs,
  numberOfYears: number,
): GenericWdvScheduleRow[] {
  const rows: GenericWdvScheduleRow[] = [];
  let opening = inputs.opening_wdv ?? inputs.original_cost;
  let accumulated = 0;
  const [startYear] = inputs.financial_year.split("-");
  let fyYear = parseInt(startYear, 10);

  for (let i = 0; i < numberOfYears; i++) {
    const fyLabel = `${fyYear}-${String((fyYear + 1) % 100).padStart(2, "0")}`;
    const result = calculateGenericWdv({
      ...inputs,
      financial_year: fyLabel,
      opening_wdv: opening,
      partial_year_depreciation: i === 0 ? inputs.partial_year_depreciation : false,
    });
    accumulated = round2(accumulated + result.depreciation);
    rows.push({
      financial_year: fyLabel,
      opening_wdv: opening,
      rate_pct: inputs.depreciation_rate_pct,
      depreciation: result.depreciation,
      accumulated_depreciation: accumulated,
      closing_wdv: result.closing_wdv,
    });
    opening = result.closing_wdv;
    fyYear += 1;
    if (result.is_fully_depreciated) break;
  }
  return rows;
}
