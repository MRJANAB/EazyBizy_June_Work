import { describe, it, expect } from "vitest";
import { calculateFinancialRatios } from "./loanRulesEngine";

describe(
  "calculateFinancialRatios — CA-standard DSCR with interest add-back " +
    "(BUG FIX: old formula was annualProfit / (EMI x 12), missing the " +
    "+Interest add-back on both sides entirely, which systematically " +
    "understated DSCR, especially in early loan years when interest is " +
    "high relative to principal)",
  () => {
    it("matches (CashAccruals + Interest) / (Principal + Interest) exactly", () => {
      const ratios = calculateFinancialRatios(
        1_000_000, // projectCost
        700_000,   // loanAmount
        300_000,   // promoterContribution (equity)
        1_200_000, // annualRevenue
        900_000,   // annualExpense
        140_000,   // annualPrincipalRepayment
        60_000,    // annualInterest
      );
      // annualProfit = 300,000; debtService = 200,000
      // dscr = (300,000 + 60,000) / 200,000 = 1.8
      expect(ratios.dscr).toBeCloseTo(1.8, 6);
      expect(ratios.debt_equity_ratio).toBeCloseTo(700_000 / 300_000, 6);
      expect(ratios.roe).toBeCloseTo(100, 6);
      expect(ratios.gross_margin).toBeCloseTo(25, 6);
    });

    it("returns 0 DSCR (not NaN/Infinity) when there is no debt service", () => {
      const ratios = calculateFinancialRatios(
        1_000_000, 0, 300_000, 1_200_000, 900_000, 0, 0,
      );
      expect(ratios.dscr).toBe(0);
    });

    it("the interest add-back means DSCR is higher than the old (buggy) formula would give", () => {
      const annualProfit = 300_000;
      const principal = 140_000;
      const interest = 60_000;
      const ratios = calculateFinancialRatios(
        1_000_000, 700_000, 300_000, 1_200_000, 900_000, principal, interest,
      );
      const oldBuggyDscr = annualProfit / (principal + interest); // no +interest add-back
      expect(ratios.dscr).toBeGreaterThan(oldBuggyDscr);
    });
  },
);
