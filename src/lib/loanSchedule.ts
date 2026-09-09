/**
 * loanSchedule.ts — Term Loan amortisation, mirroring
 * backend/calculations/loan_schedule.py EXACTLY (half-yearly equal-principal,
 * reducing balance — NOT the EMI formula). The backend has never used EMI
 * for the fixed-capital term loan; several frontend spots independently
 * approximated interest/principal with their own ad-hoc formula (the
 * standard EMI formula, a flat-interest EMI-lookalike, or a "x0.9" reducing-
 * balance guess) — each producing a DIFFERENT, backend-disagreeing number.
 * This is the ONE place that should be used everywhere a Year-1 (or any
 * year's) interest/principal split is needed on the frontend.
 */

export interface LoanScheduleYear {
  year: number;
  openingBalance: number;
  interestPaid: number;
  principalPaid: number;
  closingBalance: number;
  halfYearlyInstalment: number;
}

const Rs2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build the full term-loan schedule (one row per year until fully repaid).
 * Returns an empty-but-safe zero row when there's nothing to amortise.
 */
export function buildLoanSchedule(
  loanAmount: number,
  interestRatePct: number,
  tenureMonths: number,
  moratoriumMonths: number = 0,
): LoanScheduleYear[] {
  if (!(loanAmount > 0) || !(tenureMonths > 0)) {
    return [{ year: 1, openingBalance: 0, interestPaid: 0, principalPaid: 0, closingBalance: 0, halfYearlyInstalment: 0 }];
  }

  const annualRate = interestRatePct / 100;
  const tenureYears = Math.ceil(tenureMonths / 12);
  const moratoriumYears = Math.ceil(moratoriumMonths / 12);
  const repayYears = Math.max(tenureYears - moratoriumYears, 1);
  const halfInst = Rs2(loanAmount / (repayYears * 2));

  const rows: LoanScheduleYear[] = [];
  let balance = loanAmount;

  for (let yr = 1; yr <= tenureYears; yr++) {
    const opening = Rs2(balance);
    let interestPaid: number, principalPaid: number, closing: number;

    if (yr <= moratoriumYears) {
      interestPaid = Rs2(Rs2(opening * annualRate / 2) * 2);
      principalPaid = 0;
      closing = opening;
    } else {
      const ih1 = Rs2(opening * annualRate / 2);
      const mid = Rs2(Math.max(opening - halfInst, 0));
      const ih2 = Rs2(mid * annualRate / 2);
      interestPaid = Rs2(ih1 + ih2);
      principalPaid = Rs2(halfInst * 2);
      closing = Rs2(Math.max(opening - principalPaid, 0));
    }

    rows.push({
      year: yr,
      openingBalance: opening,
      interestPaid,
      principalPaid,
      closingBalance: closing,
      halfYearlyInstalment: halfInst,
    });
    balance = closing;
  }

  return rows;
}

/** Year-1 interest + principal — the figure most "quick estimate" UI needs. */
export function getYear1LoanFigures(
  loanAmount: number,
  interestRatePct: number,
  tenureMonths: number,
  moratoriumMonths: number = 0,
): { interestPaid: number; principalPaid: number } {
  const schedule = buildLoanSchedule(loanAmount, interestRatePct, tenureMonths, moratoriumMonths);
  return { interestPaid: schedule[0].interestPaid, principalPaid: schedule[0].principalPaid };
}

/**
 * CA-standard DSCR for a single year:
 *   DSCR = (Cash Accruals + TL Interest) / (TL Principal + TL Interest)
 * Cash Accruals here means PAT + Depreciation (or a reasonable proxy —
 * callers building a quick estimate without a full P&L may pass
 * pre-tax/pre-depreciation operating profit, which is still far closer
 * to correct than omitting the interest add-back entirely).
 */
export function calculateDscr(cashAccruals: number, interestPaid: number, principalPaid: number): number {
  const denominator = principalPaid + interestPaid;
  if (denominator <= 0) return 0;
  return Rs2((cashAccruals + interestPaid) / denominator);
}
