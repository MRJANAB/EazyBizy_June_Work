/**
 * Centralized CA Guidance Engine
 * Returns bank-approval-focused tips for each wizard step
 * based on industry type + loan scheme combination.
 */

export type Industry = "manufacturing" | "trading" | "service" | "agriculture" | "others";
export type LoanScheme =
  | "pmegp"
  | "mudra_shishu"
  | "mudra_kishor"
  | "mudra_tarun"
  | "mudra_tarunplus"
  | "cgtmse"
  | "normal_msme"
  | "other_scheme";

export interface CAContext {
  industry: string;
  scheme: string;
  isNewBusiness?: boolean;
  projectCost?: number;
  loanAmount?: number;
  areaType?: string;
  socialCategory?: string;
  expectedMonthlyRevenue?: number;
  totalMonthlyExpenses?: number;
}

const isMfg  = (i: string) => i === "manufacturing";
const isTrad = (i: string) => i === "trading";
const isSvc  = (i: string) => i === "service";
const isAgri = (i: string) => i === "agriculture" || i === "agro_processing";
const isPMEGP = (s: string) => s === "pmegp";
const isMudra = (s: string) => s.startsWith("mudra");
const isCGTMSE = (s: string) => s === "cgtmse";
const isNormal = (s: string) => s === "normal_msme" || s === "other_scheme";

// ─── STEP 3: Business & Loan Details ────────────────────────────────────────
export function getStep3Tips(ctx: CAContext): string[] {
  const { industry: ind, scheme, isNewBusiness, projectCost = 0, areaType, socialCategory } = ctx;
  const tips: string[] = [];

  // Industry-specific eligibility rule
  if (isTrad(ind) && isPMEGP(scheme)) {
    tips.push("PMEGP + Trading: Pure buying/selling WITHOUT any value addition is on the NEGATIVE LIST. You must show processing, packaging, or branding to stay eligible. Consult your DIC officer before applying.");
  } else if (isMfg(ind) && isPMEGP(scheme)) {
    const maxLoan = ctx.isNewBusiness === false ? "Rs. 1 Cr (2nd loan)" : "Rs. 50L";
    tips.push(`PMEGP + Manufacturing: Max loan ${maxLoan}. Project must generate minimum employment — 1 job per Rs. 1.5–2L of project cost. Banks verify headcount during inspection.`);
  } else if (isSvc(ind) && isPMEGP(scheme)) {
    tips.push("PMEGP + Service: Maximum eligible project cost is Rs. 20L for service units. Urban subsidy 15% (General) / 25% (Special category). Ensure your business is NOT in the negative list (beauty parlour/salon may be restricted in some states).");
  } else if (isAgri(ind) && isPMEGP(scheme)) {
    tips.push("PMEGP + Agriculture: Agro-processing and food processing units are eligible. Primary agriculture (crop farming) alone is NOT covered under PMEGP — you must add value (grinding, packaging, cold storage, etc.).");
  }

  // Scheme-specific tips
  if (isPMEGP(scheme)) {
    const subsidyPct = socialCategory === "sc" || socialCategory === "st"
      ? (areaType === "rural" ? "35%" : "25%")
      : (areaType === "rural" ? "25%" : "15%");
    tips.push(`PMEGP Subsidy: ${subsidyPct} of project cost — held as TDR for 3 years. You CANNOT withdraw this amount. Banks release it after 3-year lock-in if you repay EMIs on time.`);
    tips.push("PMEGP: New businesses only. UDYAM registration mandatory BEFORE applying. Obtain DIC recommendation letter and submit EDP training certificate.");
  } else if (isMudra(scheme)) {
    tips.push("Mudra loans are collateral-free by RBI mandate. If a bank demands property papers or guarantor for a Mudra loan, you can reject and go to any other PSU bank — it is against Mudra scheme guidelines.");
    if (scheme === "mudra_shishu") tips.push("Mudra Shishu (up to Rs. 50,000): Typically processed within 7 working days. Keep Aadhaar, PAN, shop address proof and a simple business plan ready.");
    else if (scheme === "mudra_kishor") tips.push("Mudra Kishor (Rs. 50K–5L): Banks may ask for ITR for existing businesses. New businesses need a basic DPR. CIBIL score above 700 significantly improves approval chances.");
    else if (scheme === "mudra_tarun" || scheme === "mudra_tarunplus") tips.push("Mudra Tarun/TarunPlus (Rs. 5L–20L): Full CMA report is mandatory. Banks scrutinize DSCR and Break-Even carefully. CIBIL score above 720 strongly recommended.");
  } else if (isCGTMSE(scheme)) {
    tips.push("CGTMSE: Government guarantee covers 75–85% of default. NO collateral required — bank cannot ask for property papers. Guarantee fee (0.5–2% p.a.) is charged on outstanding loan. New AND existing MSMEs are eligible.");
    if (isMfg(ind)) tips.push("CGTMSE + Manufacturing: Eligible for loans up to Rs. 5 Crore without collateral. Banks are comfortable approving larger amounts under CGTMSE for manufacturing because of the guarantee cover.");
    else if (isTrad(ind)) tips.push("CGTMSE + Trading: Ideal for traders who lack owned property. Stock/inventory is not valid collateral, so CGTMSE fills that gap. Keep purchase orders and supplier agreements ready.");
    else if (isSvc(ind)) tips.push("CGTMSE + Service: Perfect for service professionals (IT, healthcare, education) who have intellectual assets but no physical collateral. Bank will evaluate cash-flow quality.");
    else if (isAgri(ind)) tips.push("CGTMSE + Agro-processing: Eligible for units that add value to farm produce. Coverage up to Rs. 2 Crore for food processing. Seasonal repayment schedules can be negotiated with bank.");
  } else if (isNormal(scheme)) {
    if (isMfg(ind)) tips.push("Normal MSME Loan + Manufacturing: Bank will ask for collateral (property) worth ~133% of loan amount. Alternatively, apply under CGTMSE to avoid collateral requirement.");
    else if (isTrad(ind)) tips.push("Normal MSME Loan + Trading: Banks may insist on pledge of stock + property as security. Ensure your GST turnover and ITR match your projected sales — banks cross-verify these.");
    else if (isSvc(ind)) tips.push("Normal MSME Loan + Service: Banks look for recurring client contracts or purchase orders as surrogate collateral. Tie up 2–3 client contracts before applying.");
    else if (isAgri(ind)) tips.push("Normal MSME/Agri Loan: KCC (Kisan Credit Card) and NABARD-backed loans offer better terms for agri businesses. Check if any crop-specific scheme applies to your activity.");
    tips.push("Normal MSME PSU Loan: Promoter equity is 20–25% minimum. Banks verify equity contribution via bank statement (funds must show for 3+ months). DO NOT borrow equity from others.");
  }

  // Existing vs new business
  if (isNewBusiness) {
    tips.push("New business: Your DPR (this report) is the PRIMARY evaluation document. A realistic DSCR > 1.25 and Break-Even below 60% capacity are the two metrics banks look for most.");
  } else {
    tips.push("Existing business: Keep last 2 years' ITR + audited Balance Sheet + GST returns ready. Banks compare your historical profit with projected figures — ensure projections are consistent.");
  }

  return tips;
}

