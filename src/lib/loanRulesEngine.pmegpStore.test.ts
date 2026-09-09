import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { calculatePMEGPSubsidy, calculatePMEGPPromoterContribution } from "./loanRulesEngine";
import { setSchemeRules, clearSchemeRulesStore } from "./schemeRulesStore";

describe("calculatePMEGPSubsidy / calculatePMEGPPromoterContribution — Rules Master integration", () => {
  afterEach(() => clearSchemeRulesStore());

  describe("before the backend rules have loaded (store empty)", () => {
    it("falls back to the local PMEGP_SUBSIDY_RULES constants", () => {
      expect(calculatePMEGPSubsidy(1_000_000, "general", "urban")).toBe(150_000); // 15%
      expect(calculatePMEGPSubsidy(1_000_000, "sc", "rural")).toBe(350_000); // 35%
    });

    it("falls back to the local PMEGP_PROMOTER_CONTRIBUTION_RULES constants", () => {
      expect(calculatePMEGPPromoterContribution(1_000_000, "general")).toBe(100_000); // 10%
      expect(calculatePMEGPPromoterContribution(1_000_000, "sc")).toBe(50_000); // 5%
    });
  });

  describe("once the backend rules are in the store", () => {
    beforeEach(() => {
      setSchemeRules("pmegp", {
        subsidy_matrix: {
          General_Urban: { promoter_pct: 10, subsidy_pct: 15 },
          General_Rural: { promoter_pct: 10, subsidy_pct: 25 },
          Special_Urban: { promoter_pct: 5, subsidy_pct: 25 },
          Special_Rural: { promoter_pct: 5, subsidy_pct: 35 },
        },
      });
    });

    it("uses the fetched subsidy_pct instead of the local constant", () => {
      expect(calculatePMEGPSubsidy(1_000_000, "general", "urban")).toBe(150_000);
      expect(calculatePMEGPSubsidy(1_000_000, "sc", "rural")).toBe(350_000);
    });

    it("uses the fetched promoter_pct instead of the local constant", () => {
      expect(calculatePMEGPPromoterContribution(1_000_000, "general")).toBe(100_000);
      expect(calculatePMEGPPromoterContribution(1_000_000, "sc")).toBe(50_000);
    });

    it("genuinely prefers the store even when it disagrees with the local constant", () => {
      // Prove this isn't just coincidentally reading the same numbers —
      // set a deliberately different value and confirm it wins.
      setSchemeRules("pmegp", {
        subsidy_matrix: {
          General_Urban: { promoter_pct: 10, subsidy_pct: 99 },
          General_Rural: { promoter_pct: 10, subsidy_pct: 25 },
          Special_Urban: { promoter_pct: 5, subsidy_pct: 25 },
          Special_Rural: { promoter_pct: 5, subsidy_pct: 35 },
        },
      });
      expect(calculatePMEGPSubsidy(1_000_000, "general", "urban")).toBe(990_000);
    });
  });
});
