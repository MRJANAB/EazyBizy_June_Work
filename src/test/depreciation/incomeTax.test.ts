import { describe, it, expect } from "vitest";
import { calculateIncomeTaxDepreciation, buildIncomeTaxSchedule } from "@/lib/depreciation/incomeTaxEngine";
import { IncomeTaxBlockInputs } from "@/types/depreciation";

const baseBlock: IncomeTaxBlockInputs = {
  assessment_year: "2027-28",
  financial_year: "2026-27",
  block_name: "Plant & Machinery — General",
  asset_type: "Machinery",
  applicable_rate_pct: 15,
  opening_wdv_of_block: 1_000_000,
  additions_lt_180_days: 0,
  additions_gte_180_days: 0,
  disposal_sale_consideration: 0,
};

describe("Income Tax (Block of Assets) engine", () => {
  it("Basic block calculation — depreciation on opening WDV alone", () => {
    const result = calculateIncomeTaxDepreciation(baseBlock);
    expect(result.total_depreciation).toBe(150_000);
    expect(result.closing_wdv).toBe(850_000);
  });

  it("Less-than-180-days rule — new addition used <180 days gets HALF rate", () => {
    const result = calculateIncomeTaxDepreciation({
      ...baseBlock,
      opening_wdv_of_block: 0,
      additions_lt_180_days: 1_000_000,
    });
    // Half rate: 1,000,000 * 15% * 0.5 = 75,000
    expect(result.full_depreciation).toBe(0);
    expect(result.restricted_depreciation).toBe(75_000);
    expect(result.total_depreciation).toBe(75_000);
    expect(result.closing_wdv).toBe(925_000);
  });

  it("Additions to an existing block — long-use additions get full rate, opening WDV also full rate", () => {
    const result = calculateIncomeTaxDepreciation({
      ...baseBlock,
      opening_wdv_of_block: 500_000,
      additions_gte_180_days: 500_000,
    });
    // Full-rate base = 500,000 + 500,000 = 1,000,000 * 15% = 150,000
    expect(result.full_rate_base).toBe(1_000_000);
    expect(result.full_depreciation).toBe(150_000);
    expect(result.total_depreciation).toBe(150_000);
  });

  it("Disposal from block — reduces the full-rate pool first, without going negative", () => {
    const result = calculateIncomeTaxDepreciation({
      ...baseBlock,
      opening_wdv_of_block: 1_000_000,
      disposal_sale_consideration: 300_000,
    });
    expect(result.full_rate_base).toBe(700_000);
    expect(result.full_depreciation).toBe(105_000);
    expect(result.block_ceased).toBe(false);
  });

  it("Disposal exceeding the entire block — block ceases, no depreciation, short-term capital gain recognised", () => {
    const result = calculateIncomeTaxDepreciation({
      ...baseBlock,
      opening_wdv_of_block: 200_000,
      disposal_sale_consideration: 350_000,
    });
    expect(result.block_ceased).toBe(true);
    expect(result.total_depreciation).toBe(0);
    expect(result.short_term_capital_gain_loss).toBe(150_000);
  });

  it("Multiple assets in one block — aggregate opening WDV behaves as a single pool, not per-asset", () => {
    // Two machines of ₹4,00,000 and ₹6,00,000 already pooled into one block WDV.
    const combined = calculateIncomeTaxDepreciation({ ...baseBlock, opening_wdv_of_block: 1_000_000 });
    const separateSum =
      calculateIncomeTaxDepreciation({ ...baseBlock, opening_wdv_of_block: 400_000 }).total_depreciation +
      calculateIncomeTaxDepreciation({ ...baseBlock, opening_wdv_of_block: 600_000 }).total_depreciation;
    // Because depreciation is linear in this simple case, the totals coincide —
    // the point is the block engine takes ONE pooled WDV, not per-asset cost.
    expect(combined.total_depreciation).toBeCloseTo(separateSum, 2);
  });

  it("Multi-year schedule carries closing block WDV forward correctly", () => {
    const schedule = buildIncomeTaxSchedule(baseBlock, "half_rate", 3);
    expect(schedule[0].opening_block_wdv).toBe(1_000_000);
    expect(schedule[1].opening_block_wdv).toBe(schedule[0].closing_block_wdv);
    expect(schedule[2].opening_block_wdv).toBe(schedule[1].closing_block_wdv);
  });

  it("Invalid inputs — missing assessment year / block name is rejected", () => {
    const result = calculateIncomeTaxDepreciation({ ...baseBlock, assessment_year: "", block_name: "" });
    expect(result.calculation_steps[0]).toMatch(/Validation failed/);
  });

  it("Never calculates tax depreciation from original asset cost alone — block WDV drives it, not cost", () => {
    // Same opening WDV, wildly different (irrelevant) "cost" concept — the
    // income tax engine has no cost parameter at all, only block WDV/additions.
    const result = calculateIncomeTaxDepreciation(baseBlock);
    expect(result).not.toHaveProperty("original_cost");
  });
});