// ─── STEP 4: Business Description ───────────────────────────────────────────
export function getStep4Tips(ctx: CAContext): string[] {
  const { industry: ind, scheme } = ctx;
  const tips: string[] = [];

  // Industry-specific narrative tips
  if (isMfg(ind)) {
    tips.push("Manufacturing DPR: Your Business Overview MUST mention: (1) type of raw material and source, (2) key manufacturing process steps, (3) end product specifications, (4) BIS/FSSAI/other certifications if applicable.");
    tips.push("Technical Aspects section: State the installed capacity (units/day), working hours (1 or 2 shifts), and expected output. Banks verify this against machinery quoted in Step 5.");
    tips.push("Revenue projections CA norm: 50% capacity Y1 → 60% Y2 → 70% Y3 → 80% Y4 → 80% Y5. Starting above 60% in Y1 raises red flags with bank appraisers.");
  } else if (isTrad(ind)) {
    tips.push("Trading DPR: Business Overview must mention: (1) product categories traded, (2) key suppliers (state their city/credibility), (3) distribution channel (retail/wholesale/B2B), (4) average margin per product category.");
    tips.push("Market Aspects: Name your 3–5 biggest potential clients or retailer clusters. Banks see this as market validation. Mention any letters of intent (LOIs) or MoUs signed.");
    tips.push("Trading margins: Bank will verify your purchase-to-sale ratio. Typical GP margin 15–30% for FMCG trading, 20–40% for specialty goods. State this explicitly in Financial Aspects.");
  } else if (isSvc(ind)) {
    tips.push("Service DPR: Business Overview must mention: (1) exact services offered, (2) target client profile and their annual spend, (3) your pricing model (hourly/project/retainer), (4) any certifications or licences held.");
    tips.push("Management Aspects: Banks for service businesses look at the promoter's qualifications and client network. Mention any relevant degree, diploma, or certification. A signed client commitment (even email) strengthens this section.");
    tips.push("Financial Aspects: Service businesses have high EBITDA margins (40–60%). State this and explain why — low COGS, no inventory. Banks appreciate when you demonstrate understanding of your own financials.");
  } else if (isAgri(ind)) {
    tips.push("Agriculture/Agro DPR: Business Overview must state: (1) crop or produce type, (2) area under cultivation (acres/ha), (3) value addition method (drying, milling, packaging, cold storage), (4) market linkage (APMC, FPO, direct buyer).");
    tips.push("Technical Aspects: Mention weather risk mitigation — drip irrigation, poly-house, crop insurance (PMFBY). Banks for agri loans want to see risk management built into the plan.");
    tips.push("Market Aspects for Agri: Mention MSP availability, FPO/cooperative tie-ups, or buyer contracts. NABARD-supported businesses get faster processing if they show market-linked sales.");
  }

  // Scheme-specific narrative requirements
  if (isPMEGP(scheme)) {
    tips.push("PMEGP Report: The Introduction section must explicitly mention that the unit is NEW, located in the selected area (rural/urban), and that the promoter has completed EDP training. DIC verifies this.");
  } else if (isCGTMSE(scheme)) {
    tips.push("CGTMSE Report: Financial Aspects must demonstrate strong projected cash flow — this is the bank's primary comfort since there is no collateral. DSCR must be > 1.25 in Y1 and improving each year.");
  } else if (isMudra(scheme) && (scheme === "mudra_tarun" || scheme === "mudra_tarunplus")) {
    tips.push("Mudra Tarun DPR: Your Financial Aspects must show a clear repayment plan. Banks look at: (1) revenue ramp-up, (2) EBITDA margin, (3) repayment as % of revenue. Keep repayment < 30% of monthly revenue.");
  }

  // Universal narrative tips
  tips.push("Promoter Experience: Even 1–2 years in a related field reduces perceived risk. Mention any apprenticeship, family business exposure, short-term courses, or prior employment — everything counts.");
  tips.push("Competitive Advantage must name at least 2 CONCRETE differentiators: location (nearest competitor X km away), cost advantage (own raw material / land), technology, quality certification, or anchor client relationships.");

  return tips;
}

