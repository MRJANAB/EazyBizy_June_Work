/**
 * cmaValidator.ts — Pre-submission report validator (V1–V12 checks).
 * Block PDF generation if any Critical errors exist.
 * Show warnings as advisory only.
 */

export type ValidationSeverity = 'critical' | 'warning';

export interface ValidationError {
  code: string;
  severity: ValidationSeverity;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  criticalErrors: ValidationError[];
  warnings: ValidationError[];
  all: ValidationError[];
}

export interface ReportDataForValidation {
  projectCost: number;
  termLoan: number;
  subsidyAmt: number;
  promoterCash: number;
  wcLoan: number;
  pmWithContingency: number;
  grossBlockPM: number;
  rmAt100pct: number;
  revenueAt100pct: number;

  years: Array<{
    year: number;
    capacityPct: number;
    revenue: number;
    rm: number;
    pat: number;
    closingCash: number;
    dscr: number;
    totalAssets: number;
    totalLiabilities: number;
  }>;

  sensitivityScenarios: Array<{
    monthlyRevenue: number;
    monthlyProfit: number;
  }>;

  costItemsSum: number;        // Sum of all project cost line items (excl. WC_Loan)
  wcLoanInMoF: boolean;        // True if WC_Loan was mistakenly added to MoF
}

function close(a: number, b: number, tol = 1): boolean {
  return Math.abs(a - b) <= tol;
}

/**
 * Run all V1–V12 validation checks.
 * Returns a ValidationResult object.
 * Call this BEFORE generating a PDF.
 */
export function validateReport(data: ReportDataForValidation): ValidationResult {
  const errors: ValidationError[] = [];

  function crit(code: string, message: string) {
    errors.push({ code, severity: 'critical', message });
  }
  function warn(code: string, message: string) {
    errors.push({ code, severity: 'warning', message });
  }

  const { projectCost, termLoan, subsidyAmt, promoterCash, wcLoan } = data;
  const mofTotal = promoterCash + subsidyAmt + termLoan;

  // V1: MoF total == ProjectCost (WC_Loan must NOT be in MoF)
  if (projectCost > 0 && !close(mofTotal, projectCost)) {
    crit('V1', `MoF total (₹${mofTotal.toLocaleString('en-IN')}) does not reconcile with Project Cost (₹${projectCost.toLocaleString('en-IN')}). Difference: ₹${Math.abs(mofTotal - projectCost).toLocaleString('en-IN')}.`);
  }

  // V2: Cost line items sum == ProjectCost
  if (data.costItemsSum > 0 && !close(data.costItemsSum, projectCost, projectCost * 0.01)) {
    crit('V2', `Cost line items sum (₹${data.costItemsSum.toLocaleString('en-IN')}) ≠ Project Cost (₹${projectCost.toLocaleString('en-IN')}).`);
  }

  // V3: WC_Loan must NOT appear inside MoF table
  if (data.wcLoanInMoF) {
    crit('V3', `WC Loan (₹${wcLoan.toLocaleString('en-IN')}) must not appear inside the Means of Finance table. It is a separate revolving facility.`);
  }

  // V4: TermLoan <= ProjectCost
  if (termLoan > projectCost) {
    crit('V4', `Term Loan (₹${termLoan.toLocaleString('en-IN')}) cannot exceed Project Cost (₹${projectCost.toLocaleString('en-IN')}).`);
  }

  // V5: Every year DSCR > 0
  for (const yr of data.years) {
    if (yr.dscr <= 0) {
      crit('V5', `Year ${yr.year}: DSCR is ${yr.dscr.toFixed(2)} (must be > 0). Check RM cost basis — likely RM is calculated from gross margin % instead of unit costs.`);
    }
  }

  // V6: Warn if all PAT are negative
  const allNegativePAT = data.years.every(yr => yr.pat < 0);
  if (allNegativePAT) {
    warn('V6', 'Project is loss-making in ALL 5 projected years. Revise revenue or cost inputs before submission.');
  }

  // V7: Every closing cash > 0
  for (const yr of data.years) {
    if (yr.closingCash < 0) {
      warn('V7', `Year ${yr.year}: Negative closing cash (₹${yr.closingCash.toLocaleString('en-IN')}). Additional liquidity support may be required.`);
    }
  }

  // V8: Sensitivity — higher revenue → higher PAT (not inverted)
  const sorted = [...data.sensitivityScenarios].sort((a, b) => a.monthlyRevenue - b.monthlyRevenue);
  for (let j = 1; j < sorted.length; j++) {
    const prev = sorted[j - 1];
    const curr = sorted[j];
    if (curr.monthlyRevenue > prev.monthlyRevenue && curr.monthlyProfit < prev.monthlyProfit - 1) {
      crit('V8', 'Sensitivity is inverted — higher revenue scenario has lower PAT. RM cost basis error: RM must be calculated from unit costs, not from gross margin %.');
      break;
    }
  }

  // V9: RM_YearN ≈ capacityPct[N] × RM_at100pct
  for (const yr of data.years) {
    const expectedRM = yr.capacityPct * data.rmAt100pct;
    if (data.rmAt100pct > 0 && !close(yr.rm, expectedRM, Math.max(1, expectedRM * 0.01))) {
      warn('V9', `Year ${yr.year}: RM (₹${yr.rm.toLocaleString('en-IN')}) ≠ ${(yr.capacityPct * 100).toFixed(0)}% × RM_at100 (₹${expectedRM.toLocaleString('en-IN')}). RM may not be scaling from unit costs.`);
    }
  }

  // V10: GrossBlock_PM == PM_with_contingency
  if (data.pmWithContingency > 0 && data.grossBlockPM > 0 && !close(data.grossBlockPM, data.pmWithContingency)) {
    warn('V10', `P&M gross block (₹${data.grossBlockPM.toLocaleString('en-IN')}) ≠ P&M with contingency (₹${data.pmWithContingency.toLocaleString('en-IN')}). Depreciation base should include contingency.`);
  }

  // V11: PromoterCash >= 0
  if (promoterCash < 0) {
    crit('V11', `Promoter contribution is negative (₹${promoterCash.toLocaleString('en-IN')}). Reduce term loan or increase project cost.`);
  }

  // V12: Balance sheet balances each year
  for (const yr of data.years) {
    if (!close(yr.totalAssets, yr.totalLiabilities)) {
      crit('V12', `Year ${yr.year}: Balance sheet does not balance. TotalAssets (₹${yr.totalAssets.toLocaleString('en-IN')}) ≠ TotalLiabilities (₹${yr.totalLiabilities.toLocaleString('en-IN')}). Diff: ₹${Math.abs(yr.totalAssets - yr.totalLiabilities).toLocaleString('en-IN')}.`);
    }
  }

  const criticalErrors = errors.filter(e => e.severity === 'critical');
  const warnings       = errors.filter(e => e.severity === 'warning');

  return {
    valid: criticalErrors.length === 0,
    criticalErrors,
    warnings,
    all: errors,
  };
}
