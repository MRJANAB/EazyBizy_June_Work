import {
  GTABFormData,
  ProjectReportInputs,
  mergeProjectReportInputs,
} from "@/types/gtab";
import { getMonthlyWorkingCapital } from "@/lib/workingCapital";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(Number(value || 0), min), max);

const titleize = (value?: string | null) =>
  value
    ? value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "";

const buildFullName = (formData: GTABFormData) =>
  [formData.first_name, formData.middle_name, formData.last_name].filter(Boolean).join(" ");

const getLoanType = (loanPurpose: GTABFormData["loan_purpose"]): ProjectReportInputs["loan"]["loan_type"] => {
  if (loanPurpose === "working_capital") return "Working Capital";
  if (loanPurpose === "term_and_working_capital") return "Composite";
  return "Term Loan";
};

export const getProjectCostBreakdown = (formData: GTABFormData) => {
  const includesWorkingCapital = formData.loan_purpose !== "term_loan";
  const monthlyWorkingCapital = getMonthlyWorkingCapital(
    Number(formData.working_capital_required || 0),
    formData.working_capital_period,
  );
  const promoterWorkingCapitalPct = includesWorkingCapital
    ? 100 - getWorkingCapitalBankFinancePct(formData)
    : 0;
  const promoterWorkingCapitalContribution = Number(
    ((monthlyWorkingCapital * promoterWorkingCapitalPct) / 100).toFixed(2),
  );
  const machineryLineTotal = formData.plant_machinery.reduce(
    (sum, item) => sum + (Number(item.cost) || 0),
    0,
  );
  const toolsInstallation = Number(formData.machinery_installation_cost || 0);
  const sectionCTotal = machineryLineTotal + toolsInstallation;

  const fixedAssetCost =
    Number(formData.land_cost || 0) +
    Number(formData.shed_building_cost || 0) +
    sectionCTotal +
    Number(formData.computers_cost || 0) +
    Number(formData.furniture_cost || 0) +
    Number(formData.electrification_cost || 0) +
    Number(formData.racks_storage_cost || 0) +
    Number(formData.transportation_cost || 0) +
    Number(formData.other_initial_expenditure || 0);

  return {
    fixedAssetCost,
    monthlyWorkingCapital,
    promoterWorkingCapitalContribution,
    totalProjectCost: Number((fixedAssetCost + promoterWorkingCapitalContribution).toFixed(2)),
  };
};

export const getEstimatedProjectCost = (formData: GTABFormData) =>
  getProjectCostBreakdown(formData).totalProjectCost;

// Scheme-specific TL % bands (CA/RBI norms)
const SCHEME_TL_BAND: Record<string, [number, number]> = {
  pmegp:           [60, 90],   // backend overrides with subsidy calc, but clamp display
  mudra_shishu:    [80, 95],
  mudra_kishor:    [80, 95],
  mudra:           [80, 95],   // legacy alias
  mudra_tarun:     [75, 85],
  mudra_tarunplus: [75, 85],
  cgtmse:          [75, 85],
  normal_msme:     [70, 80],
  other_scheme:    [60, 90],
};

// Allowed [min, max] band for Bank Finance on Fixed Capital %, per scheme.
// The UI uses this so the input can't be set below the scheme minimum (e.g.
// normal MSME can't go under 70%) — keeping the shown % and the calc in sync.
export const getBankFinancePctBand = (formData: GTABFormData): [number, number] =>
  SCHEME_TL_BAND[formData.loan_scheme] ?? [0, 100];

export const getBankFinancePct = (formData: GTABFormData) => {
  const merged  = mergeProjectReportInputs(formData.project_report_inputs);
  const raw     = Number(merged.dpr.term_loan_pct || 75);
  const band    = getBankFinancePctBand(formData);
  return clamp(raw, band[0], band[1]);
};

export const getWorkingCapitalBankFinancePct = (formData: GTABFormData) => {
  const merged = mergeProjectReportInputs(formData.project_report_inputs);
  return clamp(Number(merged.dpr.wc_loan_pct || 60), 0, 100);
};

const getConfiguredPromoterEquityPct = (formData: GTABFormData) => {
  const merged = mergeProjectReportInputs(formData.project_report_inputs);
  return clamp(Number(merged.dpr.promoter_equity_pct || 30), 0, 100);
};

export const getFinancingPlan = (formData: GTABFormData) => {
  const {
    fixedAssetCost,
    monthlyWorkingCapital,
    promoterWorkingCapitalContribution,
    totalProjectCost,
  } = getProjectCostBreakdown(formData);
  const termLoanBankFinancePct = getBankFinancePct(formData);
  const wcBankFinancePct = getWorkingCapitalBankFinancePct(formData);
  const includesTermLoan = formData.loan_purpose !== "working_capital";
  const includesWorkingCapital = formData.loan_purpose !== "term_loan";
  // CA standard: Term Loan applies to FIXED capital only (not total project cost)
  const termLoanAmount = includesTermLoan
    ? Number(((fixedAssetCost * termLoanBankFinancePct) / 100).toFixed(2))
    : 0;
  const workingCapitalLoan = includesWorkingCapital
    ? Number(((monthlyWorkingCapital * wcBankFinancePct) / 100).toFixed(2))
    : 0;
  // Promoter fixed equity = fixed capital − term loan
  const promoterProjectContribution = Number(
    Math.max(fixedAssetCost - termLoanAmount, 0).toFixed(2),
  );
  const totalBankFinance = Number((termLoanAmount + workingCapitalLoan).toFixed(2));
  // Total promoter contribution = fixed equity + WC margin
  const promoterContribution = Number(
    (promoterProjectContribution + promoterWorkingCapitalContribution).toFixed(2),
  );
  const totalFundingBase = Number((promoterContribution + totalBankFinance).toFixed(2));
  const promoterEquityPct = totalProjectCost
    ? Number(((promoterContribution / totalProjectCost) * 100).toFixed(2))
    : getConfiguredPromoterEquityPct(formData);
  const totalBankFinancePct = totalProjectCost
    ? Number(((termLoanAmount / totalProjectCost) * 100).toFixed(2))
    : 0;

  return {
    fixedAssetCost,
    monthlyWorkingCapital,
    totalProjectCost,
    totalFundingBase,
    termLoanBankFinancePct,
    wcBankFinancePct,
    termLoanAmount,
    workingCapitalLoan,
    totalBankFinance,
    totalBankFinancePct,
    promoterProjectContribution,
    promoterWorkingCapitalContribution,
    promoterContribution,
    promoterEquityPct,
  };
};

