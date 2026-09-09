import { DepreciationAsset, CompaniesActResult, IncomeTaxBlockResult, GenericWdvResult } from "@/types/depreciation";
import { AssetBasisConfig } from "@/hooks/useDepreciationAssets";
import { calculateCompaniesActDepreciation } from "./companiesActEngine";
import { calculateIncomeTaxDepreciation } from "./incomeTaxEngine";
import { calculateGenericWdv } from "./genericWdvEngine";

export function getCompaniesActResultForAsset(
  asset: DepreciationAsset,
  config: AssetBasisConfig | undefined,
): CompaniesActResult | null {
  if (!config?.companies_act_inputs) return null;
  return calculateCompaniesActDepreciation(config.companies_act_inputs, asset.original_cost);
}

export function getIncomeTaxResultForAsset(
  asset: DepreciationAsset,
  config: AssetBasisConfig | undefined,
  lt180Treatment: "half_rate" | "full_rate" | "no_depreciation" = "half_rate",
): IncomeTaxBlockResult | null {
  if (!config?.income_tax_inputs) return null;
  return calculateIncomeTaxDepreciation(config.income_tax_inputs, lt180Treatment);
}

export function getGenericWdvResultForAsset(
  asset: DepreciationAsset,
  config: AssetBasisConfig | undefined,
): GenericWdvResult | null {
  if (!config?.generic_wdv_inputs) return null;
  return calculateGenericWdv(config.generic_wdv_inputs);
}

export interface DashboardTotals {
  totalAssets: number;
  totalOriginalCost: number;
  totalAccumulatedDepreciation: number; // Companies Act basis
  currentYearDepreciation: number; // Companies Act basis, current FY
  closingBookValue: number; // Companies Act closing carrying amount
  closingTaxWdv: number; // Income Tax closing block WDV (deduplicated by block name)
  fullyDepreciatedCount: number;
  underDepreciationCount: number;
}

export function computeDashboardTotals(
  assets: DepreciationAsset[],
  basisConfig: Record<string, AssetBasisConfig>,
): DashboardTotals {
  let totalOriginalCost = 0;
  let totalAccumulatedDepreciation = 0;
  let currentYearDepreciation = 0;
  let closingBookValue = 0;
  let fullyDepreciatedCount = 0;
  let underDepreciationCount = 0;
  const taxWdvByBlock = new Map<string, number>();

  for (const asset of assets) {
    totalOriginalCost += asset.original_cost;
    const config = basisConfig[asset.id];

    const ca = getCompaniesActResultForAsset(asset, config);
    if (ca) {
      totalAccumulatedDepreciation += ca.closing_accumulated_depreciation;
      currentYearDepreciation += ca.current_year_depreciation;
      closingBookValue += ca.closing_carrying_amount;
      if (ca.is_fully_depreciated) fullyDepreciatedCount += 1;
      else underDepreciationCount += 1;
    }

    const it = getIncomeTaxResultForAsset(asset, config);
    if (it && config?.income_tax_inputs) {
      // Tax WDV is a BLOCK figure — dedupe by block name so multiple assets
      // in the same block don't get double-counted.
      taxWdvByBlock.set(config.income_tax_inputs.block_name, it.closing_wdv);
    }
  }

  const closingTaxWdv = Array.from(taxWdvByBlock.values()).reduce((s, v) => s + v, 0);

  return {
    totalAssets: assets.length,
    totalOriginalCost,
    totalAccumulatedDepreciation,
    currentYearDepreciation,
    closingBookValue,
    closingTaxWdv,
    fullyDepreciatedCount,
    underDepreciationCount,
  };
}
