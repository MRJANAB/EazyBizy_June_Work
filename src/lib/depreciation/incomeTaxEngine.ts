import { IncomeTaxBlockInputs, IncomeTaxBlockResult, IncomeTaxScheduleRow, Under180DaysTreatment } from "@/types/depreciation";
import { validateIncomeTaxInputs } from "./validation";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Income Tax (Block of Assets) depreciation for ONE assessment/financial year.
 *
 * Deliberately does NOT calculate Original Cost × Rate for a single asset —
 * Indian income tax depreciation is computed on the BLOCK's WDV, which may
 * hold many assets of the same rate class. Disposal proceeds reduce the
 * block's full-rate (opening + long-use additions) pool first, and only spill
 * into the half-rate (<180-day additions) pool if they exceed it — this is
 * the standard treatment and avoids ever going negative silently.
 */
export function calculateIncomeTaxDepreciation(
  inputs: IncomeTaxBlockInputs,
  lt180Treatment: Under180DaysTreatment = "half_rate",
): IncomeTaxBlockResult {
  const steps: string[] = [];
  const warnings: string[] = [];
  const validation = validateIncomeTaxInputs(inputs);
  warnings.push(...validation.warnings);
  if (!validation.isValid) {
    return {
      basis: "income_tax",
      block_name: inputs.block_name,
      applicable_rate_pct: inputs.applicable_rate_pct,
      opening_wdv: inputs.opening_wdv_of_block,
      additions_lt_180_days: inputs.additions_lt_180_days,
      additions_gte_180_days: inputs.additions_gte_180_days,
      disposal_adjustment: inputs.disposal_sale_consideration,
      relevant_block_amount: 0,
      full_rate_base: 0,
      half_rate_base: 0,
      full_depreciation: 0,
      restricted_depreciation: 0,
      total_depreciation: 0,
      closing_wdv: inputs.opening_wdv_of_block,
      block_ceased: false,
      calculation_steps: [`Validation failed: ${validation.errors.join("; ")}`],
      warnings,
    };
  }

  steps.push(
    `Opening WDV of Block ₹${inputs.opening_wdv_of_block.toLocaleString("en-IN")} + Additions (≥180 days) ₹${inputs.additions_gte_180_days.toLocaleString("en-IN")} + Additions (<180 days) ₹${inputs.additions_lt_180_days.toLocaleString("en-IN")} − Disposal Proceeds ₹${inputs.disposal_sale_consideration.toLocaleString("en-IN")}`,
  );

  let fullRatePool = inputs.opening_wdv_of_block + inputs.additions_gte_180_days;
  let halfRatePool = inputs.additions_lt_180_days;
  let disposalRemaining = inputs.disposal_sale_consideration;

  const disposalFromFull = Math.min(disposalRemaining, fullRatePool);
  fullRatePool -= disposalFromFull;
  disposalRemaining -= disposalFromFull;
  if (disposalFromFull > 0) {
    steps.push(`Disposal proceeds first reduce the full-rate pool (Opening WDV + additions used ≥180 days): −₹${round2(disposalFromFull).toLocaleString("en-IN")}`);
  }

  const disposalFromHalf = Math.min(disposalRemaining, halfRatePool);
  halfRatePool -= disposalFromHalf;
  disposalRemaining -= disposalFromHalf;
  if (disposalFromHalf > 0) {
    steps.push(`Remaining disposal proceeds reduce the <180-day additions pool: −₹${round2(disposalFromHalf).toLocaleString("en-IN")}`);
  }

  const relevantBlockAmount = round2(fullRatePool + halfRatePool);
  const blockCeased = inputs.block_ceases_to_exist === true || (relevantBlockAmount <= 0 && disposalRemaining > 0);

  if (blockCeased) {
    const shortTermCapitalGainLoss = round2(disposalRemaining - relevantBlockAmount);
    steps.push(
      relevantBlockAmount < 0 || disposalRemaining > 0
        ? `Disposal proceeds exceed the block's total WDV + additions — the block ceases to exist. No depreciation is allowed this year. Short-term capital gain = ₹${shortTermCapitalGainLoss.toLocaleString("en-IN")}.`
        : `All assets in the block were disposed of / discarded this year — no depreciation is allowed. Block WDV written off = ₹${relevantBlockAmount.toLocaleString("en-IN")}.`,
    );
    return {
      basis: "income_tax",
      block_name: inputs.block_name,
      applicable_rate_pct: inputs.applicable_rate_pct,
      opening_wdv: inputs.opening_wdv_of_block,
      additions_lt_180_days: inputs.additions_lt_180_days,
      additions_gte_180_days: inputs.additions_gte_180_days,
      disposal_adjustment: inputs.disposal_sale_consideration,
      relevant_block_amount: Math.max(relevantBlockAmount, 0),
      full_rate_base: 0,
      half_rate_base: 0,
      full_depreciation: 0,
      restricted_depreciation: 0,
      total_depreciation: 0,
      closing_wdv: 0,
      block_ceased: true,
      short_term_capital_gain_loss: shortTermCapitalGainLoss,
      calculation_steps: steps,
      warnings,
    };
  }

  const rate = inputs.applicable_rate_pct / 100;
  const fullDepreciation = round2(fullRatePool * rate);
  steps.push(`Full-rate depreciation = ₹${round2(fullRatePool).toLocaleString("en-IN")} × ${inputs.applicable_rate_pct}% = ₹${fullDepreciation.toLocaleString("en-IN")}`);

  let restrictedDepreciation = 0;
  if (lt180Treatment === "half_rate") {
    restrictedDepreciation = round2(halfRatePool * rate * 0.5);
    steps.push(`<180-day additions depreciated at HALF the normal rate (Sec. 32 proviso): ₹${round2(halfRatePool).toLocaleString("en-IN")} × ${(inputs.applicable_rate_pct / 2).toFixed(2)}% = ₹${restrictedDepreciation.toLocaleString("en-IN")}`);
  } else if (lt180Treatment === "full_rate") {
    restrictedDepreciation = round2(halfRatePool * rate);
    steps.push(`<180-day additions depreciated at the FULL rate per configured rule override: ₹${round2(halfRatePool).toLocaleString("en-IN")} × ${inputs.applicable_rate_pct}% = ₹${restrictedDepreciation.toLocaleString("en-IN")}`);
  } else {
    restrictedDepreciation = 0;
    steps.push(`<180-day additions: no depreciation allowed per configured rule override.`);
  }

  const totalDepreciation = round2(fullDepreciation + restrictedDepreciation);
  const closingWdv = round2(relevantBlockAmount - totalDepreciation);
  steps.push(`Total Depreciation = ₹${fullDepreciation.toLocaleString("en-IN")} + ₹${restrictedDepreciation.toLocaleString("en-IN")} = ₹${totalDepreciation.toLocaleString("en-IN")}`);
  steps.push(`Closing WDV = ₹${relevantBlockAmount.toLocaleString("en-IN")} − ₹${totalDepreciation.toLocaleString("en-IN")} = ₹${closingWdv.toLocaleString("en-IN")}`);

  return {
    basis: "income_tax",
    block_name: inputs.block_name,
    applicable_rate_pct: inputs.applicable_rate_pct,
    opening_wdv: inputs.opening_wdv_of_block,
    additions_lt_180_days: inputs.additions_lt_180_days,
    additions_gte_180_days: inputs.additions_gte_180_days,
    disposal_adjustment: inputs.disposal_sale_consideration,
    relevant_block_amount: relevantBlockAmount,
    full_rate_base: round2(fullRatePool),
    half_rate_base: round2(halfRatePool),
    full_depreciation: fullDepreciation,
    restricted_depreciation: restrictedDepreciation,
    total_depreciation: totalDepreciation,
    closing_wdv: closingWdv,
    block_ceased: false,
    calculation_steps: steps,
    warnings,
  };
}

