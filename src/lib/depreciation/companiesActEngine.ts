import { CompaniesActInputs, CompaniesActResult, CompaniesActScheduleRow } from "@/types/depreciation";
import { validateCompaniesActInputs } from "./validation";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Indian financial year "2026-27" -> [start, end] as Date objects (Apr 1 - Mar 31). */
function fyBounds(financialYear: string): [Date, Date] {
  const startYear = parseInt(financialYear.slice(0, 4), 10);
  const start = new Date(startYear, 3, 1); // April 1
  const end = new Date(startYear + 1, 2, 31); // March 31 next year
  return [start, end];
}

function daysInFy(financialYear: string): number {
  const [start, end] = fyBounds(financialYear);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

/** Days the asset was actually available for use within this FY (for pro-rata). */
function proRataDays(financialYear: string, dateAvailableForUse?: string): number | null {
  if (!dateAvailableForUse) return null;
  const availableFrom = new Date(dateAvailableForUse);
  if (Number.isNaN(availableFrom.getTime())) return null;
  const [fyStart, fyEnd] = fyBounds(financialYear);
  if (availableFrom <= fyStart) return null; // asset was already in use before this FY — full year applies
  if (availableFrom > fyEnd) return 0; // not yet available this FY
  return Math.round((fyEnd.getTime() - availableFrom.getTime()) / 86_400_000) + 1;
}

/**
 * Companies Act / Accounting depreciation for ONE financial year.
 *
 * This is intentionally stateless per-year: to build a multi-year schedule,
 * the caller feeds this year's opening_carrying_amount / opening_accumulated
 * depreciation / remaining useful life back in as next year's inputs (see
 * buildCompaniesActSchedule below). Nothing here assumes Companies Act rate
 * equals the Income Tax rate — they are computed by entirely separate engines.
 */
export function calculateCompaniesActDepreciation(
  inputs: CompaniesActInputs,
  cost: number,
): CompaniesActResult {
  const steps: string[] = [];
  const warnings: string[] = [];
  const validation = validateCompaniesActInputs(inputs, cost);
  warnings.push(...validation.warnings);
  if (!validation.isValid) {
    return {
      basis: "companies_act",
      method: inputs.method,
      gross_block: cost,
      residual_value: 0,
      useful_life_years: 0,
      remaining_useful_life_years: 0,
      opening_accumulated_depreciation: inputs.opening_accumulated_depreciation || 0,
      opening_carrying_amount: inputs.opening_carrying_amount ?? cost,
      current_year_depreciation: 0,
      closing_accumulated_depreciation: inputs.opening_accumulated_depreciation || 0,
      closing_carrying_amount: inputs.opening_carrying_amount ?? cost,
      pro_rata_applied: false,
      is_fully_depreciated: false,
      calculation_steps: [`Validation failed: ${validation.errors.join("; ")}`],
      warnings,
    };
  }

  const usefulLifeYears = inputs.change_in_useful_life ?? (
    inputs.useful_life_unit === "months" ? inputs.useful_life / 12 : inputs.useful_life
  );

  let residualValue = inputs.change_in_residual_value ?? inputs.residual_value;
  if (residualValue === undefined || residualValue === null) {
    if (inputs.residual_value_pct) {
      residualValue = (cost * inputs.residual_value_pct) / 100;
      steps.push(`Residual value = ${inputs.residual_value_pct}% of Cost ₹${cost.toLocaleString("en-IN")} = ₹${round2(residualValue).toLocaleString("en-IN")}`);
    } else {
      residualValue = 0;
      warnings.push("Residual value not provided — assumed ₹0. Verify against your accounting policy (Schedule II guidance is typically not more than 5% of cost).");
    }
  }

  const openingCarryingAmount = inputs.opening_carrying_amount ?? cost;
  const openingAccumulatedDep = inputs.opening_accumulated_depreciation ?? 0;
  const depreciableAmount = Math.max(cost - residualValue, 0);

  const days = proRataDays(inputs.financial_year, inputs.date_available_for_use);
  const fyDays = daysInFy(inputs.financial_year);
  const proRataApplied = days !== null && days < fyDays;
  const proRataFraction = proRataApplied ? (days as number) / fyDays : 1;

  let fullYearDepreciation = 0;

  if (inputs.method === "SLM") {
    fullYearDepreciation = usefulLifeYears > 0 ? depreciableAmount / usefulLifeYears : 0;
    steps.push(`Depreciable Amount = Cost ₹${cost.toLocaleString("en-IN")} − Residual Value ₹${round2(residualValue).toLocaleString("en-IN")} = ₹${round2(depreciableAmount).toLocaleString("en-IN")}`);
    steps.push(`SLM Annual Depreciation = Depreciable Amount ÷ Useful Life ${usefulLifeYears} yrs = ₹${round2(fullYearDepreciation).toLocaleString("en-IN")}`);
  } else if (inputs.method === "WDV") {
    let rate: number;
    if (residualValue > 0 && cost > 0 && usefulLifeYears > 0) {
      rate = 1 - Math.pow(residualValue / cost, 1 / usefulLifeYears);
      steps.push(`WDV Rate (Schedule II formula) = 1 − (Residual ₹${round2(residualValue).toLocaleString("en-IN")} / Cost ₹${cost.toLocaleString("en-IN")})^(1/${usefulLifeYears}) = ${(rate * 100).toFixed(2)}%`);
    } else {
      rate = inputs.other_method_rate_pct ? inputs.other_method_rate_pct / 100 : 0;
      warnings.push("Residual value is ₹0 or useful life is 0 — the Schedule II WDV-rate formula cannot be derived. Using the configured accounting-policy rate instead; verify with your accounting policy.");
      steps.push(`WDV Rate (configured accounting policy, formula not derivable) = ${(rate * 100).toFixed(2)}%`);
    }
    fullYearDepreciation = openingCarryingAmount * rate;
    steps.push(`Annual Depreciation = Opening Carrying Amount ₹${round2(openingCarryingAmount).toLocaleString("en-IN")} × ${(rate * 100).toFixed(2)}% = ₹${round2(fullYearDepreciation).toLocaleString("en-IN")}`);
  } else {
    const rate = (inputs.other_method_rate_pct || 0) / 100;
    fullYearDepreciation = openingCarryingAmount * rate;
    steps.push(`Other (configured) method: Opening Carrying Amount × ${(rate * 100).toFixed(2)}% = ₹${round2(fullYearDepreciation).toLocaleString("en-IN")}`);
  }

  let currentYearDepreciation = fullYearDepreciation;
  if (proRataApplied) {
    currentYearDepreciation = fullYearDepreciation * proRataFraction;
    steps.push(`Pro-rata for ${days} of ${fyDays} days available for use this FY: ₹${round2(fullYearDepreciation).toLocaleString("en-IN")} × ${days}/${fyDays} = ₹${round2(currentYearDepreciation).toLocaleString("en-IN")}`);
  }

  // Never depreciate below the residual value.
  const maxAllowedDepreciation = Math.max(openingCarryingAmount - residualValue, 0);
  if (currentYearDepreciation > maxAllowedDepreciation) {
    steps.push(`Depreciation capped at ₹${round2(maxAllowedDepreciation).toLocaleString("en-IN")} to avoid carrying value falling below residual value ₹${round2(residualValue).toLocaleString("en-IN")}`);
    currentYearDepreciation = maxAllowedDepreciation;
  }

  const closingCarryingAmount = round2(openingCarryingAmount - currentYearDepreciation);
  const closingAccumulatedDep = round2(openingAccumulatedDep + currentYearDepreciation);
  const remainingUsefulLife = Math.max(usefulLifeYears - (proRataApplied ? proRataFraction : 1), 0);

  return {
    basis: "companies_act",
    method: inputs.method,
    gross_block: cost,
    residual_value: round2(residualValue),
    useful_life_years: round2(usefulLifeYears),
    remaining_useful_life_years: round2(remainingUsefulLife),
    opening_accumulated_depreciation: round2(openingAccumulatedDep),
    opening_carrying_amount: round2(openingCarryingAmount),
    current_year_depreciation: round2(currentYearDepreciation),
    closing_accumulated_depreciation: closingAccumulatedDep,
    closing_carrying_amount: closingCarryingAmount,
    pro_rata_days: proRataApplied ? (days as number) : undefined,
    pro_rata_applied: proRataApplied,
    is_fully_depreciated: closingCarryingAmount <= residualValue + 0.01,
    calculation_steps: steps,
    warnings,
  };
}

/** Build a year-by-year Companies Act schedule across the asset's useful life. */
export function buildCompaniesActSchedule(
  inputs: CompaniesActInputs,
  cost: number,
  numberOfYears: number,
): CompaniesActScheduleRow[] {
  const rows: CompaniesActScheduleRow[] = [];
  let openingCarrying = inputs.opening_carrying_amount ?? cost;
  let openingAccDep = inputs.opening_accumulated_depreciation ?? 0;
  let remainingLife = inputs.useful_life_unit === "months" ? inputs.useful_life / 12 : inputs.useful_life;
  const [startYear] = inputs.financial_year.split("-");
  let fyYear = parseInt(startYear, 10);

  for (let i = 0; i < numberOfYears; i++) {
    const fyLabel = `${fyYear}-${String((fyYear + 1) % 100).padStart(2, "0")}`;
    const yearInputs: CompaniesActInputs = {
      ...inputs,
      financial_year: fyLabel,
      opening_carrying_amount: openingCarrying,
      opening_accumulated_depreciation: openingAccDep,
      change_in_useful_life: remainingLife,
      // Pro-rata only applies in the very first year of the schedule.
      date_available_for_use: i === 0 ? inputs.date_available_for_use : undefined,
    };
    const result = calculateCompaniesActDepreciation(yearInputs, cost);
    rows.push({
      financial_year: fyLabel,
      gross_block: cost,
      opening_accumulated_depreciation: result.opening_accumulated_depreciation,
      current_depreciation: result.current_year_depreciation,
      closing_accumulated_depreciation: result.closing_accumulated_depreciation,
      net_book_value: result.closing_carrying_amount,
    });
    openingCarrying = result.closing_carrying_amount;
    openingAccDep = result.closing_accumulated_depreciation;
    remainingLife = Math.max(remainingLife - 1, 0);
    fyYear += 1;
    if (result.is_fully_depreciated) break;
  }
  return rows;
}
