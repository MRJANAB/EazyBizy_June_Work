import { CMAFormData } from "@/types/cma";

/**
 * Public Credit Analyst Demo — a set of fully-worked, APPROVED (RECOMMEND)
 * sample proposals, ONE PER LOAN SCHEME, so a CA / banker / visitor can pick a
 * scheme and see exactly what a bankable file looks like end-to-end.
 *
 * Every scheme is derived by scaling one verified base economic template
 * (healthy 45% margin, comfortable DSCR) to the scheme's loan band and applying
 * scheme-specific finance (subsidy / CGTMSE / collateral). Because the economic
 * ratios are preserved, each one returns RECOMMEND from the engine.
 * All figures are illustrative and for demonstration only.
 */

// ── Base economic template (matches the verified backend scenario) ────────────
const BASE_PROJECT = {
  land: 0, building: 1000000, plant_machinery: 1200000, electrical: 100000,
  furniture: 50000, computers: 40000, vehicles: 0, office_equipment: 60000,
  generator_ups: 50000, preliminary_expenses: 30000, registration_license: 20000,
  consultancy_fees: 30000, marketing_launch: 20000, contingency: 30000,
  initial_stock: 400000, cash_margin: 300000, receivables_support: 300000,
};
const BASE_PROJECT_TOTAL = Object.values(BASE_PROJECT).reduce((a, b) => a + b, 0); // 3,630,000
const BASE_OPEX = {
  rent: 0, electricity: 15000, water: 1500, telephone: 1000, internet: 1200,
  transport: 4000, repair: 2500, stationery: 800, marketing: 2500, insurance: 2000,
  professional_fees: 2000, misc: 1500,
};
const BASE_NET_WORTH = {
  residential_property: 4500000, commercial_property: 0, fd: 800000, savings: 400000,
  mutual_funds: 300000, shares: 150000, gold: 500000, other_assets: 0, liabilities: 600000,
};

const scale = <T extends Record<string, number>>(o: T, f: number): T =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v * f)])) as T;

type CollateralLevel = "none" | "light" | "full";

interface SchemeCfg {
  id: string;
  name: string;
  tagline: string;
  loanRange: string;
  highlights: string[];
  scheme: string;
  bank: string;
  purpose: string;
  entity: string;
  constitution: CMAFormData["business"]["constitution"];
  activity: CMAFormData["business"]["activity"];
  applicantName: string;
  pan: string;
  projectCost: number;
  promoterPct: number;
  subsidyPct: number;
  tenure: number;
  moratorium: number;
  rate: number;
  cgtmse: boolean;
  cgtmsePct: number;
  collateral: CollateralLevel;
  exportPct: number;
}

