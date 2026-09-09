// ─────────────────────────────────────────────────────────────────────────────
// Indian Depreciation & WDV system — shared types.
//
// Companies Act, Income Tax, and Generic WDV are DELIBERATELY separate engines
// with separate inputs and separate outputs. Nothing here assumes they share
// a rate, a useful life, or a WDV balance. See lib/depreciation/*.ts.
// ─────────────────────────────────────────────────────────────────────────────

export type DepreciationBasis = "companies_act" | "income_tax" | "generic_wdv";

export type AssetStatus =
  | "active"
  | "fully_depreciated"
  | "disposed"
  | "written_off"
  | "under_construction";

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: "Active",
  fully_depreciated: "Fully Depreciated",
  disposed: "Disposed",
  written_off: "Written Off",
  under_construction: "Under Construction / Not Yet Put to Use",
};

/** Common Asset Master fields — required regardless of calculation basis. */
export interface DepreciationAsset {
  id: string;
  user_id?: string;
  asset_code: string; // "Asset ID" shown to the user
  asset_name: string;
  asset_category: string;
  asset_sub_category?: string;
  description?: string;
  location?: string;
  department?: string;
  acquisition_date: string; // ISO date
  date_put_to_use?: string; // ISO date — required for CA/IT engines, not for pure Generic WDV
  original_cost: number;
  currency: string; // default "INR"
  vendor?: string;
  invoice_reference?: string;
  disposal_date?: string;
  disposal_proceeds?: number;
  status: AssetStatus;
  created_at?: string;
  updated_at?: string;
}

// ── Companies Act / Accounting ──────────────────────────────────────────────

export type CompaniesActMethod = "SLM" | "WDV" | "OTHER";

export const COMPANIES_ACT_METHOD_LABELS: Record<CompaniesActMethod, string> = {
  SLM: "Straight Line Method",
  WDV: "Written Down Value",
  OTHER: "Other (configured method)",
};

export type UsefulLifeUnit = "years" | "months";

/** Per-asset Companies Act configuration (what the user enters). */
export interface CompaniesActInputs {
  asset_type: string;
  useful_life: number;
  useful_life_unit: UsefulLifeUnit;
  residual_value?: number;
  residual_value_pct?: number; // used to derive residual_value if residual_value not set directly
  method: CompaniesActMethod;
  other_method_rate_pct?: number; // only used when method === "OTHER" (a configured accounting WDV-style rate)
  date_available_for_use?: string; // ISO date — drives pro-rata in the year the asset is first capitalised
  financial_year: string; // e.g. "2026-27"
  opening_carrying_amount?: number; // required for FY2+ (else derived from cost for FY1)
  opening_accumulated_depreciation?: number;
  change_in_useful_life?: number; // revised remaining useful life, if changed mid-life
  change_in_residual_value?: number;
}

export interface CompaniesActResult {
  basis: "companies_act";
  method: CompaniesActMethod;
  gross_block: number;
  residual_value: number;
  useful_life_years: number; // normalized to years for display
  remaining_useful_life_years: number;
  opening_accumulated_depreciation: number;
  opening_carrying_amount: number;
  current_year_depreciation: number;
  closing_accumulated_depreciation: number;
  closing_carrying_amount: number;
  pro_rata_days?: number; // days used this FY if asset put to use mid-year
  pro_rata_applied: boolean;
  is_fully_depreciated: boolean;
  calculation_steps: string[]; // human-readable audit trail
  warnings: string[];
}

// ── Income Tax (Block of Assets) ────────────────────────────────────────────

/** A tax "block" groups multiple assets that share one WDV and one rate. */
export interface IncomeTaxBlockInputs {
  assessment_year: string; // e.g. "2027-28"
  financial_year: string; // e.g. "2026-27"
  block_name: string; // e.g. "Plant & Machinery @ 15%"
  asset_type: string;
  applicable_rate_pct: number; // resolved from Tax Rules Master, but overridable
  opening_wdv_of_block: number;
  additions_lt_180_days: number; // additions put to use for < 180 days this FY
  additions_gte_180_days: number; // additions put to use for >= 180 days this FY
  disposal_sale_consideration: number; // total sale value of assets sold from the block this FY (never > relevant block amount conceptually, but not force-clamped)
  block_ceases_to_exist?: boolean; // true if all assets in the block are sold/discarded (short-term capital gain/loss case, no depreciation)
}