// ─── STEP 5: Project Requirements ───────────────────────────────────────────
export function getStep5Tips(ctx: CAContext): string[] {
  const { industry: ind, scheme, projectCost = 0, loanAmount = 0 } = ctx;
  const tips: string[] = [];

  if (isMfg(ind)) {
    tips.push("Plant & Machinery: Bank requires quotations from at least 2 suppliers for each machine above Rs. 50,000. Quotations must be dated within 3 months of application. Get them on supplier letterhead.");
    tips.push("Factory Building: If rented, include monthly rent in Step 7. If constructing, attach building plan + construction cost estimate from a qualified engineer. Bank may send a field inspector.");
    tips.push("CA norm — Machinery Installation cost: typically 5–10% of machine cost. Electrification typically 3–5% of machine cost. Don't understate these — banks see them as signs of realistic planning.");
  } else if (isTrad(ind)) {
    tips.push("Trading Assets: List billing software/POS system, display racks, signage, delivery vehicle, and CCTV separately — each is a capital asset that gets depreciated and appears on Balance Sheet.");
    tips.push("Initial Stock / Inventory: This is Working Capital, NOT Fixed Capital. Include it in Step 8 (Working Capital), not here. Listing it as fixed capital is a common error that banks flag.");
    tips.push("Shop Renovation: Include interior work, flooring, false ceiling, AC installation, and electrical fittings. Bank inspector will visit the premises — it should match the amounts stated.");
  } else if (isSvc(ind)) {
    tips.push("Service Equipment: Computers, printers, diagnostic machines, salon equipment, gym equipment etc. — each needs a GST invoice from a registered dealer for bank records.");
    tips.push("Security Deposit (advance rent) is pre-operative expenditure — include it under 'Pre-Operative / Other Initial Expenditure'. This is a legitimate capital item banks accept.");
    tips.push("Software licenses and subscriptions (paid annually) are pre-operative costs IF paid upfront before commencement. Monthly recurring subscriptions go into Monthly Expenses (Step 7).");
  } else if (isAgri(ind)) {
    tips.push("Farm Equipment: Tractors, tillers, sprayers must be from registered dealers with GST invoices. Khasra/Khatauni (land records) must show your name as cultivator for agri-purpose loans.");
    tips.push("Irrigation Setup: Drip/sprinkler systems qualify as capital expenditure and get depreciation benefit. Cost must be certified by State Agriculture Department or empaneled agency for subsidized installation.");
    tips.push("Storage & Cold Chain: If including cold room/storage shed, get construction cost estimate from a civil contractor. NABARD has capital subsidy schemes for cold chain — check with your bank.");
  }

  if (isPMEGP(scheme)) {
    tips.push(`PMEGP Project Cost Limit: Manufacturing ≤ Rs. 50L, Service ≤ Rs. 20L (first loan). Second loan: Manufacturing ≤ Rs. 1 Cr. If your total is near the limit, verify with your DIC officer before proceeding.`);
  } else if (isCGTMSE(scheme)) {
    tips.push("CGTMSE: No collateral needed up to Rs. 5 Crore. However, your machinery/assets listed here become the bank's primary security (hypothecation). Accurate asset list = proper charge creation = smooth disbursement.");
  } else if (isMudra(scheme)) {
    tips.push(`Mudra Loan: Total project cost drives your loan eligibility. Shishu ≤ Rs. 50K, Kishor ≤ Rs. 5L, Tarun ≤ Rs. 10L, TarunPlus ≤ Rs. 20L. Include all assets to justify the loan amount you are requesting.`);
  } else if (isNormal(scheme)) {
    tips.push("Normal MSME: Bank will conduct a pre-sanction inspection of the site/premises. Project costs must match physical reality. Avoid inflating asset values — banks compare with market rates for your area.");
  }

  return tips;
}

