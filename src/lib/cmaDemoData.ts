import { CMAFormData } from "@/types/cma";

/**
 * Public Credit Analyst Demo — six fully-worked, APPROVED (RECOMMEND) sample
 * proposals, ONE PER LOAN SCHEME. Unlike a single template scaled up/down, each
 * one is a DIFFERENT business (sector, products, manpower, cost structure and
 * financing) so a CA / banker / visitor can see how a bankable file looks across
 * very different cases.
 *
 * Every set of figures was calibrated against the actual CMA engine so each
 * proposal returns RECOMMEND with a REALISTIC, believable DSCR (~2.6–4.1) — not
 * an implausible number — and each carries a scheme-appropriate capital
 * structure (subsidy / CGTMSE cover / collateral). All figures are illustrative.
 */

const DEPR = { building: 5, plant_machinery: 10, furniture: 10, vehicles: 15, computers: 40, office_equipment: 10 };
const ASSUMPTIONS = { revenue_growth: 8, cogs_growth: 5, expense_growth: 5, salary_increment: 8, interest_change: 0 };

type Product = { name: string; unit: string; pc: number; sp: number; qty: number };
type Staff = { role: string; heads: number; salary: number };
type Item = { type: string; description: string; mv: number; fsv: number; owner: string };

interface Cfg {
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
  applicant: string;
  fatherSpouse: string;
  pan: string;
  city: string;
  address: string;
  experience: number;
  tenure: number;
  moratorium: number;
  rate: number;
  exportPct: number;
  projectCost: CMAFormData["project_cost"];
  promoter: number;
  subsidy: number;
  wcLoan: number;
  products: Product[];
  manpower: Staff[];
  opex: CMAFormData["opex"];
  wcNorms: CMAFormData["wc_norms"];
  netWorth: CMAFormData["promoter_net_worth"];
  guarantor: { name: string; relation: string; net_worth: number };
  primarySecurity: string;
  cgtmse: boolean;
  cgtmsePct: number;
  collateralItems: Item[];
  strengths: string;
  weaknesses: string;
  mitigants: string;
  covenants: string[];
}

function build(c: Cfg): CMAFormData {
  const pcTotal = Object.values(c.projectCost).reduce((a, b) => a + b, 0);
  const termLoan = pcTotal - c.promoter - c.subsidy;
  return {
    applicant: {
      name: c.applicant, father_spouse_name: c.fatherSpouse, dob: "1985-06-15",
      pan: c.pan, aadhaar: "2233 4455 6677", mobile: "9822011223",
      email: "applicant@demo.eazybizy.in", address: c.address, city: c.city,
      state: "Maharashtra", pincode: "411001", education: "Graduate / Diploma",
      experience_years: c.experience,
    },
    business: {
      entity_name: c.entity, constitution: c.constitution, activity: "Manufacturing",
      gst_number: "27ABCDE1234K1Z5", udyam_registration: "UDYAM-MH-26-0045678",
      iec: c.exportPct > 0 ? "ABCDE1234K" : undefined, commencement_date: "2025-04-01",
    },
    loan: {
      purpose: c.purpose, loan_type: "Term Loan + Cash Credit", scheme: c.scheme,
      amount: termLoan, preferred_bank: c.bank, tenure_months: c.tenure,
      moratorium_months: c.moratorium, interest_rate: c.rate,
    },
    project_cost: c.projectCost,
    means_of_finance: {
      promoter_contribution: c.promoter, unsecured_loans: 0, subsidy: c.subsidy,
      term_loan: termLoan, working_capital_loan: c.wcLoan, other_funding: 0,
    },
    historical_financials: [],
    products: c.products.map((p) => ({
      product_name: p.name, unit: p.unit, purchase_cost: p.pc,
      selling_price: p.sp, monthly_qty: p.qty, growth_pct: 8,
    })),
    manpower: c.manpower.map((m) => ({
      designation: m.role, headcount: m.heads, monthly_salary: m.salary, annual_increment_pct: 8,
    })),
    opex: c.opex,
    wc_norms: c.wcNorms,
    export_sales_pct: c.exportPct,
    depreciation_rates: DEPR,
    tax_rate: 25,
    promoter_net_worth: c.netWorth,
    guarantor: c.guarantor,
    collateral: {
      primary_security: c.primarySecurity,
      collateral_items: c.collateralItems.map((i) => ({
        type: i.type, description: i.description, market_value: i.mv,
        forced_sale_value: i.fsv, owner: i.owner,
      })),
      cgtmse_covered: c.cgtmse,
      cgtmse_coverage_pct: c.cgtmse ? c.cgtmsePct : 0,
      cgtmse_fee_pct: 1,
      insurance_arranged: true,
    },
    ca_recommendation: {
      rating: "green", recommendation: "Recommend",
      notes: `Bankable ${c.name} proposal; recommended for sanction with standard covenants.`,
      strengths: c.strengths, weaknesses: c.weaknesses, risk_mitigants: c.mitigants,
      covenants: c.covenants,
    },
    assumptions: ASSUMPTIONS,
  };
}

