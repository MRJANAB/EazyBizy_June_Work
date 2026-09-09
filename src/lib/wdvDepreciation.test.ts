import { describe, it, expect } from "vitest";
import { buildWdvDepreciationSchedule } from "./wdvDepreciation";
import { INITIAL_FORM_DATA, type GTABFormData } from "@/types/gtab";

function makeFormData(overrides: Partial<GTABFormData> = {}): GTABFormData {
  return {
    ...INITIAL_FORM_DATA,
    shed_building_cost: 1_000_000,
    plant_machinery: [
      { id: "1", machine_name: "Lathe", cost: 500_000, quantity: 1, unit_cost: 500_000, supplier_name: "", supplier_phone: "", supplier_email: "" },
    ],
    machinery_installation_cost: 20_000,
    computers_cost: 50_000,
    furniture_cost: 30_000,
    electrification_cost: 0,
    racks_storage_cost: 0,
    transportation_cost: 0,
    project_report_inputs: {
      ...INITIAL_FORM_DATA.project_report_inputs,
      dpr: {
        ...INITIAL_FORM_DATA.project_report_inputs.dpr,
        contingency_pct: 5,
        building_dep_rate_pct: 5,
      },
      revenue: {
        ...INITIAL_FORM_DATA.project_report_inputs.revenue,
        depreciation_pct: 10,
      },
    },
    ...overrides,
  } as GTABFormData;
}

describe("buildWdvDepreciationSchedule", () => {
  it("computes gross block with contingency on P&M only", () => {
    const dep = buildWdvDepreciationSchedule(makeFormData());
    // machinery base = 500000 + 20000 = 520000; +5% contingency = 546000
    expect(dep.pmWithContingency).toBeCloseTo(546_000, 2);
    expect(dep.fixturesGross).toBeCloseTo(80_000, 2); // computers + furniture
    expect(dep.buildingGross).toBe(1_000_000);
    expect(dep.grossBlock).toBeCloseTo(1_000_000 + 546_000 + 80_000, 2);
  });

  it("produces a 5-year schedule that declines every year (WDV, never flat)", () => {
    const dep = buildWdvDepreciationSchedule(makeFormData());
    expect(dep.schedule).toHaveLength(5);
    for (let i = 1; i < 5; i++) {
      expect(dep.schedule[i].depreciation).toBeLessThan(dep.schedule[i - 1].depreciation);
      expect(dep.schedule[i].openingWdv).toBeCloseTo(dep.schedule[i - 1].closingWdv, 2);
    }
  });

  it("never lets closing WDV go negative", () => {
    const dep = buildWdvDepreciationSchedule(makeFormData());
    for (const row of dep.schedule) {
      expect(row.closingWdv).toBeGreaterThanOrEqual(0);
      expect(row.buildingClosingWdv).toBeGreaterThanOrEqual(0);
      expect(row.machineryClosingWdv).toBeGreaterThanOrEqual(0);
    }
  });

  it("matches the backend's Year-1 math exactly: dep = opening x rate", () => {
    const dep = buildWdvDepreciationSchedule(makeFormData());
    const year1 = dep.schedule[0];
    expect(year1.buildingDepreciation).toBeCloseTo(1_000_000 * 0.05, 2);
    expect(year1.machineryDepreciation).toBeCloseTo((546_000 + 80_000) * 0.10, 2);
  });

  it(
    "rounds to whole rupees at EVERY step, matching backend/core/engine.py's " +
      "R(val, decimals=0) exactly -- 2-decimal rounding here would compound a " +
      "real divergence by Year 4/5 since each year's opening is the previous " +
      "year's rounded closing (regression: confirmed via a side-by-side " +
      "Python/Node run with building=600000, machinery=1200000+80000 " +
      "installation, fixtures=125000, contingency=5%, rates 10%/5%)",
    () => {
      const dep = buildWdvDepreciationSchedule(
        makeFormData({
          shed_building_cost: 600_000,
          plant_machinery: [
            { id: "1", machine_name: "Flour Mill", cost: 900_000, quantity: 1, unit_cost: 900_000, supplier_name: "", supplier_phone: "", supplier_email: "" },
            { id: "2", machine_name: "Packaging", cost: 300_000, quantity: 1, unit_cost: 300_000, supplier_name: "", supplier_phone: "", supplier_email: "" },
          ],
          machinery_installation_cost: 80_000,
          computers_cost: 30_000,
          furniture_cost: 20_000,
          electrification_cost: 50_000,
          racks_storage_cost: 25_000,
          transportation_cost: 0,
          project_report_inputs: {
            ...INITIAL_FORM_DATA.project_report_inputs,
            dpr: { ...INITIAL_FORM_DATA.project_report_inputs.dpr, contingency_pct: 5, building_dep_rate_pct: 5 },
            revenue: { ...INITIAL_FORM_DATA.project_report_inputs.revenue, depreciation_pct: 10 },
          },
        }),
      );
      expect(dep.grossBlock).toBe(2_069_000);
      const expected = [
        { bldDep: 30000, machDep: 146900, closing: 1892100 },
        { bldDep: 28500, machDep: 132210, closing: 1731390 },
        { bldDep: 27075, machDep: 118989, closing: 1585326 },
        { bldDep: 25721, machDep: 107090, closing: 1452515 },
        { bldDep: 24435, machDep: 96381,  closing: 1331699 },
      ];
      expected.forEach((exp, i) => {
        expect(dep.schedule[i].buildingDepreciation).toBe(exp.bldDep);
        expect(dep.schedule[i].machineryDepreciation).toBe(exp.machDep);
        expect(dep.schedule[i].closingWdv).toBe(exp.closing);
      });
    },
  );

  it("returns an all-zero schedule when no capex has been entered", () => {
    const dep = buildWdvDepreciationSchedule(
      makeFormData({
        shed_building_cost: 0,
        plant_machinery: [],
        machinery_installation_cost: 0,
        computers_cost: 0,
        furniture_cost: 0,
        electrification_cost: 0,
        racks_storage_cost: 0,
        transportation_cost: 0,
      }),
    );
    expect(dep.grossBlock).toBe(0);
    expect(dep.schedule.every((row) => row.depreciation === 0)).toBe(true);
  });
});