// ─── STEP 6: Project Summary ─────────────────────────────────────────────────
export function getStep6Tips(ctx: CAContext): string[] {
  const { industry: ind, scheme, projectCost = 0, loanAmount = 0 } = ctx;
  const tips: string[] = [];

  // Industry-specific verification tips
  if (isMfg(ind)) {
    tips.push("Manufacturing: Total Project Cost must include ALL pre-operative expenses — installation, electrification, trial run costs, preliminary expenses. Banks deduct what's missing from sanctioned amount.");
    tips.push("Machinery value in project cost must match quotations provided. Bank may reduce loan amount if machinery cost appears inflated vs. market rate for that machine type.");
  } else if (isTrad(ind)) {
    tips.push("Trading: Separate Fixed Capital (shop assets) from Working Capital (inventory). A common rejection reason for trading loans is mixing initial stock purchase into fixed capital.");
    tips.push("Bank will verify your shop's monthly footfall potential vs. projected revenue. Keep your revenue projections within 5× the current locality's average retail turnover to avoid scrutiny.");
  } else if (isSvc(ind)) {
    tips.push("Service: Banks focus more on revenue quality (recurring clients vs. one-time) than asset value. If you have signed service contracts, attach them — they significantly strengthen the application.");
    tips.push("For service businesses, EBITDA margin > 40% is expected. If your projected margin is lower, explain the reason in the Business Description (Step 4 narrative).");
  } else if (isAgri(ind)) {
    tips.push("Agro-processing: Include crop/input cost in Working Capital (Step 8), not in Fixed Capital. Fixed capital = land development, shed, machinery only.");
    tips.push("NABARD subsidy (NHM, PMKSY, MIDH) may apply to your agri project — ask your bank's Agriculture Officer. These subsidies reduce the loan needed and improve your DSCR.");
  }

  // Scheme-specific summary tips
  if (isPMEGP(scheme)) {
    tips.push("PMEGP: Subsidy amount = Subsidy% × Total Project Cost. It is locked as TDR for 3 years. Your EMI is calculated on full loan amount including subsidy portion during lock-in. Plan cash flow accordingly.");
  } else if (isMudra(scheme)) {
    tips.push("Mudra: Loan amount must NOT exceed the scheme limit. If your project cost justifies a higher amount, consider switching to CGTMSE or Normal MSME for full funding coverage.");
  } else if (isCGTMSE(scheme)) {
    tips.push("CGTMSE: Annual guarantee fee (typically 1–1.5% of outstanding loan) is paid by the bank and may be passed on as a charge. Factor this into your EMI planning — it's slightly higher than collateral-based loans.");
  } else if (isNormal(scheme)) {
    tips.push("Normal MSME: Promoter equity must be invested FIRST (before bank releases funds). Banks typically disburse in tranches — 30% on sanction, 40% on progress, 30% on completion for construction projects.");
  }

  // Universal
  tips.push("DSCR > 1.25 is the minimum threshold for most banks. DSCR = Net Cash Accrual ÷ Loan Repayment (Principal + Interest). This is computed automatically in Step 9 — check it before submitting.");
  tips.push("Promoter's own contribution must be verifiable — 6 months bank statement showing funds. Cash/informal sources are NOT accepted. Banks may reject if they find equity was borrowed.");

  return tips;
}