function makeScheme(cfg: SchemeCfg): CMAFormData {
  const f = cfg.projectCost / BASE_PROJECT_TOTAL;
  const project_cost = scale(BASE_PROJECT, f);
  const pcTotal = Object.values(project_cost).reduce((a, b) => a + b, 0);
  const promoter = Math.round(pcTotal * cfg.promoterPct / 100);
  const subsidy = Math.round(pcTotal * cfg.subsidyPct / 100);
  const term_loan = pcTotal - promoter - subsidy;
  const wc_loan = Math.round(700000 * f);

  const collateral_items =
    cfg.collateral === "none"
      ? []
      : cfg.collateral === "light"
      ? [{ type: "Property", description: "Residential property offered as collateral", market_value: Math.round(3000000 * f), forced_sale_value: Math.round(2400000 * f), owner: cfg.applicantName }]
      : [
          { type: "Property", description: "Residential flat (self-owned)", market_value: Math.round(4500000 * f), forced_sale_value: Math.round(3600000 * f), owner: cfg.applicantName },
          { type: "FD/NSC", description: "Lien on bank fixed deposit", market_value: Math.round(800000 * f), forced_sale_value: Math.round(800000 * f), owner: cfg.applicantName },
        ];

  return {
    applicant: {
      name: cfg.applicantName, father_spouse_name: "Vasant Rao", dob: "1985-06-15",
      pan: cfg.pan, aadhaar: "2233 4455 6677", mobile: "9822011223",
      email: "applicant@demo.eazybizy.in", address: "MIDC Industrial Area",
      city: "Pune", state: "Maharashtra", pincode: "411001",
      education: "Graduate / Diploma", experience_years: 10,
    },
    business: {
      entity_name: cfg.entity, constitution: cfg.constitution, activity: cfg.activity,
      gst_number: "27ABCDE1234K1Z5", udyam_registration: "UDYAM-MH-26-0045678",
      iec: cfg.exportPct > 0 ? "ABCDE1234K" : undefined, commencement_date: "2025-04-01",
    },
    loan: {
      purpose: cfg.purpose, loan_type: "Term Loan + Cash Credit", scheme: cfg.scheme,
      amount: term_loan, preferred_bank: cfg.bank, tenure_months: cfg.tenure,
      moratorium_months: cfg.moratorium, interest_rate: cfg.rate,
    },
    project_cost,
    means_of_finance: {
      promoter_contribution: promoter, unsecured_loans: 0, subsidy,
      term_loan, working_capital_loan: wc_loan, other_funding: 0,
    },
    historical_financials: [],
    products: [
      { product_name: "Core Product / Service", unit: "Nos", purchase_cost: 550,
        selling_price: 1000, monthly_qty: Math.round(1000 * f), growth_pct: 8 },
    ],
    manpower: [
      { designation: "Operator / Staff", headcount: 5, monthly_salary: Math.round(16000 * f), annual_increment_pct: 8 },
      { designation: "Supervisor", headcount: 1, monthly_salary: Math.round(30000 * f), annual_increment_pct: 8 },
    ],
    opex: scale(BASE_OPEX, f),
    wc_norms: { rm_holding_days: 30, wip_days: 10, fg_days: 15, receivable_days: 30, creditor_days: 30, cash_holding_days: 7 },
    export_sales_pct: cfg.exportPct,
    depreciation_rates: { building: 5, plant_machinery: 10, furniture: 10, vehicles: 15, computers: 40, office_equipment: 10 },
    tax_rate: 25,
    promoter_net_worth: scale(BASE_NET_WORTH, f),
    guarantor: { name: "Sujata Rao", relation: "Spouse", net_worth: Math.round(2500000 * f) },
    collateral: {
      primary_security: "Hypothecation of plant & machinery and entire current assets",
      collateral_items,
      cgtmse_covered: cfg.cgtmse,
      cgtmse_coverage_pct: cfg.cgtmse ? cfg.cgtmsePct : 0,
      cgtmse_fee_pct: 1,
      insurance_arranged: true,
    },
    ca_recommendation: {
      rating: "green",
      recommendation: "Recommend",
      notes: `Bankable ${cfg.name} proposal; recommended for sanction with standard covenants.`,
      strengths: `Promoter brings ${cfg.promoterPct}% stake; ~45% gross margin; DSCR comfortably above 1.5x.` +
        (cfg.subsidyPct > 0 ? ` Govt subsidy of ${cfg.subsidyPct}% reduces debt burden.` : "") +
        (cfg.cgtmse ? " CGTMSE guarantee cover in place." : " Adequate collateral cover."),
      weaknesses: "First-generation entrepreneur; sector demand cyclicality.",
      risk_mitigants: (cfg.cgtmse ? `CGTMSE ${cfg.cgtmsePct}% guarantee; ` : "") +
        (cfg.collateral !== "none" ? "collateral security offered; " : "") +
        "fire & allied perils insurance assigned to the bank.",
      covenants: [
        "Hypothecation of assets to be perfected before first disbursement",
        `Promoter to maintain minimum ${cfg.promoterPct}% stake through the loan tenure`,
        "Quarterly stock & book-debt statements to be submitted",
        "Insurance on hypothecated assets kept current with the bank as loss-payee",
      ],
    },
    assumptions: { revenue_growth: 8, cogs_growth: 5, expense_growth: 5, salary_increment: 8, interest_change: 0 },
  };
}

export interface DemoScheme {
  id: string;
  name: string;
  tagline: string;
  loanRange: string;
  highlights: string[];
  data: CMAFormData;
}

