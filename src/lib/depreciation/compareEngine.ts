import {
  CompaniesActInputs,
  CompaniesActResult,
  DepreciationAsset,
  DepreciationComparison,
  GenericWdvInputs,
  GenericWdvResult,
  IncomeTaxBlockInputs,
  IncomeTaxBlockResult,
  Under180DaysTreatment,
} from "@/types/depreciation";
import { calculateCompaniesActDepreciation } from "./companiesActEngine";
import { calculateIncomeTaxDepreciation } from "./incomeTaxEngine";
import { calculateGenericWdv } from "./genericWdvEngine";

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => `₹${round2(n).toLocaleString("en-IN")}`;

/**
 * Runs all three engines INDEPENDENTLY on the same asset and financial year,
 * then lays the results side by side. Each engine gets its own inputs — one
 * is never derived from another, and Book depreciation is never presented as
 * interchangeable with Tax depreciation.
 */
export function compareDepreciation(params: {
  asset: DepreciationAsset;
  financial_year: string;
  companiesActInputs?: CompaniesActInputs;
  incomeTaxInputs?: IncomeTaxBlockInputs;
  incomeTaxLt180Treatment?: Under180DaysTreatment;
  genericWdvInputs?: GenericWdvInputs;
}): DepreciationComparison {
  const { asset, financial_year } = params;

  const companiesAct: CompaniesActResult | undefined = params.companiesActInputs
    ? calculateCompaniesActDepreciation(params.companiesActInputs, asset.original_cost)
    : undefined;

  const incomeTax: IncomeTaxBlockResult | undefined = params.incomeTaxInputs
    ? calculateIncomeTaxDepreciation(params.incomeTaxInputs, params.incomeTaxLt180Treatment)
    : undefined;

  const genericWdv: GenericWdvResult | undefined = params.genericWdvInputs
    ? calculateGenericWdv(params.genericWdvInputs)
    : undefined;

  const rows = [
    {
      particular: "Original Cost",
      companies_act: companiesAct ? fmt(companiesAct.gross_block) : "—",
      income_tax: "N/A (block-based, not per-asset)",
      generic_wdv: genericWdv ? fmt(params.genericWdvInputs!.original_cost) : "—",
    },
    {
      particular: "Opening Value",
      companies_act: companiesAct ? fmt(companiesAct.opening_carrying_amount) : "—",
      income_tax: incomeTax ? fmt(incomeTax.opening_wdv) + " (block)" : "—",
      generic_wdv: genericWdv ? fmt(genericWdv.opening_wdv) : "—",
    },
    {
      particular: "Method",
      companies_act: companiesAct?.method ?? "—",
      income_tax: "Block of Assets (WDV)",
      generic_wdv: "Reducing Balance",
    },
    {
      particular: "Useful Life",
      companies_act: companiesAct ? `${companiesAct.useful_life_years} yrs` : "—",
      income_tax: "N/A",
      generic_wdv: "N/A",
    },
    {
      particular: "Depreciation Rate",
      companies_act: companiesAct?.method === "WDV" ? "Derived (Schedule II)" : "SLM (from useful life)",
      income_tax: incomeTax ? `${incomeTax.applicable_rate_pct}%` : "—",
      generic_wdv: genericWdv ? `${genericWdv.depreciation_rate_pct}%` : "—",
    },
    {
      particular: "Current-Year Depreciation",
      companies_act: companiesAct ? fmt(companiesAct.current_year_depreciation) : "—",
      income_tax: incomeTax ? fmt(incomeTax.total_depreciation) : "—",
      generic_wdv: genericWdv ? fmt(genericWdv.depreciation) : "—",
    },
    {
      particular: "Accumulated Depreciation",
      companies_act: companiesAct ? fmt(companiesAct.closing_accumulated_depreciation) : "—",
      income_tax: "N/A (block WDV method — no separate accumulated figure)",
      generic_wdv: "N/A (see closing WDV)",
    },
    {
      particular: "Closing Value / WDV",
      companies_act: companiesAct ? fmt(companiesAct.closing_carrying_amount) : "—",
      income_tax: incomeTax ? fmt(incomeTax.closing_wdv) + " (Tax WDV)" : "—",
      generic_wdv: genericWdv ? fmt(genericWdv.closing_wdv) : "—",
    },
  ];

  const differences: DepreciationComparison["differences"] = {};
  if (companiesAct && incomeTax) {
    differences.current_year_depreciation_ca_vs_it = round2(companiesAct.current_year_depreciation - incomeTax.total_depreciation);
    differences.closing_value_ca_vs_it = round2(companiesAct.closing_carrying_amount - incomeTax.closing_wdv);
    differences.book_vs_tax_depreciation = differences.current_year_depreciation_ca_vs_it;
    differences.book_vs_tax_closing_value = differences.closing_value_ca_vs_it;
  }
  if (companiesAct && genericWdv) {
    differences.current_year_depreciation_ca_vs_generic = round2(companiesAct.current_year_depreciation - genericWdv.depreciation);
    differences.closing_value_ca_vs_generic = round2(companiesAct.closing_carrying_amount - genericWdv.closing_wdv);
  }

  return {
    asset,
    financial_year,
    companies_act: companiesAct,
    income_tax: incomeTax,
    generic_wdv: genericWdv,
    rows,
    differences,
  };
}