// ─── STEP 7: Monthly Expenses ────────────────────────────────────────────────
export function getStep7Tips(ctx: CAContext): string[] {
  const { industry: ind, scheme, expectedMonthlyRevenue = 0, totalMonthlyExpenses = 0 } = ctx;
  const fmt = (n: number) => "Rs." + Math.round(n).toLocaleString("en-IN");
  const tips: string[] = [];

  // Industry COGS norms
  if (isMfg(ind)) {
    tips.push("Manufacturing COGS norm: Raw material should be 45–60% of revenue. Banks flag ratios below 35% (seems profitable on paper but not credible) or above 70% (barely viable). CA target: 50–55%.");
    tips.push("Salary for manufacturing: Minimum Wages Act compliance is mandatory. Banks verify worker count × wage against labour department rates for your state. Underpaying on paper raises labour law flags.");
    tips.push("Electricity cost must reflect actual plant load requirement. Banks cross-verify against machinery HP ratings — if your machines draw 25HP total, your electricity bill cannot be Rs. 2,000/month.");
  } else if (isTrad(ind)) {
    tips.push("Trading Purchase Cost (COGS) norm: 65–75% of revenue for FMCG/general trade. Specialty/niche goods: 55–65%. Gross Profit margin must be realistic — banks compare with industry benchmarks.");
    tips.push("Trading salaries: Keep staff count realistic for your shop size. A Rs. 5L loan shop shouldn't show 10 employees. Banks verify headcount against shop area and volume of operations.");
    tips.push("Transport/delivery cost: For distribution traders, this is a significant line item. State it separately — banks expect 3–8% of revenue for distribution businesses.");
  } else if (isSvc(ind)) {
    tips.push("Service COGS/Direct costs: Labour-intensive services (staffing, BPO, cleaning) = 50–65% of revenue. Skill-based services (IT, consulting, healthcare) = 20–40%. Ensure your ratio matches your service type.");
    tips.push("For service businesses, salary IS your primary cost. Banks want to see that your pricing model covers salaries + overheads with a minimum 25% net margin. Price below market to win business = red flag.");
    tips.push("Telephone/Internet/Software is a legitimate operational expense for service businesses. Include CRM, accounting software, cloud subscriptions — these are verifiable from bank/UPI statements.");
  } else if (isAgri(ind)) {
    tips.push("Agri input costs (seeds, fertilisers, pesticides) are seasonal — spread them over 12 months for P&L purposes. Banks use monthly average even for crop-cycle-based businesses.");
    tips.push("Farm labour is daily-wage based — show a realistic headcount per season. Banks for agri businesses refer to NABARD's benchmark costs for your crop type and region.");
    tips.push("Power/Irrigation cost for agriculture must reflect actual pump usage hours. NABARD benchmark: Rs. 2,000–8,000/month for 5–20 acres depending on crop and irrigation method.");
  }

  // Scheme-specific expense tips
  if (isPMEGP(scheme)) {
    tips.push("PMEGP Expense Scrutiny: All expenses are cross-checked against the DPR submitted to DIC. If monthly expenses are too low vs. project size, DIC may flag the application during verification.");
  } else if (isMudra(scheme) && (scheme === "mudra_tarun" || scheme === "mudra_tarunplus")) {
    tips.push("Mudra Tarun expense review: Your EBITDA (Revenue − These Expenses) ÷ Revenue must be > 25% for the bank to be confident you can service a Rs. 5–20L loan comfortably.");
  }

  // Live ratio tip
  if (expectedMonthlyRevenue > 0 && totalMonthlyExpenses > 0) {
    const ebitdaMonthly = expectedMonthlyRevenue - totalMonthlyExpenses;
    const ebitdaPct = Math.round((ebitdaMonthly / expectedMonthlyRevenue) * 100);
    if (ebitdaPct < 15) {
      tips.push(`Your current EBITDA margin is ${ebitdaPct}% (${fmt(ebitdaMonthly)}/month) — this is LOW. Banks typically require > 20% EBITDA margin to approve loans. Review your expense or revenue assumptions.`);
    } else if (ebitdaPct > 60) {
      tips.push(`Your current EBITDA margin is ${ebitdaPct}% — this seems high. Banks may question if all expenses are accounted for. Ensure rent, salary, electricity, and consumables are all entered.`);
    } else {
      tips.push(`Your current EBITDA margin is ${ebitdaPct}% (${fmt(ebitdaMonthly)}/month) — within acceptable range. This contributes to a positive DSCR, which is what banks evaluate.`);
    }
  }

  return tips;
}

