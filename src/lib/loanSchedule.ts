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
 *
 * Mirrors backend/calculations/loan_schedule.py's two CA-reviewer-driven
 * fixes — both of which must live here too, since this file exists
 * specifically to avoid disagreeing with the backend:
 *  1. Moratorium is tracked in HALF-YEAR units (round(months/6)), not
 *     whole years via Math.ceil(months/12) — the old whole-year version
 *     silently DOUBLED a 6-month moratorium to a full 12-month one.
 *  2. The half-yearly instalment is rounded to the nearest WHOLE RUPEE
 *     (not paisa) — the unit everything is actually displayed in — and
 *     the final half-year absorbs whatever residual that rounding
 *     leaves, so principal instalments always sum exactly to the loan
 *     amount instead of landing a few rupees short.
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

  const halfRate = interestRatePct / 100 / 2;
  const tenureYears = Math.ceil(tenureMonths / 12);
  const totalHalfYears = tenureYears * 2;
  const moratoriumHalfYears = Math.min(Math.round(moratoriumMonths / 6), totalHalfYears);
  const repayHalfYears = Math.max(totalHalfYears - moratoriumHalfYears, 1);
  const halfInst = Math.round(loanAmount / repayHalfYears);

  const rows: LoanScheduleYear[] = [];
  let balance = loanAmount;

  for (let yr = 1; yr <= tenureYears; yr++) {
    const opening = Rs2(balance);
    let bal = opening;

    const hy1 = 2 * yr - 1;
    const ih1 = Rs2(bal * halfRate);
    const repaidH1 = hy1 <= moratoriumHalfYears ? 0 : (hy1 === totalHalfYears ? bal : Math.min(halfInst, bal));
    bal = Rs2(Math.max(bal - repaidH1, 0));

    const hy2 = 2 * yr;
    const ih2 = Rs2(bal * halfRate);
    const repaidH2 = hy2 <= moratoriumHalfYears ? 0 : (hy2 === totalHalfYears ? bal : Math.min(halfInst, bal));
    const closing = Rs2(Math.max(bal - repaidH2, 0));

    const principalPaid = Rs2(repaidH1 + repaidH2);
    const interestPaid = Rs2(ih1 + ih2);

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
