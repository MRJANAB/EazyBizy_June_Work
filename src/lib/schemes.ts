/**
 * schemes.ts — Scheme configuration for Indian government loan schemes.
 * All ProjectCost, TermLoan, and MoF calculations must read from this config.
 * Never hardcode scheme percentages inside calculation functions.
 */

export interface SchemeConfig {
  tlPct: number;        // Term Loan as % of ProjectCost
  subsidyPct: number;   // Government subsidy/margin money as % of ProjectCost
  promoterPct: number;  // Promoter's equity contribution as % of ProjectCost
  maxLoan: number;      // Maximum bank loan amount in ₹
  cgfmuCover: boolean;  // Whether CGFMU/CGTMSE collateral-free cover applies
  tdrLockIn?: number;   // Lock-in years for TDR (PMEGP only)
}

export const SCHEMES: Record<string, SchemeConfig> = {
  MUDRA_SHISHU: {
    tlPct:       0.90,
    subsidyPct:  0.00,
    promoterPct: 0.10,
    maxLoan:     50_000,
    cgfmuCover:  true,
  },
  MUDRA_KISHOR: {
    tlPct:       0.90,
    subsidyPct:  0.00,
    promoterPct: 0.10,
    maxLoan:     500_000,
    cgfmuCover:  true,
  },
  MUDRA_TARUN: {
    tlPct:       0.90,
    subsidyPct:  0.00,
    promoterPct: 0.10,
    maxLoan:     1_000_000,
    cgfmuCover:  true,
  },
  PMEGP_URBAN: {
    tlPct:       0.75,
    subsidyPct:  0.15,
    promoterPct: 0.10,
    maxLoan:     2_500_000,
    cgfmuCover:  false,
    tdrLockIn:   3,
  },
  PMEGP_RURAL: {
    tlPct:       0.65,
    subsidyPct:  0.25,
    promoterPct: 0.10,
    maxLoan:     2_500_000,
    cgfmuCover:  false,
    tdrLockIn:   3,
  },
  CGTMSE: {
    tlPct:       0.85,
    subsidyPct:  0.00,
    promoterPct: 0.15,
    maxLoan:     20_000_000,
    cgfmuCover:  false,
  },
};

/**
 * Compute Means of Finance for a given project cost and scheme.
 * WC_Loan is NEVER included in MoF total — it's a separate revolving facility.
 */
export interface MeansOfFinance {
  promoterCash: number;    // Promoter's own equity contribution
  subsidyAmt: number;      // Government subsidy (PMEGP margin money)
  termLoan: number;        // Bank term loan
  mofTotal: number;        // Must equal ProjectCost exactly
  wcLoanNote: string;      // Note about separate WC revolving facility
}

export function computeMeansOfFinance(
  projectCost: number,
  scheme: SchemeConfig,
  wcLoan: number,
): MeansOfFinance {
  const termLoan    = Math.round(scheme.tlPct * projectCost);
  const subsidyAmt  = Math.round(scheme.subsidyPct * projectCost);
  const promoterCash = Math.round(projectCost - termLoan - subsidyAmt);
  const mofTotal    = promoterCash + subsidyAmt + termLoan;

  return {
    promoterCash,
    subsidyAmt,
    termLoan,
    mofTotal,
    wcLoanNote: `Working Capital Facility (Revolving): ₹${wcLoan.toLocaleString('en-IN')} — not part of project cost`,
  };
}

/**
 * Compute project cost per spec:
 *   PM_with_contingency = PM_base × (1 + contingencyPct)
 *   ProjectCost = Land + Building + PM_with_contingency + PrelimExpenses + WC_Margin
 *   WC_Margin = (1 - wcLoanPct) × WC_Required_Year1
 *
 * Returns { projectCost, pmWithContingency, wcLoan }
 */
export interface ProjectCostResult {
  projectCost: number;
  pmWithContingency: number;
  wcMargin: number;
  wcLoan: number;
}

export function computeProjectCost(params: {
  land: number;
  building: number;
  pmBase: number;
  contingencyPct: number;   // e.g. 0.05 for 5%
  prelimExpenses: number;
  wcRequiredY1: number;
  wcLoanPct: number;        // e.g. 0.60 for 60%
}): ProjectCostResult {
  const { land, building, pmBase, contingencyPct, prelimExpenses, wcRequiredY1, wcLoanPct } = params;

  const pmWithContingency = pmBase * (1 + contingencyPct);
  const wcMargin          = (1 - wcLoanPct) * wcRequiredY1;
  const wcLoan            = wcLoanPct * wcRequiredY1;
  const projectCost       = land + building + pmWithContingency + prelimExpenses + wcMargin;

  return { projectCost, pmWithContingency, wcMargin, wcLoan };
}

/**
 * Auto-calculate grossMarginPct from unit costs (READ-ONLY, never user-input).
 *   RM_at100pct = unitRate × annualQty
 *   grossMarginPct = (Revenue_at100pct - RM_at100pct) / Revenue_at100pct
 */
export function computeGrossMarginPct(
  revenueAt100pct: number,
  rmAt100pct: number,
): number {
  if (revenueAt100pct <= 0) return 0;
  return (revenueAt100pct - rmAt100pct) / revenueAt100pct;
}

/**
 * Compute RM cost at 100% capacity from unit costs (Section D).
 *   RM_at100pct = Σ (unitRate_i × annualQty_i)
 */
export interface RawMaterialItem {
  unitRate: number;       // ₹ per unit
  annualQty: number;      // units per year at 100% capacity
}

export function computeRMAt100pct(items: RawMaterialItem[]): number {
  return items.reduce((sum, item) => sum + item.unitRate * item.annualQty, 0);
}
