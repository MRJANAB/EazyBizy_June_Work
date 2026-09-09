import { describe, it, expect } from "vitest";
import { calculateCompaniesActDepreciation, buildCompaniesActSchedule } from "@/lib/depreciation/companiesActEngine";
import { CompaniesActInputs } from "@/types/depreciation";

const baseSlm: CompaniesActInputs = {
  asset_type: "Plant & Machinery",
  useful_life: 10,
  useful_life_unit: "years",
  residual_value_pct: 5,
  method: "SLM",
  financial_year: "2026-27",
};

describe("Companies Act engine — SLM", () => {
  it("Depreciable Amount / Useful Life, no pro-rata when already in use before the FY", () => {
    const result = calculateCompaniesActDepreciation(baseSlm, 1_000_000);
    // Residual = 5% of 10,00,000 = 50,000. Depreciable = 9,50,000. /10 = 95,000/yr.
    expect(result.residual_value).toBe(50_000);
    expect(result.current_year_depreciation).toBe(95_000);
    expect(result.closing_carrying_amount).toBe(905_000);
    expect(result.pro_rata_applied).toBe(false);
  });

  it("Pro-rata depreciation when the asset is put to use mid-year", () => {
    const result = calculateCompaniesActDepreciation(
      { ...baseSlm, date_available_for_use: "2026-10-01" }, // ~182 days remaining in FY 2026-27
      1_000_000,
    );
    expect(result.pro_rata_applied).toBe(true);
    expect(result.current_year_depreciation).toBeLessThan(95_000);
    expect(result.current_year_depreciation).toBeGreaterThan(0);
  });

  it("Never depreciates below the residual value over the full useful life", () => {
    const schedule = buildCompaniesActSchedule(baseSlm, 1_000_000, 15);
    const last = schedule[schedule.length - 1];
    expect(last.net_book_value).toBeGreaterThanOrEqual(50_000 - 0.01);
    expect(schedule.length).toBeLessThanOrEqual(10);
  });
});

describe("Companies Act engine — WDV", () => {
  it("Derives the Schedule II WDV rate from residual/cost/useful-life and applies it to opening carrying amount", () => {
    const inputs: CompaniesActInputs = {
      asset_type: "Motor Vehicles",
      useful_life: 8,
      useful_life_unit: "years",
      residual_value_pct: 5,
      method: "WDV",
      financial_year: "2026-27",
    };
    const result = calculateCompaniesActDepreciation(inputs, 1_000_000);
    // rate = 1 - (0.05)^(1/8) ≈ 30.8%
    expect(result.current_year_depreciation).toBeGreaterThan(280_000);
    expect(result.current_year_depreciation).toBeLessThan(320_000);
    expect(result.closing_carrying_amount).toBe(1_000_000 - result.current_year_depreciation);
  });

  it("SLM and WDV give DIFFERENT depreciation for the same asset — never conflated", () => {
    const slmResult = calculateCompaniesActDepreciation(baseSlm, 1_000_000);
    const wdvResult = calculateCompaniesActDepreciation({ ...baseSlm, method: "WDV" }, 1_000_000);
    expect(slmResult.current_year_depreciation).not.toBe(wdvResult.current_year_depreciation);
  });
});

describe("Companies Act engine — validation", () => {
  it("rejects zero/negative useful life and residual value exceeding cost", () => {
    const badLife = calculateCompaniesActDepreciation({ ...baseSlm, useful_life: 0 }, 1_000_000);
    expect(badLife.calculation_steps[0]).toMatch(/Validation failed/);

    const badResidual = calculateCompaniesActDepreciation(
      { ...baseSlm, residual_value_pct: undefined, residual_value: 2_000_000 },
      1_000_000,
    );
    expect(badResidual.calculation_steps[0]).toMatch(/Validation failed/);
  });
});
