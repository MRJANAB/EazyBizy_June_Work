import { describe, it, expect } from "vitest";
import { calculateGenericWdv, buildGenericWdvSchedule } from "@/lib/depreciation/genericWdvEngine";

describe("Generic WDV engine", () => {
  it("Normal WDV — matches the spec's worked example exactly", () => {
    const y1 = calculateGenericWdv({
      original_cost: 1_000_000,
      depreciation_rate_pct: 20,
      financial_year: "2026-27",
      partial_year_depreciation: false,
    });
    expect(y1.depreciation).toBe(200_000);
    expect(y1.closing_wdv).toBe(800_000);

    const y2 = calculateGenericWdv({
      original_cost: 1_000_000,
      opening_wdv: 800_000,
      depreciation_rate_pct: 20,
      financial_year: "2027-28",
      partial_year_depreciation: false,
    });
    expect(y2.depreciation).toBe(160_000);
    expect(y2.closing_wdv).toBe(640_000);
  });

  it("Multi-year WDV — schedule carries closing WDV forward as next year's opening", () => {
    const schedule = buildGenericWdvSchedule(
      { original_cost: 1_000_000, depreciation_rate_pct: 20, financial_year: "2026-27", partial_year_depreciation: false },
      5,
    );
    expect(schedule).toHaveLength(5);
    expect(schedule[0]).toMatchObject({ opening_wdv: 1_000_000, depreciation: 200_000, closing_wdv: 800_000 });
    expect(schedule[1]).toMatchObject({ opening_wdv: 800_000, depreciation: 160_000, closing_wdv: 640_000 });
    // Each year's opening must equal the previous year's closing.
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].opening_wdv).toBe(schedule[i - 1].closing_wdv);
    }
    // Accumulated depreciation must be monotonically increasing.
    expect(schedule[4].accumulated_depreciation).toBeGreaterThan(schedule[0].accumulated_depreciation);
  });

  it("Zero depreciation — a 0% rate leaves WDV unchanged", () => {
    const result = calculateGenericWdv({
      original_cost: 500_000,
      depreciation_rate_pct: 0,
      financial_year: "2026-27",
      partial_year_depreciation: false,
    });
    expect(result.depreciation).toBe(0);
    expect(result.closing_wdv).toBe(500_000);
  });

  it("Fully depreciated asset — depreciation is capped at the residual value floor", () => {
    const result = calculateGenericWdv({
      original_cost: 100_000,
      opening_wdv: 5_000,
      depreciation_rate_pct: 50,
      residual_value: 4_000,
      financial_year: "2026-27",
      partial_year_depreciation: false,
    });
    // Naive 5000*50% = 2500 would breach the 4000 floor, so it must be capped at 1000.
    expect(result.depreciation).toBe(1_000);
    expect(result.closing_wdv).toBe(4_000);
    expect(result.is_fully_depreciated).toBe(true);
  });

  it("Partial-year depreciation — pro-rates by days when enabled", () => {
    const fullYear = calculateGenericWdv({
      original_cost: 1_200_000,
      depreciation_rate_pct: 10,
      financial_year: "2026-27",
      partial_year_depreciation: false,
    });
    const halfYear = calculateGenericWdv({
      original_cost: 1_200_000,
      depreciation_rate_pct: 10,
      financial_year: "2026-27",
      partial_year_depreciation: true,
      start_date: "2026-10-01",
      end_date: "2027-03-31", // ~182 days, roughly half the FY
    });
    expect(halfYear.depreciation).toBeLessThan(fullYear.depreciation);
    expect(halfYear.depreciation).toBeGreaterThan(0);
  });

  it("Invalid inputs — negative rate and missing dates for partial-year are rejected", () => {
    const badRate = calculateGenericWdv({
      original_cost: 100_000,
      depreciation_rate_pct: -10,
      financial_year: "2026-27",
      partial_year_depreciation: false,
    });
    expect(badRate.calculation_steps[0]).toMatch(/Validation failed/);

    const missingDates = calculateGenericWdv({
      original_cost: 100_000,
      depreciation_rate_pct: 10,
      financial_year: "2026-27",
      partial_year_depreciation: true,
    });
    expect(missingDates.calculation_steps[0]).toMatch(/Validation failed/);
  });
});
