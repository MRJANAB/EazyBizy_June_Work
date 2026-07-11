import { CMAFormData } from "@/types/cma";

/**
 * CMA_DEMO_DATA — a fully-worked, bankable sample proposal used by the public
 * Credit Analyst Demo. Values are tuned so the engine returns an APPROVED /
 * RECOMMEND verdict (strong promoter stake, healthy margin, comfortable DSCR),
 * so a CA / banker / visitor can see exactly what a "gets approved" file looks
 * like. All figures are illustrative and for demonstration only.
 */
export const CMA_DEMO_DATA: CMAFormData = {
  applicant: {
    name: "Anil Deshmukh",
    father_spouse_name: "Vasant Deshmukh",
    dob: "1982-06-15",
    pan: "AXIPD1234K",
    aadhaar: "2233 4455 6677",
    mobile: "9822011223",
    email: "anil@deshmukhpoly.in",
    address: "Plot 42, Chakan MIDC",
    city: "Pune",
    state: "Maharashtra",
    pincode: "410501",
    education: "B.Tech (Polymer), MBA",
    experience_years: 12,
  },
  business: {
    entity_name: "Deshmukh Polymers Pvt Ltd",
    constitution: "Pvt Ltd",
    activity: "Manufacturing",
    gst_number: "27AAECD1234K1Z9",
    udyam_registration: "UDYAM-MH-26-0045678",
    iec: "AAECD1234K",
    commencement_date: "2025-04-01",
  },
  loan: {
    purpose: "Setup of injection-moulding unit for auto components",
    loan_type: "Term Loan + Cash Credit",
    scheme: "CGTMSE / Stand-Up India",
    amount: 2100000,
    preferred_bank: "Bank of Maharashtra",
    tenure_months: 84,
    moratorium_months: 6,
    interest_rate: 10.5,
  },
  project_cost: {
    land: 0, building: 1000000, plant_machinery: 1200000, electrical: 100000,
    furniture: 50000, computers: 40000, vehicles: 0, office_equipment: 60000,
    generator_ups: 50000, preliminary_expenses: 30000, registration_license: 20000,
    consultancy_fees: 30000, marketing_launch: 20000, contingency: 30000,
    initial_stock: 400000, cash_margin: 300000, receivables_support: 300000,
  },
  means_of_finance: {
    promoter_contribution: 1530000, unsecured_loans: 0, subsidy: 0,
    term_loan: 2100000, working_capital_loan: 700000, other_funding: 0,
  },
  historical_financials: [],
  products: [
    { product_name: "Moulded Auto Components", unit: "Nos", purchase_cost: 550,
      selling_price: 1000, monthly_qty: 1000, growth_pct: 8 },
  ],
  manpower: [
    { designation: "Machine Operator", headcount: 5, monthly_salary: 16000, annual_increment_pct: 8 },
    { designation: "Supervisor", headcount: 1, monthly_salary: 30000, annual_increment_pct: 8 },
  ],
  opex: {
    rent: 0, electricity: 15000, water: 1500, telephone: 1000, internet: 1200,
    transport: 4000, repair: 2500, stationery: 800, marketing: 2500, insurance: 2000,
    professional_fees: 2000, misc: 1500,
  },
  wc_norms: {
    rm_holding_days: 30, wip_days: 10, fg_days: 15,
    receivable_days: 30, creditor_days: 30, cash_holding_days: 7,
  },
  export_sales_pct: 15,
  depreciation_rates: {
    building: 5, plant_machinery: 10, furniture: 10, vehicles: 15, computers: 40, office_equipment: 10,
  },
  tax_rate: 25,
  promoter_net_worth: {
    residential_property: 4500000, commercial_property: 0, fd: 800000, savings: 400000,
    mutual_funds: 300000, shares: 150000, gold: 500000, other_assets: 0, liabilities: 600000,
  },
  guarantor: { name: "Sujata Deshmukh", relation: "Spouse", net_worth: 2500000 },
  collateral: {
    primary_security: "Hypothecation of plant & machinery and entire current assets",
    collateral_items: [
      { type: "Property", description: "Residential flat at Baner, Pune", market_value: 4500000, forced_sale_value: 3600000, owner: "Anil Deshmukh" },
      { type: "FD/NSC", description: "Lien on bank fixed deposit", market_value: 800000, forced_sale_value: 800000, owner: "Anil Deshmukh" },
    ],
    cgtmse_covered: true,
    cgtmse_coverage_pct: 75,
    cgtmse_fee_pct: 1,
    insurance_arranged: true,
  },
  ca_recommendation: {
    rating: "green",
    recommendation: "Recommend",
    notes: "Well-margined proposal; recommended for sanction with standard covenants.",
    strengths: "Promoter brings 42% equity; 45% gross margin; DSCR comfortably above 1.5x; collateral cover ~3.5x.",
    weaknesses: "First-generation entrepreneur; dependence on the auto-sector demand cycle.",
    risk_mitigants: "CGTMSE 75% guarantee; collateral FSV 1.57x of exposure; fire & allied perils insurance assigned to the bank.",
    covenants: [
      "Hypothecation of plant & machinery and current assets to be perfected before first disbursement",
      "Promoter to maintain minimum 40% stake through the loan tenure",
      "Quarterly stock & book-debt statements to be submitted",
      "Insurance on hypothecated assets to be kept current with the bank as loss-payee",
    ],
  },
  assumptions: {
    revenue_growth: 8, cogs_growth: 5, expense_growth: 5, salary_increment: 8, interest_change: 0,
  },
};
