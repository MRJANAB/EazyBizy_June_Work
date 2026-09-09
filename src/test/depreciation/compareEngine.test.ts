import { describe, it, expect } from "vitest";
import { compareDepreciation } from "@/lib/depreciation/compareEngine";
import { DepreciationAsset } from "@/types/depreciation";

const asset: DepreciationAsset = {
  id: "a1",
  asset_code: "AST-001",
  asset_name: "CNC Machine",
  asset_category: "Plant & Machinery",
  acquisition_date: "2024-04-01",
  date_put_to_use: "2024-04-01",
  original_cost: 1_000_000,
  currency: "INR",
  status: "active",
};

describe("Comparison engine", () => {
  it("runs all three engines independently and never conflates Book vs Tax depreciation", () => {
    const comparison = compareDepreciation({
      asset,
      financial_year: "2026-27",
      companiesActInputs: {
        asset_type: "Plant & Machinery",
        useful_life: 10,
        useful_life_unit: "years",
        residual_value_pct: 5,
        method: "SLM",
        financial_year: "2026-27",
      },
      incomeTaxInputs: {
        assessment_year: "2027-28",
        financial_year: "2026-27",
        block_name: "Plant & Machinery — General",
        asset_type: "Plant & Machinery",
        applicable_rate_pct: 15,
        opening_wdv_of_block: 1_000_000,
        additions_lt_180_days: 0,
        additions_gte_180_days: 0,
        disposal_sale_consideration: 0,
      },
      genericWdvInputs: {
        original_cost: 1_000_000,
        depreciation_rate_pct: 20,
        financial_year: "2026-27",
        partial_year_depreciation: false,
      },
    });

    expect(comparison.companies_act!.current_year_depreciation).toBe(95_000); // SLM: (10L-5%)/10
    expect(comparison.income_tax!.total_depreciation).toBe(150_000); // 15% of block WDV
    expect(comparison.generic_wdv!.depreciation).toBe(200_000); // 20% of opening WDV

    // All three MUST differ — proof none was derived from another.
    const values = [
      comparison.companies_act!.current_year_depreciation,
      comparison.income_tax!.total_depreciation,
      comparison.generic_wdv!.depreciation,
    ];
    expect(new Set(values).size).toBe(3);

    expect(comparison.differences.book_vs_tax_depreciation).toBe(95_000 - 150_000);
    expect(comparison.differences.current_year_depreciation_ca_vs_generic).toBe(95_000 - 200_000);

    // The comparison table must label rows distinctly, not merge them.
    const depRow = comparison.rows.find((r) => r.particular === "Current-Year Depreciation")!;
    expect(depRow.companies_act).not.toBe(depRow.income_tax);
    expect(depRow.income_tax).not.toBe(depRow.generic_wdv);
  });

  it("handles partial engine selection gracefully (e.g. Companies Act only)", () => {
    const comparison = compareDepreciation({
      asset,
      financial_year: "2026-27",
      companiesActInputs: {
        asset_type: "Plant & Machinery",
        useful_life: 10,
        useful_life_unit: "years",
        residual_value_pct: 5,
        method: "SLM",
        financial_year: "2026-27",
      },
    });
    expect(comparison.companies_act).toBeDefined();
    expect(comparison.income_tax).toBeUndefined();
    expect(comparison.generic_wdv).toBeUndefined();
    expect(comparison.differences.book_vs_tax_depreciation).toBeUndefined();
  });
});