// ── Six distinct, engine-verified proposals ──────────────────────────────────
const CFGS: Cfg[] = [
  {
    id: "mudra_kishor", name: "Mudra Kishor", tagline: "Collateral-free micro loan · garment unit",
    loanRange: "₹50K – ₹5L", highlights: ["Collateral-free", "CGTMSE 85% cover", "Garment / tailoring"],
    scheme: "mudra_kishor", bank: "Bank of Baroda", entity: "Sharda Garments",
    purpose: "Setting up a school-uniform & readymade garment stitching unit",
    constitution: "Proprietorship", applicant: "Sharda Patil", fatherSpouse: "Vasant Patil",
    pan: "AAKPS1234K", city: "Ichalkaranji", address: "Textile Market Road", experience: 8,
    tenure: 60, moratorium: 3, rate: 11, exportPct: 0,
    projectCost: {
      land: 0, building: 0, plant_machinery: 180000, electrical: 20000, furniture: 30000,
      computers: 25000, vehicles: 0, office_equipment: 15000, generator_ups: 20000,
      preliminary_expenses: 10000, registration_license: 8000, consultancy_fees: 6000,
      marketing_launch: 8000, contingency: 10000, initial_stock: 120000, cash_margin: 40000,
      receivables_support: 50000,
    },
    promoter: 114000, subsidy: 0, wcLoan: 200000,
    products: [
      { name: "School uniform sets", unit: "Set", pc: 180, sp: 340, qty: 492 },
      { name: "Cotton kurtis", unit: "Pc", pc: 150, sp: 290, qty: 246 },
    ],
    manpower: [
      { role: "Tailor", heads: 4, salary: 12000 },
      { role: "Helper / Checker", heads: 2, salary: 8000 },
    ],
    opex: { rent: 6000, electricity: 4000, water: 500, telephone: 500, internet: 600, transport: 2500, repair: 800, stationery: 400, marketing: 1500, insurance: 700, professional_fees: 800, misc: 800 },
    wcNorms: { rm_holding_days: 25, wip_days: 5, fg_days: 15, receivable_days: 25, creditor_days: 20, cash_holding_days: 5 },
    netWorth: { residential_property: 1800000, commercial_property: 0, fd: 150000, savings: 120000, mutual_funds: 0, shares: 0, gold: 250000, other_assets: 0, liabilities: 200000 },
    guarantor: { name: "Vasant Patil", relation: "Spouse", net_worth: 900000 },
    primarySecurity: "Hypothecation of sewing machines and stock-in-trade",
    cgtmse: true, cgtmsePct: 85, collateralItems: [],
    strengths: "Promoter has 8 years' tailoring-line experience; ~47% gross margin on uniform sets; comfortable DSCR above 3x; steady institutional demand (schools).",
    weaknesses: "Micro-scale operation with thin fixed-cost cushion; seasonal uniform demand concentrated pre-academic-year.",
    mitigants: "CGTMSE 85% guarantee cover; product mix (uniforms + kurtis) smooths seasonality; conservative 25-day inventory norm.",
    covenants: ["Hypothecation of sewing machines to be perfected before first disbursement", "Promoter to maintain minimum 20% stake through the tenure", "Monthly stock statement to be submitted", "Machinery insurance kept current with the bank as loss-payee"],
  },
  {
    id: "mudra_tarun", name: "Mudra Tarun", tagline: "Collateral-free · spice & pickle processing",
    loanRange: "₹5L – ₹10L", highlights: ["Collateral-free", "CGTMSE 85% cover", "Food processing"],
    scheme: "mudra_tarun", bank: "Union Bank of India", entity: "Annapurna Foods",
    purpose: "Spice grinding and pickle-processing unit with a packaging line",
    constitution: "Proprietorship", applicant: "Ramesh Jadhav", fatherSpouse: "Sujata Jadhav",
    pan: "AAJPR1234K", city: "Nashik", address: "APMC Yard, Panchavati", experience: 10,
    tenure: 60, moratorium: 6, rate: 11, exportPct: 0,
    projectCost: {
      land: 0, building: 150000, plant_machinery: 350000, electrical: 40000, furniture: 25000,
      computers: 25000, vehicles: 0, office_equipment: 20000, generator_ups: 40000,
      preliminary_expenses: 15000, registration_license: 15000, consultancy_fees: 10000,
      marketing_launch: 15000, contingency: 15000, initial_stock: 180000, cash_margin: 60000,
      receivables_support: 75000,
    },
    promoter: 210000, subsidy: 0, wcLoan: 300000,
    products: [
      { name: "Packaged blended spices (200g)", unit: "Pack", pc: 45, sp: 95, qty: 2050 },
      { name: "Mango & mixed pickle (500g)", unit: "Jar", pc: 60, sp: 130, qty: 820 },
    ],
    manpower: [
      { role: "Processing operator", heads: 4, salary: 13000 },
      { role: "Packing staff", heads: 3, salary: 10000 },
    ],
    opex: { rent: 0, electricity: 9000, water: 2000, telephone: 800, internet: 800, transport: 4000, repair: 1500, stationery: 500, marketing: 3000, insurance: 1200, professional_fees: 1200, misc: 1000 },
    wcNorms: { rm_holding_days: 30, wip_days: 7, fg_days: 20, receivable_days: 25, creditor_days: 25, cash_holding_days: 7 },
    netWorth: { residential_property: 2500000, commercial_property: 0, fd: 250000, savings: 180000, mutual_funds: 0, shares: 0, gold: 350000, other_assets: 0, liabilities: 300000 },
    guarantor: { name: "Sujata Jadhav", relation: "Spouse", net_worth: 1200000 },
    primarySecurity: "Hypothecation of plant, machinery and inventory of the food unit",
    cgtmse: true, cgtmsePct: 85, collateralItems: [],
    strengths: "FSSAI-compliant food unit with ~50% gross margin; DSCR around 3x; local sourcing keeps raw-material cost stable; growing packaged-spice demand.",
    weaknesses: "First-generation food entrepreneur; shelf-life and quality-control sensitivity.",
    mitigants: "CGTMSE 85% guarantee cover; product insurance arranged; conservative receivable norm (25 days) limits WC stress.",
    covenants: ["Charge on plant, machinery & inventory to be perfected before disbursement", "Promoter to maintain minimum 20% stake through the tenure", "FSSAI licence to remain valid and displayed", "Quarterly stock & book-debt statements to be submitted"],
  },
  {
    id: "mudra_tarunplus", name: "Mudra TarunPlus", tagline: "Repeat borrower · auto-components machining",
    loanRange: "₹10L – ₹20L", highlights: ["Collateral-free", "Repeat borrower", "CNC machining"],
    scheme: "mudra_tarunplus", bank: "Canara Bank", entity: "Krishna Auto Works",
    purpose: "Expansion of a machined auto-components workshop (repeat Tarun borrower)",
    constitution: "Partnership", applicant: "Krishna Deshpande", fatherSpouse: "Anita Deshpande",
    pan: "AAFPK1234K", city: "Pune", address: "MIDC Bhosari", experience: 12,
    tenure: 72, moratorium: 6, rate: 10.75, exportPct: 0,
    projectCost: {
      land: 0, building: 200000, plant_machinery: 900000, electrical: 80000, furniture: 40000,
      computers: 40000, vehicles: 0, office_equipment: 30000, generator_ups: 60000,
      preliminary_expenses: 20000, registration_license: 15000, consultancy_fees: 20000,
      marketing_launch: 15000, contingency: 25000, initial_stock: 250000, cash_margin: 90000,
      receivables_support: 150000,
    },
    promoter: 418000, subsidy: 0, wcLoan: 450000,
    products: [
      { name: "Machined mounting brackets", unit: "Nos", pc: 95, sp: 185, qty: 1740 },
      { name: "Turned shafts", unit: "Nos", pc: 140, sp: 270, qty: 870 },
    ],
    manpower: [
      { role: "CNC operator", heads: 3, salary: 20000 },
      { role: "Machinist", heads: 3, salary: 16000 },
      { role: "Helper", heads: 2, salary: 11000 },
    ],
    opex: { rent: 12000, electricity: 18000, water: 1500, telephone: 1000, internet: 1200, transport: 6000, repair: 4000, stationery: 600, marketing: 2500, insurance: 2500, professional_fees: 2000, misc: 1500 },
    wcNorms: { rm_holding_days: 30, wip_days: 10, fg_days: 15, receivable_days: 35, creditor_days: 30, cash_holding_days: 7 },
    netWorth: { residential_property: 3200000, commercial_property: 500000, fd: 350000, savings: 200000, mutual_funds: 0, shares: 0, gold: 400000, other_assets: 0, liabilities: 450000 },
    guarantor: { name: "Anita Deshpande", relation: "Partner", net_worth: 1500000 },
    primarySecurity: "Hypothecation of CNC machines, tools and current assets",
    cgtmse: true, cgtmsePct: 75, collateralItems: [],
    strengths: "Repeat borrower with a clean prior track record; established OEM tie-ups; DSCR above 3x; skilled CNC workforce.",
    weaknesses: "Revenue concentrated on a few auto OEM buyers; sector demand cyclicality.",
    mitigants: "CGTMSE 75% guarantee cover; diversification into two component lines; buyer purchase orders on record.",
    covenants: ["First charge on CNC machinery to be perfected before disbursement", "Promoter/partners to maintain minimum 20% stake", "Quarterly stock & book-debt statements to be submitted", "Insurance on hypothecated assets kept current with the bank as loss-payee"],
  },
  {
    id: "pmegp", name: "PMEGP", tagline: "Govt margin-money subsidy · handicrafts",
    loanRange: "Max ₹50L (Mfg)", highlights: ["25% margin-money subsidy", "Low promoter stake", "Collateral-backed"],
    scheme: "pmegp", bank: "Punjab National Bank", entity: "Sahyadri Handicrafts",
    purpose: "New wooden-handicrafts & decor manufacturing unit under PMEGP",
    constitution: "Proprietorship", applicant: "Meena Kulkarni", fatherSpouse: "Anil Kulkarni",
    pan: "AAKPK1234K", city: "Sawantwadi", address: "Handicraft Cluster", experience: 9,
    tenure: 84, moratorium: 6, rate: 11, exportPct: 0,
    projectCost: {
      land: 0, building: 300000, plant_machinery: 700000, electrical: 60000, furniture: 50000,
      computers: 30000, vehicles: 0, office_equipment: 25000, generator_ups: 50000,
      preliminary_expenses: 25000, registration_license: 20000, consultancy_fees: 20000,
      marketing_launch: 30000, contingency: 25000, initial_stock: 300000, cash_margin: 120000,
      receivables_support: 115000,
    },
    promoter: 197000, subsidy: 492500, wcLoan: 350000,
    products: [
      { name: "Carved wooden decor pieces", unit: "Nos", pc: 210, sp: 430, qty: 594 },
      { name: "Wooden gift & utility items", unit: "Nos", pc: 120, sp: 250, qty: 675 },
    ],
    manpower: [
      { role: "Artisan / Carver", heads: 5, salary: 14000 },
      { role: "Finishing & polish staff", heads: 3, salary: 11000 },
    ],
    opex: { rent: 0, electricity: 10000, water: 1500, telephone: 800, internet: 1000, transport: 5000, repair: 2000, stationery: 600, marketing: 4000, insurance: 1800, professional_fees: 1500, misc: 1200 },
    wcNorms: { rm_holding_days: 35, wip_days: 12, fg_days: 20, receivable_days: 30, creditor_days: 25, cash_holding_days: 7 },
    netWorth: { residential_property: 2200000, commercial_property: 0, fd: 180000, savings: 150000, mutual_funds: 0, shares: 0, gold: 300000, other_assets: 0, liabilities: 250000 },
    guarantor: { name: "Anil Kulkarni", relation: "Spouse", net_worth: 1100000 },
    primarySecurity: "Hypothecation of woodworking machinery and stock",
    cgtmse: false, cgtmsePct: 0,
    collateralItems: [
      { type: "Property", description: "Residential house offered as collateral", mv: 2000000, fsv: 1600000, owner: "Meena Kulkarni" },
    ],
    strengths: "25% PMEGP margin-money subsidy sharply reduces the debt burden; high-markup handicraft product; DSCR above 4x; export-ready craft cluster.",
    weaknesses: "Low own-promoter cash margin (subsidy-supported); artisan skill dependency.",
    mitigants: "Government subsidy plus residential collateral cover; insurance assigned to bank; two product lines diversify demand.",
    covenants: ["PMEGP subsidy to be routed and adjusted as per scheme guidelines", "Residential collateral to be mortgaged before disbursement", "Promoter to retain the unit under own management for the lock-in period", "Quarterly stock statements to be submitted"],
  },
  {
    id: "cgtmse", name: "CGTMSE", tagline: "Credit-guarantee · plastic injection moulding",
    loanRange: "Up to ₹5 Cr", highlights: ["CGTMSE 75% guarantee", "Strong promoter stake", "15% exports"],
    scheme: "cgtmse", bank: "Bank of Maharashtra", entity: "Deshmukh Polymers Pvt Ltd",
    purpose: "Injection-moulding unit for plastic auto components and household items",
    constitution: "Pvt Ltd", applicant: "Anil Deshmukh", fatherSpouse: "Sujata Deshmukh",
    pan: "AXIPD1234K", city: "Pune", address: "MIDC Chakan", experience: 14,
    tenure: 84, moratorium: 6, rate: 10.5, exportPct: 15,
    projectCost: {
      land: 0, building: 1000000, plant_machinery: 1200000, electrical: 100000, furniture: 50000,
      computers: 40000, vehicles: 0, office_equipment: 60000, generator_ups: 50000,
      preliminary_expenses: 30000, registration_license: 20000, consultancy_fees: 30000,
      marketing_launch: 20000, contingency: 30000, initial_stock: 400000, cash_margin: 300000,
      receivables_support: 300000,
    },
    promoter: 1524600, subsidy: 0, wcLoan: 700000,
    products: [
      { name: "Moulded plastic auto components", unit: "Nos", pc: 42, sp: 82, qty: 6000 },
      { name: "Household moulded items", unit: "Nos", pc: 30, sp: 62, qty: 2700 },
    ],
    manpower: [
      { role: "Machine operator", heads: 6, salary: 17000 },
      { role: "QC inspector", heads: 2, salary: 20000 },
      { role: "Supervisor", heads: 1, salary: 30000 },
    ],
    opex: { rent: 0, electricity: 25000, water: 2500, telephone: 1500, internet: 1500, transport: 8000, repair: 5000, stationery: 1000, marketing: 4000, insurance: 3500, professional_fees: 3000, misc: 2000 },
    wcNorms: { rm_holding_days: 30, wip_days: 10, fg_days: 15, receivable_days: 30, creditor_days: 30, cash_holding_days: 7 },
    netWorth: { residential_property: 4500000, commercial_property: 0, fd: 800000, savings: 400000, mutual_funds: 300000, shares: 150000, gold: 500000, other_assets: 0, liabilities: 600000 },
    guarantor: { name: "Sujata Deshmukh", relation: "Director", net_worth: 2500000 },
    primarySecurity: "Hypothecation of moulding machines, moulds and entire current assets",
    cgtmse: true, cgtmsePct: 75,
    collateralItems: [
      { type: "Property", description: "Residential flat (self-owned)", mv: 4500000, fsv: 3600000, owner: "Anil Deshmukh" },
      { type: "FD/NSC", description: "Lien on bank fixed deposit", mv: 800000, fsv: 800000, owner: "Anil Deshmukh" },
    ],
    strengths: "Strong 42% promoter stake; 15% export orders diversify revenue; DSCR around 2.8x; full collateral plus CGTMSE cover; ~48% contribution margin.",
    weaknesses: "Polymer raw-material price volatility linked to crude; power-intensive process.",
    mitigants: "CGTMSE 75% guarantee plus residential + FD collateral; fire & allied-perils insurance assigned to the bank; export receivables in convertible currency.",
    covenants: ["Hypothecation and mortgage of collateral to be perfected before first disbursement", "Promoter to maintain minimum 40% stake through the loan tenure", "Quarterly stock & book-debt statements to be submitted", "Insurance on hypothecated assets kept current with the bank as loss-payee"],
  },
  {
    id: "normal_msme", name: "MSME PSU Bank Loan", tagline: "Standard PSU term + WC · precision engineering",
    loanRange: "₹1 Cr+", highlights: ["No subsidy / guarantee", "Strong 29% promoter", "Full collateral cover"],
    scheme: "normal_msme", bank: "State Bank of India", entity: "Meridian Engineering Pvt Ltd",
    purpose: "Greenfield precision-engineering plant for sub-assemblies and machined parts",
    constitution: "Pvt Ltd", applicant: "Vikram Rao", fatherSpouse: "Latha Rao",
    pan: "AAECM1234K", city: "Pune", address: "Talegaon MIDC", experience: 18,
    tenure: 96, moratorium: 6, rate: 9.75, exportPct: 20,
    projectCost: {
      land: 0, building: 4000000, plant_machinery: 6000000, electrical: 500000, furniture: 200000,
      computers: 200000, vehicles: 0, office_equipment: 300000, generator_ups: 300000,
      preliminary_expenses: 120000, registration_license: 80000, consultancy_fees: 150000,
      marketing_launch: 100000, contingency: 150000, initial_stock: 1600000, cash_margin: 800000,
      receivables_support: 1200000,
    },
    promoter: 4620000, subsidy: 0, wcLoan: 2800000,
    products: [
      { name: "Precision machined components", unit: "Nos", pc: 190, sp: 360, qty: 4080 },
      { name: "Engineered sub-assemblies", unit: "Nos", pc: 820, sp: 1550, qty: 680 },
    ],
    manpower: [
      { role: "Design / Production engineer", heads: 4, salary: 45000 },
      { role: "CNC operator", heads: 10, salary: 22000 },
      { role: "QC inspector", heads: 3, salary: 25000 },
      { role: "Supervisor", heads: 2, salary: 35000 },
    ],
    opex: { rent: 0, electricity: 90000, water: 8000, telephone: 4000, internet: 5000, transport: 25000, repair: 18000, stationery: 3000, marketing: 15000, insurance: 12000, professional_fees: 10000, misc: 8000 },
    wcNorms: { rm_holding_days: 30, wip_days: 12, fg_days: 18, receivable_days: 35, creditor_days: 30, cash_holding_days: 7 },
    netWorth: { residential_property: 9000000, commercial_property: 3000000, fd: 2000000, savings: 800000, mutual_funds: 1200000, shares: 600000, gold: 800000, other_assets: 0, liabilities: 2500000 },
    guarantor: { name: "Latha Rao", relation: "Director", net_worth: 6000000 },
    primarySecurity: "First charge on land, building, plant & machinery and current assets",
    cgtmse: false, cgtmsePct: 0,
    collateralItems: [
      { type: "Property", description: "Factory land & building", mv: 12000000, fsv: 9600000, owner: "Meridian Engineering Pvt Ltd" },
      { type: "Property", description: "Promoter residential property", mv: 6000000, fsv: 4800000, owner: "Vikram Rao" },
    ],
    strengths: "Experienced promoter (18 yrs); 29% promoter margin; 20% export orders; DSCR around 2.6x; full immovable collateral cover well above the exposure.",
    weaknesses: "Greenfield ramp-up risk; high fixed-cost base until capacity utilisation matures.",
    mitigants: "First charge on land & building plus promoter property; export order book; phased capacity build-up; comprehensive plant insurance assigned to the bank.",
    covenants: ["Equitable mortgage of factory and promoter property before first disbursement", "Promoter to maintain minimum 29% stake and not dilute without bank consent", "Monthly progress and quarterly stock/book-debt statements to be submitted", "DSCR to be maintained above 1.25x; insurance kept current with bank as loss-payee"],
  },
];

export interface DemoScheme {
  id: string;
  name: string;
  tagline: string;
  loanRange: string;
  highlights: string[];
  data: CMAFormData;
}

export const CMA_DEMO_SCHEMES: DemoScheme[] = CFGS.map((c) => ({
  id: c.id, name: c.name, tagline: c.tagline, loanRange: c.loanRange,
  highlights: c.highlights, data: build(c),
}));

// Backwards-compatible default (the CGTMSE scenario).
export const CMA_DEMO_DATA: CMAFormData =
  CMA_DEMO_SCHEMES.find((s) => s.id === "cgtmse")!.data;
