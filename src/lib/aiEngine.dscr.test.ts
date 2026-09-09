import { describe, it, expect } from "vitest";
import { predictViability } from "./aiEngine";
import { INITIAL_FORM_DATA, type GTABFormData } from "@/types/gtab";

function baseFormData(overrides: Partial<GTABFormData> = {}): GTABFormData {
  return {
    ...INITIAL_FORM_DATA,
    loan_scheme: "msme_psu" as any,
    industry_type: "manufacturing",
    social_category: "general",
    area_type: "urban",
    land_cost: 0,
    shed_building_cost: 500_000,
    plant_machinery: [
      { id: "1", machine_name: "M", cost: 1_000_000, quantity: 1, unit_cost: 1_000_000, supplier_name: "", supplier_phone: "", supplier_email: "" },
    ],
    expected_monthly_revenue: 300_000,
    raw_material_cost: 100_000,
    project_report_inputs: {
      ...INITIAL_FORM_DATA.project_report_inputs,
      loan: {
        ...INITIAL_FORM_DATA.project_report_inputs.loan,
        interest_rate_pct: 11,
        tenure_months: 60,
        moratorium_months: 0,
      },
    },
    ...overrides,
  } as GTABFormData;
}

describe(
  "predictViability — DSCR uses the real reducing-balance loan schedule " +
    "(BUG FIX: old code used a flat-interest EMI approximation with a " +
    "numerator that didn't correspond to any correct interest add-back, " +
    "and completely ignored moratorium)",
  () => {
    it("is sensitive to moratorium (Year 1 debt service drops to interest-only during moratorium)", () => {
      const noMoratorium = predictViability(baseFormData());
      const withMoratorium = predictViability(
        baseFormData({
          project_report_inputs: {
            ...INITIAL_FORM_DATA.project_report_inputs,
            loan: {
              ...INITIAL_FORM_DATA.project_report_inputs.loan,
              interest_rate_pct: 11,
              tenure_months: 60,
              moratorium_months: 24,
            },
          },
        }),
      );
      // During moratorium, Year-1 principal repayment is zero, so debt
      // service (the DSCR denominator) is smaller -> DSCR should be higher.
      // The old flat-interest formula never varied with moratorium at all.
      expect(withMoratorium.dscrEstimate).toBeGreaterThan(noMoratorium.dscrEstimate);
    });

    it("never returns Infinity/NaN when there is no loan amount", () => {
      const result = predictViability(
        baseFormData({ shed_building_cost: 0, plant_machinery: [], land_cost: 0 }),
      );
      expect(Number.isFinite(result.dscrEstimate)).toBe(true);
    });
  },
);