export interface IncomeTaxBlockResult {
  basis: "income_tax";
  block_name: string;
  applicable_rate_pct: number;
  opening_wdv: number;
  additions_lt_180_days: number;
  additions_gte_180_days: number;
  disposal_adjustment: number;
  relevant_block_amount: number; // opening WDV + all additions − disposal adjustment, before depreciation
  full_rate_base: number; // portion depreciated at full rate (opening WDV + additions >= 180 days − disposals, floored at 0)
  half_rate_base: number; // portion depreciated at half rate (additions < 180 days)
  full_depreciation: number;
  restricted_depreciation: number; // depreciation on the <180-day portion, at half the rate
  total_depreciation: number;
  closing_wdv: number;
  block_ceased: boolean;
  short_term_capital_gain_loss?: number; // only when block_ceased
  calculation_steps: string[];
  warnings: string[];
}

// ── Generic WDV ──────────────────────────────────────────────────────────────

export interface GenericWdvInputs {
  original_cost: number;
  opening_wdv?: number; // if omitted, original_cost is used (FY1)
  depreciation_rate_pct: number;
  financial_year: string;
  start_date?: string; // asset start date within the FY, for partial-year calc
  end_date?: string; // FY end date
  partial_year_depreciation: boolean;
  residual_value?: number;
}

export interface GenericWdvResult {
  basis: "generic_wdv";
  opening_wdv: number;
  depreciation_rate_pct: number;
  days_used?: number;
  days_in_year?: number;
  full_year_depreciation: number;
  depreciation: number; // after partial-year adjustment, if any
  closing_wdv: number;
  residual_value_floor: number;
  is_fully_depreciated: boolean;
  calculation_steps: string[];
  warnings: string[];
}

export interface GenericWdvScheduleRow {
  financial_year: string;
  opening_wdv: number;
  rate_pct: number;
  depreciation: number;
  accumulated_depreciation: number;
  closing_wdv: number;
}

export interface CompaniesActScheduleRow {
  financial_year: string;
  gross_block: number;
  opening_accumulated_depreciation: number;
  current_depreciation: number;
  closing_accumulated_depreciation: number;
  net_book_value: number;
}

export interface IncomeTaxScheduleRow {
  financial_year: string;
  opening_block_wdv: number;
  additions: number;
  disposal_adjustment: number;
  rate_pct: number;
  full_depreciation: number;
  restricted_depreciation: number;
  total_depreciation: number;
  closing_block_wdv: number;
}

// ── Comparison ───────────────────────────────────────────────────────────────

export interface DepreciationComparisonRow {
  particular: string;
  companies_act: string | number;
  income_tax: string | number;
  generic_wdv: string | number;
}

export interface DepreciationComparison {
  asset: DepreciationAsset;
  financial_year: string;
  companies_act?: CompaniesActResult;
  income_tax?: IncomeTaxBlockResult;
  generic_wdv?: GenericWdvResult;
  rows: DepreciationComparisonRow[];
  differences: {
    current_year_depreciation_ca_vs_it?: number;
    current_year_depreciation_ca_vs_generic?: number;
    closing_value_ca_vs_it?: number;
    closing_value_ca_vs_generic?: number;
    book_vs_tax_depreciation?: number;
    book_vs_tax_closing_value?: number;
  };
}

// ── Rules & Rates masters ───────────────────────────────────────────────────

export interface CompaniesActRule {
  id: string;
  asset_category: string;
  asset_type: string;
  useful_life: number;
  useful_life_unit: UsefulLifeUnit;
  residual_value_pct: number;
  permitted_method: CompaniesActMethod;
  effective_date: string;
  source_reference: string;
  notes?: string;
  active: boolean;
}

export type Under180DaysTreatment = "half_rate" | "full_rate" | "no_depreciation";

export interface IncomeTaxRule {
  id: string;
  assessment_year: string;
  financial_year: string;
  block_of_assets: string;
  asset_category: string;
  depreciation_rate_pct: number;
  lt_180_days_treatment: Under180DaysTreatment;
  effective_date: string;
  source_reference: string;
  notes?: string;
  active: boolean;
}

export interface GenericWdvDefaults {
  id: string;
  user_id?: string;
  default_depreciation_rate_pct: number;
  default_residual_value: number;
  partial_year_depreciation_default: boolean;
}

export const DISCLAIMER_TEXT =
  "Rules, rates, useful lives and tax treatment should be verified against the applicable law, notifications, accounting policy and Assessment Year before relying on this report for statutory filing or audit purposes.";
