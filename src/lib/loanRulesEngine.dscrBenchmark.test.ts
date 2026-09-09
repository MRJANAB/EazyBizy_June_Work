import { describe, it, expect, afterEach } from "vitest";
import {
  validateMudraEligibility,
  validateSchemeEligibility,
  validateFinancialRatios,
  generateBankScore,
  type SchemeDetails,
  type FinancialRatioResult,
  type ValidationResult,
  type SchemeEligibilityResult,
} from "./loanRulesEngine";
import { setSchemeRules, clearSchemeRulesStore } from "./schemeRulesStore";

const SHISHU_BENCHMARKS = { dscr_avg: 1.10, current_ratio: 1.20 };
const DEFAULT_BENCHMARKS = { dscr_avg: 1.25, current_ratio: 1.33 };

const ratios = (dscr: number, currentRatio = 2): FinancialRatioResult => ({
  debt_equity_ratio: 1,
  dscr,
  roe: 20,
  current_ratio: currentRatio,
  gross_margin: 30,
});

describe("DSCR/current-ratio benchmarks are scheme-specific, never a flat 1.25", () => {
  afterEach(() => clearSchemeRulesStore());

  describe("validateMudraEligibility", () => {
    it(
      "BUG (pre-fix documented): before the Rules Master rules are loaded, a Mudra " +
        "Shishu applicant at DSCR 1.15 was warned against the wrong (full-CMA) 1.25 bar",
      () => {
        const result = validateMudraEligibility("mudra_shishu", 40000, {
          full_name: "T", fathers_name: "", date_of_birth: "1990-01-01", gender: "male",
          educational_qual: "graduate", social_category: "general", pan_number: "",
          aadhaar_number: "", mobile_number: "", address: "",
        }, "manufacturing", ratios(1.15));
        // Without a fetched benchmark this falls back to the flat 1.25 default.
        expect(result.warnings.some((w) => w.includes("1.25"))).toBe(true);
      },
    );

    it("FIXED: once Shishu's real 1.10 benchmark is loaded, DSCR 1.15 is NOT warned", () => {
      setSchemeRules("mudra_shishu", { benchmarks: SHISHU_BENCHMARKS as any });
      const result = validateMudraEligibility("mudra_shishu", 40000, {
        full_name: "T", fathers_name: "", date_of_birth: "1990-01-01", gender: "male",
        educational_qual: "graduate", social_category: "general", pan_number: "",
        aadhaar_number: "", mobile_number: "", address: "",
      }, "manufacturing", ratios(1.15));
      expect(result.warnings.some((w) => w.includes("DSCR"))).toBe(false);
    });
  });

  describe("validateSchemeEligibility (Mudra branch)", () => {
    const details = (loanAmount: number): SchemeDetails => ({
      loan_scheme: "mudra_kishor",
      loan_amount_requested: loanAmount,
      promoter_contribution: loanAmount * 0.1,
      project_cost: loanAmount / 0.9,
      industry_type: "manufacturing",
    });

    it("uses Kishor's fetched 1.10 benchmark instead of the flat 1.25", () => {
      setSchemeRules("mudra_kishor", { benchmarks: SHISHU_BENCHMARKS as any });
      const result = validateSchemeEligibility("mudra_kishor", details(200000), "general", true, ratios(1.15));
      expect(result.warnings.some((w) => w.includes("DSCR below 1.25"))).toBe(false);
    });
  });

  describe("validateFinancialRatios", () => {
    it("flat fallback (no scheme) uses 1.25", () => {
      const result: ValidationResult = validateFinancialRatios(ratios(1.15));
      expect(result.warnings.some((w) => w.includes("DSCR < 1.25"))).toBe(true);
    });

    it("Mudra Shishu's fetched 1.10 benchmark clears the same DSCR of 1.15", () => {
      setSchemeRules("mudra_shishu", { benchmarks: SHISHU_BENCHMARKS as any });
      const result = validateFinancialRatios(ratios(1.15), "mudra_shishu");
      expect(result.warnings.some((w) => w.includes("DSCR"))).toBe(false);
    });
  });

  describe("generateBankScore", () => {
    const okValidation: ValidationResult = { is_valid: true, errors: [], warnings: [] };
    const okScheme: SchemeEligibilityResult = {
      is_valid: true, eligible: true, errors: [], warnings: [], scheme_name: "x", loan_amount_range: [0, 0],
    };

    it("a DSCR of 1.15 scores lower against the flat 1.25 default than against Shishu's real 1.10 bar", () => {
      const scoreDefault = generateBankScore(okValidation, okValidation, okScheme, ratios(1.15), 35, 2);
      setSchemeRules("mudra_shishu", { benchmarks: SHISHU_BENCHMARKS as any });
      const scoreShishu = generateBankScore(okValidation, okValidation, okScheme, ratios(1.15), 35, 2, "mudra_shishu");
      expect(scoreShishu.credit_score).toBeGreaterThan(scoreDefault.credit_score);
    });
  });
});
