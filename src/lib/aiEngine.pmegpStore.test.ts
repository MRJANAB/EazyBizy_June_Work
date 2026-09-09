import { describe, it, expect, afterEach } from "vitest";
import { recommendScheme } from "./aiEngine";
import { setSchemeRules, clearSchemeRulesStore } from "./schemeRulesStore";
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
    ...overrides,
  } as GTABFormData;
}

describe("recommendScheme — MSME PSU DSCR benchmark fix", () => {
  afterEach(() => clearSchemeRulesStore());

  it(
    "BUG (pre-fix / pre-fetch): the local table said MSME PSU needs DSCR >= 1.50, " +
      "disagreeing with the backend's actual 1.25 benchmark",
    () => {
      const result = recommendScheme(baseFormData());
      const msme = result.all.find((s) => s.id === "msme_psu");
      // This documents the OLD wrong fallback value before this fix — now
      // corrected to 1.25 to match core/engine.py's SCHEME_BENCHMARKS.
      expect(msme?.minDSCR).toBe(1.25);
    },
  );

  it("once the Rules Master rules are loaded, uses the fetched benchmark", () => {
    setSchemeRules("msme_psu", { benchmarks: { dscr_avg: 1.25 } as any });
    const result = recommendScheme(baseFormData());
    const msme = result.all.find((s) => s.id === "msme_psu");
    expect(msme?.minDSCR).toBe(1.25);
  });

  it("genuinely prefers the store even when it differs from the local fallback", () => {
    setSchemeRules("msme_psu", { benchmarks: { dscr_avg: 1.40 } as any });
    const result = recommendScheme(baseFormData());
    const msme = result.all.find((s) => s.id === "msme_psu");
    expect(msme?.minDSCR).toBe(1.40);
  });
});
