import { describe, it, expect, afterEach } from "vitest";
import { advisePromoterMargin } from "./caAdvisory";
import { setSchemeRules, clearSchemeRulesStore } from "./schemeRulesStore";
import { INITIAL_FORM_DATA, type GTABFormData } from "@/types/gtab";

function pmegpFormData(): GTABFormData {
  return {
    ...INITIAL_FORM_DATA,
    loan_scheme: "pmegp",
    loan_purpose: "term_loan",
    social_category: "sc", // Special category
    area_type: "rural",
    land_cost: 0,
    shed_building_cost: 200_000,
    plant_machinery: [
      { id: "1", machine_name: "M", cost: 800_000, quantity: 1, unit_cost: 800_000, supplier_name: "", supplier_phone: "", supplier_email: "" },
    ],
    machinery_installation_cost: 0,
  } as GTABFormData;
}

const PMEGP_RULES = {
  subsidy_matrix: {
    General_Urban: { promoter_pct: 10, subsidy_pct: 15 },
    General_Rural: { promoter_pct: 10, subsidy_pct: 25 },
    Special_Urban: { promoter_pct: 5, subsidy_pct: 25 },
    Special_Rural: { promoter_pct: 5, subsidy_pct: 35 },
  },
};

describe("advisePromoterMargin — real bug found while wiring: PMEGP category-aware minimum", () => {
  afterEach(() => clearSchemeRulesStore());

  it(
    "BUG (pre-fix / pre-fetch): a Special-category applicant contributing exactly " +
      "the correct 5% was flagged as short of a flat 10% minimum that doesn't apply to them",
    () => {
      // Before the store is populated, minPct falls back to the local flat
      // MIN_PROMOTER_MARGIN_PCT.pmegp = 10, which ignores category entirely.
      const advisory = advisePromoterMargin(pmegpFormData());
      expect(advisory?.tone).toBe("warn");
      expect(advisory?.message).toContain("10%");
    },
  );

  it(
    "FIXED: once the Rules Master rules are loaded, the same Special/Rural " +
      "applicant's correct 5% contribution is recognised as meeting the (also 5%) minimum",
    () => {
      setSchemeRules("pmegp", PMEGP_RULES);
      const advisory = advisePromoterMargin(pmegpFormData());
      expect(advisory?.tone).toBe("good");
      expect(advisory?.message).toContain("5%");
    },
  );
});
