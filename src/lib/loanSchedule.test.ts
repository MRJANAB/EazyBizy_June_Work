import { describe, it, expect } from "vitest";
import { buildLoanSchedule, getYear1LoanFigures, calculateDscr } from "./loanSchedule";

describe("buildLoanSchedule — matches backend/calculations/loan_schedule.py exactly", () => {
  it("pinned fixture: 1,245,680 @ 11.5%, 84mo tenure, 18mo moratorium", () => {
    // Verified byte-for-byte against a live Python run of calculate_loan_schedule
    // with the same inputs before this test was written. 18 months of
    // moratorium is 3 half-years (round(18/6)) — NOT the 4 half-years
    // Math.ceil(18/12)*2 would give — so Year 2's H1 is still moratorium
    // (no principal) while H2 already repays, matching the backend's
    // half-year-granularity moratorium tracking.
    const rows = buildLoanSchedule(1245680, 11.5, 84, 18);
    const expected = [
      { interestPaid: 143253.2, principalPaid: 0, closingBalance: 1245680 },
      { interestPaid: 143253.2, principalPaid: 113244, closingBalance: 1132436 },
      { interestPaid: 123718.61, principalPaid: 226488, closingBalance: 905948 },
      { interestPaid: 97672.49, principalPaid: 226488, closingBalance: 679460 },
      { interestPaid: 71626.37, principalPaid: 226488, closingBalance: 452972 },
      { interestPaid: 45580.25, principalPaid: 226488, closingBalance: 226484 },
      { interestPaid: 19534.13, principalPaid: 226484, closingBalance: 0 },
    ];
    expect(rows).toHaveLength(7);
    expected.forEach((exp, i) => {
      expect(rows[i].interestPaid).toBe(exp.interestPaid);
      expect(rows[i].principalPaid).toBe(exp.principalPaid);
      expect(rows[i].closingBalance).toBe(exp.closingBalance);
    });
  });

  it("BUG FIX: displayed principal instalments sum exactly to the loan amount", () => {
    // A CA reviewer caught this on the backend-generated PDF: loan
    // Rs.31,64,125 over 13 half-yearly instalments displayed as a flat
    // "Rs.2,43,394" (the paisa-precise 2,43,394.23, truncated for
    // display) — summing the displayed per-year figures landed Rs.3
    // short of the loan. Fixed by rounding the instalment to the nearest
    // whole rupee (the unit it's actually displayed in) and letting the
    // final half-year absorb the residual, on both backend and frontend.
    const rows = buildLoanSchedule(3164125, 10.5, 84, 6);
    expect(rows[0].halfYearlyInstalment).toBe(243394);
    expect(rows.reduce((sum, r) => sum + r.principalPaid, 0)).toBe(3164125);
    expect(rows[rows.length - 1].closingBalance).toBe(0);
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