// ─── STEP 8: Working Capital ─────────────────────────────────────────────────
export function getStep8Tips(ctx: CAContext): string[] {
  const { industry: ind, scheme } = ctx;
  const tips: string[] = [];

  if (isMfg(ind)) {
    tips.push("Manufacturing WC (Tandon Committee norm): Banks finance up to 75% of WC requirement as Bank WC Loan. Your 25% contribution (Promoter Margin) is included in Total Project Cost. Never understate WC — it causes operational stress in Y1.");
    tips.push("Manufacturing WC components: RM stock (15–30 days) + WIP (7–15 days production) + Finished Goods (15–30 days) + Debtors (30–60 days). Add these up to get your actual WC cycle.");
  } else if (isTrad(ind)) {
    tips.push("Trading WC norm: Stock holding (30–60 days of purchase) + Debtors (if credit sales: 15–45 days) − Creditors (if you get credit from suppliers: deduct 15–30 days). CA multiplier: 2× monthly expenses.");
    tips.push("Trading: If you buy on credit from suppliers (creditors), your WC requirement reduces. If you sell on credit (debtors), it increases. Tell your CA the exact credit terms for an accurate WC calculation.");
  } else if (isSvc(ind)) {
    tips.push("Service WC norm: Low inventory = low WC need. Mainly covers: salary payable for 1 month + advance payments to subcontractors + billing cycle gap (invoice to payment: 30–60 days). CA multiplier: 1.5× monthly.");
    tips.push("Service: If clients pay in advance (milestone-based contracts), your WC need reduces significantly. Mention advance payment terms in your contract — bank may adjust WC loan downwards, improving DSCR.");
  } else if (isAgri(ind)) {
    tips.push("Agriculture WC (NABARD norms): Full crop cycle from input purchase to sale proceeds = 3–6 months. CA multiplier: 3.5× for seasonal crops. KCC (Kisan Credit Card) is the most efficient instrument for agri WC.");
    tips.push("Agro-processing WC: Raw produce holding (7–15 days) + processing cycle (1–7 days) + finished goods (15–30 days) + buyer payment cycle (15–30 days) = total WC cycle. Compute each component separately.");
  }

  if (isPMEGP(scheme)) {
    tips.push("PMEGP + WC: Working Capital Loan is separate from PMEGP term loan. Your bank may sanction a CC (Cash Credit) limit alongside the PMEGP term loan. Ensure the application covers both funding requirements.");
  } else if (isMudra(scheme)) {
    tips.push("Mudra + WC: Mudra loans cover BOTH term loan (assets) and working capital (CC limit). If you need WC separately, apply for a Mudra CC in addition to the term loan — same branch, same scheme.");
  } else if (isCGTMSE(scheme)) {
    tips.push("CGTMSE covers both term loans AND working capital/CC limits up to Rs. 5 Crore total. If WC loan is also needed, ask your bank to include it under CGTMSE guarantee — no additional collateral.");
  }

  tips.push("Tandon Committee principle (RBI): Banks should finance WC so promoter contributes at least 25% as margin. A lower promoter margin is a risk signal — banks may reduce WC loan or ask for security.");

  return tips;
}

