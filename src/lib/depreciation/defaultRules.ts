import { CompaniesActRule, IncomeTaxRule } from "@/types/depreciation";

/**
 * SEED data only — a starting point loaded into the Rules & Rates admin
 * tables so the app isn't empty on day one. The calculation engines never
 * import or hardcode these values directly; they always take rate/useful
 * life as explicit inputs resolved from whatever is in the Rules & Rates
 * database at calculation time. Admins can edit, deactivate, or replace any
 * of these without touching engine code.
 *
 * Source references given below are common general categories under
 * Schedule II (Companies Act, 2013) and the Income-tax Rules, 1962 —
 * Appendix I. Verify against the current notification before relying on
 * these for statutory filing.
 */

export const SEED_COMPANIES_ACT_RULES: Omit<CompaniesActRule, "id">[] = [
  { asset_category: "Plant & Machinery", asset_type: "General (continuous process plant excluded)", useful_life: 15, useful_life_unit: "years", residual_value_pct: 5, permitted_method: "WDV", effective_date: "2014-04-01", source_reference: "Schedule II, Companies Act 2013 — Part C, Plant & Machinery (general)", active: true },
  { asset_category: "Furniture & Fittings", asset_type: "General", useful_life: 10, useful_life_unit: "years", residual_value_pct: 5, permitted_method: "SLM", effective_date: "2014-04-01", source_reference: "Schedule II, Companies Act 2013 — Part C, Furniture and Fittings", active: true },
  { asset_category: "Computers & Data Processing", asset_type: "Servers and networks", useful_life: 6, useful_life_unit: "years", residual_value_pct: 5, permitted_method: "SLM", effective_date: "2014-04-01", source_reference: "Schedule II, Companies Act 2013 — Part C, Computers and data processing units", active: true },
  { asset_category: "Computers & Data Processing", asset_type: "End-user devices (desktops/laptops)", useful_life: 3, useful_life_unit: "years", residual_value_pct: 5, permitted_method: "SLM", effective_date: "2014-04-01", source_reference: "Schedule II, Companies Act 2013 — Part C, Computers and data processing units", active: true },
  { asset_category: "Office Equipment", asset_type: "General", useful_life: 5, useful_life_unit: "years", residual_value_pct: 5, permitted_method: "SLM", effective_date: "2014-04-01", source_reference: "Schedule II, Companies Act 2013 — Part C, Office Equipment", active: true },
  { asset_category: "Motor Vehicles", asset_type: "General (other than those for hire)", useful_life: 8, useful_life_unit: "years", residual_value_pct: 5, permitted_method: "WDV", effective_date: "2014-04-01", source_reference: "Schedule II, Companies Act 2013 — Part C, Motor Vehicles", active: true },
  { asset_category: "Buildings", asset_type: "RCC frame structure", useful_life: 60, useful_life_unit: "years", residual_value_pct: 5, permitted_method: "SLM", effective_date: "2014-04-01", source_reference: "Schedule II, Companies Act 2013 — Part C, Buildings", active: true },
];

export const SEED_INCOME_TAX_RULES: Omit<IncomeTaxRule, "id">[] = [
  { assessment_year: "2026-27", financial_year: "2025-26", block_of_assets: "Buildings — mainly residential", asset_category: "Buildings", depreciation_rate_pct: 5, lt_180_days_treatment: "half_rate", effective_date: "2003-04-01", source_reference: "Income-tax Rules, 1962 — Appendix I, Block: Buildings (residential)", active: true },
  { assessment_year: "2026-27", financial_year: "2025-26", block_of_assets: "Buildings — other than residential", asset_category: "Buildings", depreciation_rate_pct: 10, lt_180_days_treatment: "half_rate", effective_date: "2003-04-01", source_reference: "Income-tax Rules, 1962 — Appendix I, Block: Buildings (non-residential)", active: true },
  { assessment_year: "2026-27", financial_year: "2025-26", block_of_assets: "Furniture & Fittings", asset_category: "Furniture & Fittings", depreciation_rate_pct: 10, lt_180_days_treatment: "half_rate", effective_date: "2003-04-01", source_reference: "Income-tax Rules, 1962 — Appendix I, Block: Furniture and fittings", active: true },
  { assessment_year: "2026-27", financial_year: "2025-26", block_of_assets: "Plant & Machinery — General", asset_category: "Plant & Machinery", depreciation_rate_pct: 15, lt_180_days_treatment: "half_rate", effective_date: "2003-04-01", source_reference: "Income-tax Rules, 1962 — Appendix I, Block: Machinery and plant (general)", active: true },
  { assessment_year: "2026-27", financial_year: "2025-26", block_of_assets: "Computers including Computer Software", asset_category: "Computers & Data Processing", depreciation_rate_pct: 40, lt_180_days_treatment: "half_rate", effective_date: "2003-04-01", source_reference: "Income-tax Rules, 1962 — Appendix I, Block: Computers including computer software", active: true },
  { assessment_year: "2026-27", financial_year: "2025-26", block_of_assets: "Motor Vehicles — General", asset_category: "Motor Vehicles", depreciation_rate_pct: 15, lt_180_days_treatment: "half_rate", effective_date: "2003-04-01", source_reference: "Income-tax Rules, 1962 — Appendix I, Block: Motor vehicles (general)", active: true },
  { assessment_year: "2026-27", financial_year: "2025-26", block_of_assets: "Intangible Assets", asset_category: "Intangible Assets", depreciation_rate_pct: 25, lt_180_days_treatment: "half_rate", effective_date: "2003-04-01", source_reference: "Income-tax Rules, 1962 — Appendix I, Block: Intangible assets (know-how, patents, licences, franchises etc.)", active: true },
];

export function resolveCompaniesActRule(
  rules: CompaniesActRule[],
  assetCategory: string,
): CompaniesActRule | undefined {
  return rules.find((r) => r.active && r.asset_category === assetCategory);
}

export function resolveIncomeTaxRule(
  rules: IncomeTaxRule[],
  assetCategory: string,
  assessmentYear?: string,
): IncomeTaxRule | undefined {
  return rules.find(
    (r) => r.active && r.asset_category === assetCategory && (!assessmentYear || r.assessment_year === assessmentYear),
  );
}