const CFGS: SchemeCfg[] = [
  { id: "mudra_kishor", name: "Mudra Kishor", tagline: "Collateral-free micro loan", loanRange: "₹50K – ₹5L",
    highlights: ["Collateral-free", "CGTMSE 85% cover", "Light CMA"], scheme: "mudra_kishor",
    bank: "Bank of Baroda", purpose: "Working capital for a small garment unit", entity: "Sharda Garments",
    constitution: "Proprietorship", activity: "Manufacturing", applicantName: "Sharda Patil", pan: "AAKPS1234K",
    projectCost: 500000, promoterPct: 20, subsidyPct: 0, tenure: 60, moratorium: 3, rate: 11,
    cgtmse: true, cgtmsePct: 85, collateral: "none", exportPct: 0 },
  { id: "mudra_tarun", name: "Mudra Tarun", tagline: "Collateral-free small enterprise loan", loanRange: "₹5L – ₹10L",
    highlights: ["Collateral-free", "CGTMSE 85% cover", "Full CMA"], scheme: "mudra_tarun",
    bank: "Union Bank of India", purpose: "Setup of a small food-processing unit", entity: "Annapurna Foods",
    constitution: "Proprietorship", activity: "Manufacturing", applicantName: "Ramesh Jadhav", pan: "AAJPR1234K",
    projectCost: 1000000, promoterPct: 20, subsidyPct: 0, tenure: 60, moratorium: 6, rate: 11,
    cgtmse: true, cgtmsePct: 85, collateral: "none", exportPct: 0 },
  { id: "mudra_tarunplus", name: "Mudra TarunPlus", tagline: "For repaid Tarun borrowers", loanRange: "₹10L – ₹20L",
    highlights: ["Collateral-free", "Repeat borrower", "Full CMA"], scheme: "mudra_tarunplus",
    bank: "Canara Bank", purpose: "Expansion of an auto-components workshop", entity: "Krishna Auto Works",
    constitution: "Partnership", activity: "Manufacturing", applicantName: "Krishna Deshpande", pan: "AAFPK1234K",
    projectCost: 2000000, promoterPct: 22, subsidyPct: 0, tenure: 72, moratorium: 6, rate: 10.75,
    cgtmse: true, cgtmsePct: 75, collateral: "none", exportPct: 0 },
  { id: "pmegp", name: "PMEGP", tagline: "Govt subsidy scheme", loanRange: "Max ₹50L (Mfg)",
    highlights: ["25% margin-money subsidy", "Low promoter stake", "Collateral-backed"], scheme: "pmegp",
    bank: "Punjab National Bank", purpose: "New handicrafts manufacturing unit under PMEGP", entity: "Sahyadri Handicrafts",
    constitution: "Proprietorship", activity: "Manufacturing", applicantName: "Meena Kulkarni", pan: "AAKPK1234K",
    projectCost: 2500000, promoterPct: 10, subsidyPct: 25, tenure: 84, moratorium: 6, rate: 11,
    cgtmse: false, cgtmsePct: 0, collateral: "light", exportPct: 0 },
  { id: "cgtmse", name: "CGTMSE", tagline: "Govt credit-guarantee scheme", loanRange: "Up to ₹5 Cr",
    highlights: ["CGTMSE 75% guarantee", "Strong promoter stake", "Full collateral"], scheme: "cgtmse",
    bank: "Bank of Maharashtra", purpose: "Injection-moulding unit for auto components", entity: "Deshmukh Polymers Pvt Ltd",
    constitution: "Pvt Ltd", activity: "Manufacturing", applicantName: "Anil Deshmukh", pan: "AXIPD1234K",
    projectCost: 3630000, promoterPct: 42, subsidyPct: 0, tenure: 84, moratorium: 6, rate: 10.5,
    cgtmse: true, cgtmsePct: 75, collateral: "full", exportPct: 15 },
  { id: "normal_msme", name: "MSME PSU Bank Loan", tagline: "Standard PSU term + WC facility", loanRange: "₹10 Cr+",
    highlights: ["No subsidy / guarantee", "Strong 30% promoter", "Full collateral cover"], scheme: "normal_msme",
    bank: "State Bank of India", purpose: "Greenfield precision-engineering plant", entity: "Meridian Engineering Pvt Ltd",
    constitution: "Pvt Ltd", activity: "Manufacturing", applicantName: "Vikram Rao", pan: "AAECM1234K",
    projectCost: 15000000, promoterPct: 30, subsidyPct: 0, tenure: 96, moratorium: 6, rate: 9.75,
    cgtmse: false, cgtmsePct: 0, collateral: "full", exportPct: 20 },
];

export const CMA_DEMO_SCHEMES: DemoScheme[] = CFGS.map((c) => ({
  id: c.id, name: c.name, tagline: c.tagline, loanRange: c.loanRange,
  highlights: c.highlights, data: makeScheme(c),
}));

// Backwards-compatible default (the CGTMSE scenario).
export const CMA_DEMO_DATA: CMAFormData =
  CMA_DEMO_SCHEMES.find((s) => s.id === "cgtmse")!.data;