/** Build a year-by-year Income Tax block schedule (no new additions/disposals assumed after year 1 unless supplied). */
export function buildIncomeTaxSchedule(
  inputs: IncomeTaxBlockInputs,
  lt180Treatment: Under180DaysTreatment,
  numberOfYears: number,
  futureYears?: Partial<IncomeTaxBlockInputs>[],
): IncomeTaxScheduleRow[] {
  const rows: IncomeTaxScheduleRow[] = [];
  let openingWdv = inputs.opening_wdv_of_block;
  const [startYear] = inputs.financial_year.split("-");
  let fyYear = parseInt(startYear, 10);

  for (let i = 0; i < numberOfYears; i++) {
    const fyLabel = `${fyYear}-${String((fyYear + 1) % 100).padStart(2, "0")}`;
    const override = futureYears?.[i] ?? {};
    const yearInputs: IncomeTaxBlockInputs = {
      ...inputs,
      ...override,
      financial_year: fyLabel,
      opening_wdv_of_block: openingWdv,
      additions_lt_180_days: i === 0 ? inputs.additions_lt_180_days : (override.additions_lt_180_days ?? 0),
      additions_gte_180_days: i === 0 ? inputs.additions_gte_180_days : (override.additions_gte_180_days ?? 0),
      disposal_sale_consideration: i === 0 ? inputs.disposal_sale_consideration : (override.disposal_sale_consideration ?? 0),
    };
    const result = calculateIncomeTaxDepreciation(yearInputs, lt180Treatment);
    rows.push({
      financial_year: fyLabel,
      opening_block_wdv: openingWdv,
      additions: yearInputs.additions_lt_180_days + yearInputs.additions_gte_180_days,
      disposal_adjustment: yearInputs.disposal_sale_consideration,
      rate_pct: inputs.applicable_rate_pct,
      full_depreciation: result.full_depreciation,
      restricted_depreciation: result.restricted_depreciation,
      total_depreciation: result.total_depreciation,
      closing_block_wdv: result.closing_wdv,
    });
    openingWdv = result.closing_wdv;
    fyYear += 1;
    if (result.block_ceased || openingWdv <= 0) break;
  }
  return rows;
}
