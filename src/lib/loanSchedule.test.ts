import { describe, it, expect } from "vitest";
import { buildLoanSchedule, getYear1LoanFigures, calculateDscr } from "./loanSchedule";

describe("buildLoanSchedule — matches backend/calculations/loan_schedule.py exactly", () => {
  it("pinned fixture: 1,245,680 @ 11.5%, 84mo tenure, 18mo moratorium", () => {
    // Verified byte-for-byte against a live Python run of calculate_loan_schedule
    // with the same inputs before this test was written.
    const rows = buildLoanSchedule(1245680, 11.5, 84, 18);
    const expected = [
      { interestPaid: 143253.2, principalPaid: 0, closingBalance: 1245680 },
      { interestPaid: 143253.2, principalPaid: 0, closingBalance: 1245680 },
      { interestPaid: 136090.54, principalPaid: 249136, closingBalance: 996544 },
      { interestPaid: 107439.9, principalPaid: 249136, closingBalance: 747408 },
      { interestPaid: 78789.26, principalPaid: 249136, closingBalance: 498272 },
      { interestPaid: 50138.62, principalPaid: 249136, closingBalance: 249136 },
      { interestPaid: 21487.98, principalPaid: 249136, closingBalance: 0 },
    ];
    expect(rows).toHaveLength(7);
    expected.forEach((exp, i) => {
      expect(rows[i].interestPaid).toBe(exp.interestPaid);
      expect(rows[i].principalPaid).toBe(exp.principalPaid);
      expect(rows[i].closingBalance).toBe(exp.closingBalance);
    });
  });

  it("no moratorium: principal starts repaying in Year 1", () => {
    const rows = buildLoanSchedule(500000, 10, 60, 0);
    expect(rows[0].principalPaid).toBeGreaterThan(0);
  });

  it("loan fully closes by the end of tenure", () => {
    const rows = buildLoanSchedule(500000, 10, 60, 0);
    expect(rows[rows.length - 1].closingBalance).toBe(0);
  });

  it("returns a safe zero row when there's no loan amount", () => {
    const rows = buildLoanSchedule(0, 10, 60, 0);
    expect(rows).toHaveLength(1);
    expect(rows[0].interestPaid).toBe(0);
  });

  it("getYear1LoanFigures returns the first row's figures", () => {
    const full = buildLoanSchedule(863760, 12, 60, 12);
    const y1 = getYear1LoanFigures(863760, 12, 60, 12);
    expect(y1.interestPaid).toBe(full[0].interestPaid);
    expect(y1.principalPaid).toBe(full[0].principalPaid);
  });
});

describe("calculateDscr — CA standard: (CashAccruals + Interest) / (Principal + Interest)", () => {
  it("matches the textbook formula exactly", () => {
    const dscr = calculateDscr(500000, 100000, 300000);
    expect(dscr).toBeCloseTo((500000 + 100000) / (300000 + 100000), 2);
  });

  it("returns 0 when there is no debt service (never divide by zero)", () => {
    expect(calculateDscr(500000, 0, 0)).toBe(0);
  });

  it("the interest add-back means DSCR is always >= cashAccruals/denominator alone", () => {
    const withAddBack = calculateDscr(500000, 100000, 300000);
    const withoutAddBack = 500000 / (300000 + 100000);
    expect(withAddBack).toBeGreaterThan(withoutAddBack);
  });
});
