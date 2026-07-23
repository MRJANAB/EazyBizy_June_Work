/**
 * caAdvisory.ts
 * =============
 * Live CA / banker-style suggestions for the loan wizard, computed PURELY from
 * what the applicant has entered — NO AI, NO API. Every function is a plain
 * calculation over GTABFormData and returns a small, renderable suggestion.
 *
 * A suggestion tells the applicant how a value compares to what a banker looks
 * for and, when there is a single clean number that fixes it, an `apply` payload
 * the UI can one-click into the form. The corrected value then flows to the
 * backend and the generated report exactly like a hand-typed one.
 */

import type { GTABFormData } from "@/types/gtab";
import { getFinancingPlan, getProjectCostBreakdown, getBankFinancePctBand } from "@/lib/projectReport";

export type AdvisoryTone = "good" | "warn" | "info";

export interface Advisory {
  tone: AdvisoryTone;
  message: string;
  /** When set, the UI shows a one-click button that writes `apply.patch` into the form. */
  apply?: { label: string; patch: Partial<GTABFormData> };
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/**
 * Minimum promoter margin (own contribution as % of project cost) a banker
 * expects per scheme. PMEGP/Mudra are subsidised and allow thinner margins;
 * plain bank finance wants more skin in the game.
 */
const MIN_PROMOTER_MARGIN_PCT: Record<string, number> = {
  pmegp: 10,
  mudra_shishu: 10,
  mudra_kishor: 10,
  mudra: 10,
  mudra_tarun: 10,
  mudra_tarunplus: 10,
  cgtmse: 15,
  normal_msme: 25,
  other_scheme: 20,
};

/** Project-cost ceiling per scheme (₹). 0 = no hard ceiling. */
const PROJECT_COST_CEILING: Record<string, number> = {
  mudra_shishu: 50000,
  mudra_kishor: 500000,
  mudra: 500000,
  mudra_tarun: 1000000,
  mudra_tarunplus: 2000000,
};
const pmegpCeiling = (formData: GTABFormData) =>
  ["service", "trading"].includes(formData.industry_type) ? 1000000 : 2500000;

// ── Step 5: Capital Expenditure ──────────────────────────────────────────────

/** Land + building should not dominate fixed capital — banks fund productive assets. */
export function adviseLandBuildingShare(formData: GTABFormData): Advisory | null {
  const { fixedAssetCost } = getProjectCostBreakdown(formData);
  if (fixedAssetCost <= 0) return null;
  const landBuilding = Number(formData.land_cost || 0) + Number(formData.shed_building_cost || 0);
  const share = (landBuilding / fixedAssetCost) * 100;
  if (share <= 45) {
    return { tone: "good", message: `Land & building are ${share.toFixed(0)}% of fixed capital — a healthy, productive-asset-led mix banks like.` };
  }
  return {
    tone: "warn",
    message: `Land & building are ${share.toFixed(0)}% of fixed capital. Banks prefer under 45% (rest in machinery/productive assets). Consider trimming or clearly justifying the premises cost.`,
  };
}

/** Total project cost vs the scheme's ceiling. */
export function adviseProjectCostCeiling(formData: GTABFormData): Advisory | null {
  const ceiling = PROJECT_COST_CEILING[formData.loan_scheme] ??
    (formData.loan_scheme === "pmegp" ? pmegpCeiling(formData) : 0);
  if (!ceiling) return null;
  const { totalProjectCost } = getProjectCostBreakdown(formData);
  if (totalProjectCost <= 0) return null;
  if (totalProjectCost <= ceiling) {
    return { tone: "good", message: `Project cost ${inr(totalProjectCost)} is within the ${inr(ceiling)} scheme ceiling.` };
  }
  return {
    tone: "warn",
    message: `Project cost ${inr(totalProjectCost)} exceeds the scheme ceiling of ${inr(ceiling)}. The bank will cap eligibility — reduce cost or pick a higher-limit scheme.`,
  };
}

// ── Step 6 / 9: Promoter margin (the top approval lever) ─────────────────────

/**
 * Promoter's own margin vs the scheme minimum. When it's short, the clean fix is
 * to lower Bank Finance on Fixed Capital % (term_loan_pct) — so we compute the
 * exact % that lifts the margin to the minimum and offer it as a one-click apply.
 */
export function advisePromoterMargin(formData: GTABFormData): Advisory | null {
  const plan = getFinancingPlan(formData);
  if (plan.totalProjectCost <= 0 || plan.fixedAssetCost <= 0) return null;
  const minPct = MIN_PROMOTER_MARGIN_PCT[formData.loan_scheme] ?? 20;
  const current = plan.promoterEquityPct;

  if (current >= minPct) {
    return { tone: "good", message: `Promoter margin ${current.toFixed(1)}% meets the ${minPct}% this scheme expects. Good approval signal.` };
  }

  // Solve the term-loan % that brings margin to exactly minPct:
  //   promoterContribution = totalProjectCost * minPct/100
  //   (fixedAsset − fixedAsset*tlPct/100) + wcMargin = totalProjectCost*minPct/100
  const wcMargin = plan.promoterWorkingCapitalContribution;
  const targetPromoterProject = (plan.totalProjectCost * minPct) / 100 - wcMargin;
  const rawTlPct = (1 - targetPromoterProject / plan.fixedAssetCost) * 100;
  const [bandMin, bandMax] = getBankFinancePctBand(formData);
  const suggestedTlPct = Math.max(bandMin, Math.min(bandMax, Math.floor(rawTlPct)));

  const base: Advisory = {
    tone: "warn",
    message: `Promoter margin is ${current.toFixed(1)}% — below the ${minPct}% this scheme expects. A thin margin is a common rejection reason.`,
  };
  // Only offer apply if lowering the bank-finance % actually helps and differs from now.
  if (suggestedTlPct < plan.termLoanBankFinancePct) {
    base.message += ` Lowering Bank Finance on Fixed Capital to ${suggestedTlPct}% lifts your margin to about ${minPct}%.`;
    base.apply = {
      label: `Use ${suggestedTlPct}% bank finance`,
      patch: {
        project_report_inputs: {
          ...formData.project_report_inputs,
          dpr: { ...formData.project_report_inputs.dpr, term_loan_pct: suggestedTlPct },
        },
      },
    };
  } else {
    base.message += ` Increase promoter contribution or reduce project cost to strengthen it.`;
  }
  return base;
}

// ── Step 7: Operating expenses vs revenue ────────────────────────────────────

/** Rough operating-cost load vs monthly revenue — flags a business that looks loss-making on day one. */
export function adviseOpexToRevenue(formData: GTABFormData): Advisory | null {
  const monthlyOpex =
    Number(formData.monthly_rent || 0) + Number(formData.total_monthly_salary || 0) +
    Number(formData.raw_material_cost || 0) + Number(formData.electricity_water_cost || 0) +
    Number(formData.repair_maintenance_cost || 0) + Number(formData.transport_cost || 0) +
    Number(formData.telephone_internet_cost || 0) + Number(formData.marketing_cost || 0) +
    Number(formData.miscellaneous_cost || 0) + Number(formData.stationery_cost || 0);
  const cats = formData.project_report_inputs?.revenue?.product_categories ?? [];
  const monthlyRevenue = cats.reduce((s, i) =>
    s + (Number(i.fixed_revenue) || Number(i.units_monthly || 0) * Number(i.avg_price || 0)), 0)
    || Number(formData.expected_monthly_revenue || 0);
  if (monthlyOpex <= 0 || monthlyRevenue <= 0) return null;
  const marginPct = ((monthlyRevenue - monthlyOpex) / monthlyRevenue) * 100;
  if (marginPct >= 15) {
    return { tone: "good", message: `Operating margin ~${marginPct.toFixed(0)}% (revenue ${inr(monthlyRevenue)} vs costs ${inr(monthlyOpex)}/mo). Comfortable for debt service.` };
  }
  if (marginPct >= 0) {
    return { tone: "info", message: `Operating margin is thin (~${marginPct.toFixed(0)}%). Banks want headroom for EMI — recheck revenue lines or trim costs.` };
  }
  return { tone: "warn", message: `Monthly costs ${inr(monthlyOpex)} exceed revenue ${inr(monthlyRevenue)} — the business shows a loss before EMI. Revisit pricing/volumes on Step 9.` };
}

// ── dev self-check (runs only if explicitly imported in a test) ──────────────
export function __caAdvisorySelfCheck(): void {
  // Margin solve must clamp within the scheme band and only apply when it helps.
  const fd = {
    loan_scheme: "normal_msme",
    industry_type: "manufacturing",
    loan_purpose: "term_loan",
    working_capital_period: "monthly",
    working_capital_required: 0,
    land_cost: 0, shed_building_cost: 0, computers_cost: 0, furniture_cost: 0,
    electrification_cost: 0, racks_storage_cost: 0, transportation_cost: 0,
    machinery_installation_cost: 0, other_initial_expenditure: 0,
    plant_machinery: [{ cost: 1000000 }],
    project_report_inputs: { dpr: { term_loan_pct: 80, wc_loan_pct: 60, promoter_equity_pct: 30 }, revenue: { product_categories: [] } },
  } as unknown as GTABFormData;
  const a = advisePromoterMargin(fd);
  console.assert(a !== null, "expected an advisory");
  console.assert(a!.tone === "warn" && !!a!.apply, "80% bank finance on normal_msme should warn + offer apply");
}