// ─── STEP 9: Project Report Inputs ───────────────────────────────────────────
export function getStep9Tips(ctx: CAContext): string[] {
  const { industry: ind, scheme } = ctx;
  const tips: string[] = [];

  if (isMfg(ind)) {
    tips.push("Manufacturing revenue = Installed Capacity × Capacity Utilisation% × Selling Price per Unit. Start at 50% utilisation in Y1. Banks compare this with your machinery specs — if the machine cannot produce that much, they will reduce the projections.");
    tips.push("COGS percentage for manufacturing should be 45–60% of revenue. Raw material cost drives COGS — enter monthly RM cost in Step 7 and this engine will compute it automatically.");
    tips.push("Depreciation: Machinery typically depreciates at 15% SLM or WDV. Building at 5% SLM. This is automatically computed. Ensure machinery cost in Step 5 is accurate — depreciation drives tax shield and Net Cash Accrual.");
  } else if (isTrad(ind)) {
    tips.push("Trading revenue = Units Sold × Selling Price per product. Enter each product category separately in the Products section. Banks verify: is total revenue achievable given your shop size and local market?");
    tips.push("Trading GP Margin = (Selling Price − Purchase Price) ÷ Selling Price × 100. Target: 20–35% GP margin. A GP below 15% makes loan repayment very difficult. A GP above 50% looks unrealistic without strong justification.");
    tips.push("Interest Rate: Use current bank's MCLR + spread. Typical range: 9.5–12.5% p.a. for MSME loans. Using 10.5% is standard for DPR projection. Match the actual rate quoted by your bank.");
  } else if (isSvc(ind)) {
    tips.push("Service revenue = Billing Rate × Units (hours/sessions/clients) × Utilisation. Y1 at 50% utilisation is CA norm. For subscription-based services, show Monthly Recurring Revenue (MRR) growing by 10–15% per year.");
    tips.push("Service businesses should show EBITDA margin 35–55%. If yours is lower, the bank will ask why. If higher, they may question if all costs are included. The engine calculates this from your Step 7 inputs.");
    tips.push("Tax Rate: 25% flat rate applies to most small businesses (Section 115BAC, new regime). Using 30% is conservative and safe for projections. NEVER use 0% — banks reject reports with zero tax projections.");
  } else if (isAgri(ind)) {
    tips.push("Agro-processing revenue = Output quantity × Selling price per unit. Input-to-output conversion ratio is critical — e.g., 100 kg paddy → 65–70 kg rice. Get the industry-standard conversion ratio from your CA or commodity board.");
    tips.push("Seasonal revenue variation: If your business is seasonal, the engine averages it over 12 months. Mention seasonal peaks in your Business Description so bank understands cash flow pattern.");
    tips.push("Agri subsidy income (PMFBY insurance, DBT, NHM subsidy): Do NOT include government subsidies in projected revenue for P&L — banks want to see viability WITHOUT subsidy dependence. Subsidies are treated as separate income below the line.");
  }

  // Scheme-specific DSCR guidance
  if (isPMEGP(scheme)) {
    tips.push("PMEGP DSCR: Minimum 1.25x required. Remember: during the 3-year subsidy lock-in, EMI is on FULL loan (including subsidy component). After lock-in, subsidy is adjusted — EMI drops. Project both scenarios in your DPR.");
  } else if (isMudra(scheme)) {
    tips.push(`Mudra DSCR: For Tarun/TarunPlus, banks require DSCR > 1.5x in all 5 years. If Y1 DSCR is below 1.25, consider: (1) reduce loan amount, (2) extend tenure, or (3) show higher revenue assumptions with supporting evidence.`);
  } else if (isCGTMSE(scheme)) {
    tips.push("CGTMSE DSCR: Bank is particularly careful here since there is no collateral. DSCR > 1.5x throughout projection period significantly improves sanction probability. Ensure this before submitting.");
  } else if (isNormal(scheme)) {
    tips.push("Normal MSME DSCR: PSU banks require DSCR > 1.33x (some require 1.5x). Internal Rate of Return (IRR) should be > bank's lending rate. Both metrics are computed in the generated report.");
  }

  tips.push("Interest Rate entry: Match the rate your bank has quoted in the sanction letter or term sheet. Typical range: 9.5–12.5%. Use 10.5% if not yet confirmed — standard CA projection rate for MSME.");
  tips.push("Tenure: Longer tenure = lower EMI = better DSCR but higher total interest paid. CA recommendation: 5 years for most MSME loans. Moratorium of 6–12 months recommended for greenfield projects (gives time to reach revenue before repayment starts).");

  return tips;
}
