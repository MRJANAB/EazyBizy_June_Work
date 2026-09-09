import { describe, it, expect, afterEach } from "vitest";
import { validateSchemeEligibility, type SchemeDetails } from "./loanRulesEngine";
import { setSchemeRules, clearSchemeRulesStore } from "./schemeRulesStore";

const PMEGP_RULES = {
  subsidy_matrix: {
    General_Urban: { promoter_pct: 10, subsidy_pct: 15 },
    General_Rural: { promoter_pct: 10, subsidy_pct: 25 },
    Special_Urban: { promoter_pct: 5, subsidy_pct: 25 },
    Special_Rural: { promoter_pct: 5, subsidy_pct: 35 },
  },
};

function pmegpDetails(promoterContribution: number): SchemeDetails {
  return {
    loan_scheme: "pmegp",
    loan_amount_requested: 950_000,
    promoter_contribution: promoterContribution,
    project_cost: 1_000_000,
    industry_type: "manufacturing",
    area_type: "rural",
  };
}

describe("validateSchemeEligibility — PMEGP category-aware minimum promoter contribution", () => {
  afterEach(() => clearSchemeRulesStore());

  it(
    "pre-fetch: the generic promoter-% check falls back to the local flat 5% " +
      "(meant for Special category), so it does NOT itself flag a General " +
      "applicant contributing exactly 5% — only the separate PMEGP-specific " +
      "breakdown check (already category-aware) catches this",
    () => {
      const result = validateSchemeEligibility("pmegp", pmegpDetails(50_000), "general", true);
      // Still correctly ineligible overall (the PMEGP-specific check saves it),
      // but the generic check's own message is absent because 5% >= flat-5% fallback.
      expect(result.eligible).toBe(false);
      expect(result.errors.some((e) => e.startsWith("Promoter contribution must be at least 5%"))).toBe(false);
    },
  );

  it(
    "once Rules Master rules are loaded, the generic check itself now correctly " +
      "requires 10% for General category (converges with the PMEGP-specific check " +
      "instead of silently disagreeing with it)",
    () => {
      setSchemeRules("pmegp", PMEGP_RULES);
      const result = validateSchemeEligibility("pmegp", pmegpDetails(50_000), "general", true);
      expect(result.eligible).toBe(false);
      expect(result.errors.some((e) => e.startsWith("Promoter contribution must be at least 10%"))).toBe(true);
    },
  );

  it("a General applicant contributing the correct 10% is eligible", () => {
    setSchemeRules("pmegp", PMEGP_RULES);
    const result = validateSchemeEligibility("pmegp", pmegpDetails(100_000), "general", true);
    expect(result.eligible).toBe(true);
  });

  it("a Special-category applicant correctly needs only 5%, not the General 10%", () => {
    setSchemeRules("pmegp", PMEGP_RULES);
    const result = validateSchemeEligibility("pmegp", pmegpDetails(50_000), "sc", true);
    expect(result.eligible).toBe(true);
  });
});