export const getDerivedEligibleLoanAmount = (formData: GTABFormData) =>
  getFinancingPlan(formData).totalBankFinance;

export const getPromoterEquityPct = (formData: GTABFormData) =>
  getFinancingPlan(formData).promoterEquityPct;

export const getNormalizedProjectReportInputs = (formData: GTABFormData): ProjectReportInputs => {
  const merged = mergeProjectReportInputs(formData.project_report_inputs);
  const fullName = buildFullName(formData);
  const financingPlan = getFinancingPlan(formData);
  const normalizedLoanAmount = financingPlan.totalBankFinance;
  const promoterContributionAmount = financingPlan.promoterContribution;

  return mergeProjectReportInputs({
    ...merged,
    promoter: {
      ...merged.promoter,
      full_name: merged.promoter.full_name || fullName,
      gender: merged.promoter.gender || titleize(formData.gender),
      educational_qual: merged.promoter.educational_qual || titleize(formData.education),
      social_category: merged.promoter.social_category || titleize(formData.social_category),
      mobile: merged.promoter.mobile || formData.contact_mobile,
      email: merged.promoter.email || formData.contact_email,
      address_line1: merged.promoter.address_line1 || formData.address_line_1,
      city: merged.promoter.city || formData.city,
      state: merged.promoter.state || formData.state,
      pincode: merged.promoter.pincode || formData.pincode,
    },
    business: {
      ...merged.business,
      business_name: merged.business.business_name || formData.business_entity_name,
      nature_of_business:
        merged.business.nature_of_business || formData.type_of_business || formData.business_description,
      business_type: merged.business.business_type || titleize(formData.registration_type),
      industry:
        merged.business.industry ||
        (formData.industry_type === "others" ? formData.industry_other : titleize(formData.industry_type)),
      store_address:
        merged.business.store_address ||
        [formData.address_line_1, formData.address_line_2].filter(Boolean).join(", "),
      store_city: merged.business.store_city || formData.city,
      store_state: merged.business.store_state || formData.state,
      store_pincode: merged.business.store_pincode || formData.pincode,
      target_market: merged.business.target_market || formData.target_market,
    },
    loan: {
      ...merged.loan,
      loan_scheme: merged.loan.loan_scheme || titleize(formData.loan_scheme),
      loan_type: merged.loan.loan_type || getLoanType(formData.loan_purpose),
      loan_amount: normalizedLoanAmount,
    },
    project_cost: {
      ...merged.project_cost,
      building_renovation: merged.project_cost.building_renovation || Number(formData.shed_building_cost || 0),
      plant_machinery_items:
        merged.project_cost.plant_machinery_items.length > 0
          ? merged.project_cost.plant_machinery_items
          : formData.plant_machinery,
      furniture_fixtures: merged.project_cost.furniture_fixtures || Number(formData.furniture_cost || 0),
      computers_peripherals:
        merged.project_cost.computers_peripherals || Number(formData.computers_cost || 0),
      electrification_wiring:
        merged.project_cost.electrification_wiring || Number(formData.electrification_cost || 0),
      additional_racks_storage:
        merged.project_cost.additional_racks_storage || Number(formData.racks_storage_cost || 0),
      transportation_vehicle:
        merged.project_cost.transportation_vehicle || Number(formData.transportation_cost || 0),
      preoperative_expenses:
        merged.project_cost.preoperative_expenses || Number(formData.other_initial_expenditure || 0),
    },
    promoter_contribution: {
      ...merged.promoter_contribution,
      own_savings: promoterContributionAmount || Number(formData.margin_money || 0),
      family_contribution: 0,
      other_sources: 0,
    },
    dpr: {
      ...merged.dpr,
      promoter_equity_pct: financingPlan.promoterEquityPct,
    },
  });
};

export const getProjectReportMachineryTotal = (formData: GTABFormData) =>
  getNormalizedProjectReportInputs(formData).project_cost.plant_machinery_items.reduce(
    (sum, item) =>
      sum +
      (Number(item.cost) ||
        (Number(item.quantity) || 1) * (Number(item.unit_cost) || 0)),
    0
  ) + Number(formData.machinery_installation_cost || 0);

export const getProjectReportPromoterContribution = (
  formData: GTABFormData,
  _totalProjectCost = getEstimatedProjectCost(formData),
) => getFinancingPlan(formData).promoterContribution;
