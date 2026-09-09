import { CompaniesActInputs, GenericWdvInputs, IncomeTaxBlockInputs } from "@/types/depreciation";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

const ok = (errors: string[], warnings: string[]): ValidationResult => ({
  errors,
  warnings,
  isValid: errors.length === 0,
});

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// ── Common (asset-master level) validations ─────────────────────────────────

export function validateAssetCommon(params: {
  original_cost: number;
  acquisition_date?: string;
  date_put_to_use?: string;
  disposal_date?: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (params.original_cost < 0) {
    errors.push("Original cost cannot be negative.");
  }

  const acquisition = parseDate(params.acquisition_date);
  const putToUse = parseDate(params.date_put_to_use);
  const disposal = parseDate(params.disposal_date);

  if (params.acquisition_date && !acquisition) errors.push("Acquisition date is invalid.");
  if (params.date_put_to_use && !putToUse) errors.push("Date put to use is invalid.");
  if (params.disposal_date && !disposal) errors.push("Disposal date is invalid.");

  if (acquisition && putToUse && putToUse < acquisition) {
    errors.push("Date put to use cannot precede the acquisition date.");
  }
  if (acquisition && disposal && disposal < acquisition) {
    errors.push("Disposal date cannot precede the acquisition date.");
  }

  return ok(errors, warnings);
}

// ── Companies Act validations ────────────────────────────────────────────────

export function validateCompaniesActInputs(
  inputs: CompaniesActInputs,
  cost: number,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!inputs.useful_life || inputs.useful_life <= 0) {
    errors.push("Useful life must be a positive number.");
  }

  const residual =
    inputs.residual_value ??
    (inputs.residual_value_pct ? (cost * inputs.residual_value_pct) / 100 : 0);
  if (residual < 0) {
    errors.push("Residual value cannot be negative.");
  }
  if (residual > cost) {
    errors.push("Residual value cannot exceed the original cost.");
  }

  if (!inputs.method) {
    errors.push("A depreciation method (SLM / WDV / Other) must be selected.");
  }
  if (inputs.method === "OTHER" && !inputs.other_method_rate_pct) {
    errors.push("An accounting policy rate must be configured when using the 'Other' method.");
  }

  if (!inputs.financial_year) {
    errors.push("Financial Year is required.");
  }

  if (!inputs.useful_life_unit) {
    warnings.push("Useful life unit not set — assuming years.");
  }

  return ok(errors, warnings);
}

// ── Income Tax validations ───────────────────────────────────────────────────

export function validateIncomeTaxInputs(inputs: IncomeTaxBlockInputs): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!inputs.assessment_year) errors.push("Assessment Year is required for Income Tax depreciation.");
  if (!inputs.financial_year) errors.push("Financial Year is required.");
  if (!inputs.block_name) errors.push("Block of Assets must be specified.");
  if (inputs.applicable_rate_pct === undefined || inputs.applicable_rate_pct === null) {
    errors.push("An applicable tax depreciation rate/rule is required — it cannot be derived from cost alone.");
  }
  if (inputs.applicable_rate_pct < 0 || inputs.applicable_rate_pct > 100) {
    errors.push("Applicable tax depreciation rate must be between 0% and 100%.");
  }

  if (inputs.opening_wdv_of_block < 0) {
    errors.push("Opening WDV of block cannot be negative.");
  }
  if (inputs.additions_lt_180_days < 0 || inputs.additions_gte_180_days < 0) {
    errors.push("Additions cannot be negative.");
  }
  if (inputs.disposal_sale_consideration < 0) {
    errors.push("Disposal/sale consideration cannot be negative.");
  }

  const relevantBlock =
    inputs.opening_wdv_of_block +
    inputs.additions_lt_180_days +
    inputs.additions_gte_180_days -
    inputs.disposal_sale_consideration;
  if (relevantBlock < 0 && !inputs.block_ceases_to_exist) {
    warnings.push(
      "Disposal proceeds exceed the block's WDV plus additions — this typically triggers a short-term capital gain, not negative depreciation. Mark the block as ceased if all assets were sold.",
    );
  }

  return ok(errors, warnings);
}

// ── Generic WDV validations ──────────────────────────────────────────────────

export function validateGenericWdvInputs(inputs: GenericWdvInputs): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (inputs.depreciation_rate_pct === undefined || inputs.depreciation_rate_pct === null) {
    errors.push("A depreciation rate is required for Generic WDV.");
  } else if (inputs.depreciation_rate_pct < 0 || inputs.depreciation_rate_pct > 100) {
    errors.push("Depreciation rate must be between 0% and 100%.");
  }

  const opening = inputs.opening_wdv ?? inputs.original_cost;
  if (opening < 0) errors.push("Opening WDV cannot be negative.");
  if (inputs.original_cost < 0) errors.push("Original cost cannot be negative.");
  if (inputs.residual_value !== undefined && inputs.residual_value > opening) {
    warnings.push("Residual value exceeds the opening WDV — depreciation for this year will be zero.");
  }

  if (inputs.partial_year_depreciation) {
    const start = parseDate(inputs.start_date);
    const end = parseDate(inputs.end_date);
    if (!start || !end) {
      errors.push("Start date and end date are required when partial-year depreciation is enabled.");
    } else if (end < start) {
      errors.push("End date cannot precede the start date.");
    }
  }

  return ok(errors, warnings);
}
