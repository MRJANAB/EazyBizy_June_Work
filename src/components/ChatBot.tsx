import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type DragTarget = "launcher" | "panel";

interface DragState {
  target: DragTarget;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

const EDGE_GAP = 24;
const LAUNCHER_SIZE = 62;
const PANEL_WIDTH = 330;
const PANEL_HEIGHT = 480;

const getViewport = () => {
  if (typeof window === "undefined") {
    return { width: 1280, height: 800 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
};

const getPanelSize = () => {
  const viewport = getViewport();
  return {
    width: Math.min(PANEL_WIDTH, Math.max(300, viewport.width - EDGE_GAP)),
    height: Math.min(PANEL_HEIGHT, Math.max(420, viewport.height - EDGE_GAP)),
  };
};

const getInitialPosition = (width: number, height: number) => {
  const viewport = getViewport();
  return {
    x: Math.max(EDGE_GAP, viewport.width - width - EDGE_GAP),
    y: Math.max(EDGE_GAP, viewport.height - height - EDGE_GAP),
  };
};

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "Hello! 👋 I'm EazyBizy AI — your assistant for MSME loans, bank-ready reports, and EazyBizy platform support.\n\n🌍 I speak: English | हिंदी | ଓଡ଼ିଆ\n\nI can help you with:\n🏦 Loan schemes, eligibility, and comparisons\n📊 CMA Reports, DPR, DSCR, and documentation\n🧮 EMI Calculator and repayment estimates\n📍 Contact Us, FAQs, Why Choose EazyBizy, and How It Works\n📋 Step-by-step EazyBizy application guidance\n\nTry asking:\n💬 \"I need ₹10 lakh loan\"\n💬 \"How does EazyBizy work?\"\n💬 \"Show me the FAQs\"\n💬 \"Calculate EMI for ₹5 lakh at 9.5% for 5 years\"\n💬 \"How can I contact EazyBizy?\"\n💬 \"What is CMA report?\"\n💬 \"Best scheme for SC/ST in Odisha\"",
};

const INDIAN_CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatInr = (value: number) =>
  INDIAN_CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0);

// Extract amount in lakhs from user message
const extractAmount = (msg: string): number | null => {
  // Match patterns like "10 lakh", "10L", "₹10 lakh", "10,00,000", "1000000", "1 crore" etc.
  const croreMatch = msg.match(/(\d+(?:\.\d+)?)\s*(?:crore|cr)/i);
  if (croreMatch) return parseFloat(croreMatch[1]) * 100;

  const lakhMatch = msg.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)/i);
  if (lakhMatch) return parseFloat(lakhMatch[1]);

  const numericMatch = msg.match(/[₹rs.]?\s*(\d[\d,]+)/i);
  if (numericMatch) {
    const n = parseInt(numericMatch[1].replace(/,/g, ""), 10);
    if (n >= 100000) return n / 100000; // convert to lakhs
    if (n >= 1000) return n / 100000;
  }
  return null;
};

const getLoanByAmount = (lakhs: number): string => {
  if (lakhs <= 0.5) {
    return `For ₹${lakhs} lakh, here are the best options:\n\n🏦 MUDRA – Shishu Loan\n• Amount: Up to ₹50,000\n• Interest: 8–12% p.a.\n• No collateral required\n• Ideal for: Micro businesses, street vendors, artisans\n• Repayment: Up to 5 years\n\n✅ How to Apply: Visit nearest PSU bank / NBFC or apply via EazyBizy.`;
  }
  if (lakhs <= 5) {
    return `For ₹${lakhs} lakh, here are the best options:\n\n🏦 MUDRA – Kishor Loan\n• Amount: ₹50,001 – ₹5 lakh\n• Interest: 9–14% p.a.\n• No collateral required\n• Ideal for: Small shops, service providers, small manufacturers\n• Repayment: Up to 5 years\n\n🏦 PMEGP (PM Employment Generation Programme)\n• Amount: Up to ₹25 lakh (manufacturing), ₹10 lakh (service)\n• Subsidy: 15–35% of project cost\n• Margin money: 5–10%\n• Ideal for: New business setup\n\n✅ Apply via EazyBizy for fast, guided processing.`;
  }
  if (lakhs <= 10) {
    return `For ₹${lakhs} lakh, here are the best schemes:\n\n🏦 MUDRA – Tarun Loan\n• Amount: ₹5 lakh – ₹10 lakh\n• Interest: 10–16% p.a.\n• No collateral required\n• For: Established micro businesses looking to expand\n\n🏦 PMEGP Loan\n• Manufacturing: Up to ₹25 lakh | Service: Up to ₹10 lakh\n• Subsidy: 15–35% of project cost\n• Margin money: 10% (General) | 5% (Special categories)\n\n🏦 Stand-Up India\n• Loans for SC/ST & Women entrepreneurs\n• ₹10 lakh – ₹1 crore range\n\n✅ EazyBizy auto-generates your project report and CMA for faster approval.`;
  }
  if (lakhs <= 25) {
    return `For ₹${lakhs} lakh, recommended schemes:\n\n🏦 PMEGP\n• Up to ₹25 lakh (manufacturing) / ₹10 lakh (service)\n• Subsidy: 15–35%\n• For new enterprises only\n\n🏦 CGTMSE (Credit Guarantee Fund Trust for MSEs)\n• Collateral-free loans up to ₹200 lakh\n• Guarantee cover: 75–85%\n• Interest: Bank rate (typically 10–14%)\n\n🏦 Stand-Up India\n• ₹10 lakh – ₹1 crore for SC/ST/Women\n• Repayment: Up to 7 years\n\n🏦 MSME Working Capital Loan\n• Short-term funding for operations\n• Tenure: 12–36 months\n\n✅ EazyBizy prepares your CMA report & project report, making approval faster.`;
  }
  if (lakhs <= 100) {
    return `For ₹${lakhs} lakh, recommended schemes:\n\n🏦 CGTMSE\n• Collateral-free loans up to ₹200 lakh\n• Guarantee: 75–85% coverage\n• Suitable for established MSMEs\n\n🏦 MSME Term Loan\n• Purpose: Plant & machinery, expansion, working capital\n• Tenure: Up to 7 years\n• Collateral may be required above ₹50 lakh\n\n🏦 Stand-Up India\n• ₹10 lakh – ₹1 crore\n• For SC/ST & Women entrepreneurs\n\n🏦 SIDBI Direct Finance\n• For MSMEs with growth potential\n• Competitive rates from SIDBI\n\n🏦 TReDS (Trade Receivables Discounting)\n• Ideal for invoice financing\n\n✅ EazyBizy handles your complete financial documentation for all these schemes.`;
  }
  if (lakhs <= 500) {
    return `For ₹${lakhs} lakh, recommended schemes:\n\n🏦 MSME Term Loan (PSU/Private Banks)\n• Up to ₹5 crore for large MSMEs\n• Collateral required above ₹200 lakh\n• Interest: 10–14% p.a.\n\n🏦 CGTMSE (up to ₹200 lakh collateral-free)\n• Beyond ₹200 lakh typically needs collateral or consortium finance\n\n🏦 SIDBI Growth Capital\n• For established MSMEs with audited financials\n• 3–7 year repayment\n\n🏦 Emergency Credit Line Guarantee Scheme (ECLGS)\n• 20% of outstanding credit as top-up\n• 100% government guarantee\n• For existing borrowers\n\n🏦 Credit Linked Capital Subsidy Scheme (CLCSS)\n• Technology upgrade for manufacturing units\n• 15% subsidy up to ₹15 lakh\n\n✅ EazyBizy prepares your complete CMA & project viability reports.`;
  }
  return `For ₹${lakhs} lakh (large-scale financing), recommended options:\n\n🏦 MSME Large Scale Term Loan\n• PSU banks / consortium financing\n• Collateral & detailed project report required\n\n🏦 SIDBI / NABARD Finance\n• For high-growth MSMEs\n• Direct lending and refinancing\n\n🏦 ECB (External Commercial Borrowing)\n• For export-oriented units\n\n🏦 NaBFID / Infrastructure Finance\n• For large capital-intensive projects\n\n✅ EazyBizy's CMA report and project documentation will strengthen your application significantly. Contact our consultants for a detailed assessment.`;
};

// ─── Language Detection ─────────────────────────────────────────────────────
const detectLang = (text: string): "hi" | "od" | "en" => {
  if (/[\u0B00-\u0B7F]/.test(text)) return "od";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
};

// ─── State Detection ────────────────────────────────────────────────────────
const detectState = (text: string): string | null => {
  const t = text.toLowerCase();
  const map: Array<[RegExp, string]> = [
    [/odisha|odia|bhubaneswar|cuttack|puri|rourkela|sambalpur/, "Odisha"],
    [/maharashtra|mumbai|pune|nagpur|nashik|aurangabad/, "Maharashtra"],
    [/karnataka|bangalore|bengaluru|mysore|hubli|mangalore/, "Karnataka"],
    [/tamil\s*nadu|chennai|coimbatore|madurai|trichy/, "Tamil Nadu"],
    [/gujarat|ahmedabad|surat|vadodara|rajkot|gandhinagar/, "Gujarat"],
    [/rajasthan|jaipur|jodhpur|udaipur|kota|bikaner/, "Rajasthan"],
    [/uttar\s*pradesh|\bup\b|lucknow|kanpur|agra|varanasi|allahabad/, "Uttar Pradesh"],
    [/west\s*bengal|kolkata|howrah|durgapur|siliguri/, "West Bengal"],
    [/madhya\s*pradesh|\bmp\b|bhopal|indore|jabalpur|gwalior/, "Madhya Pradesh"],
    [/punjab|amritsar|ludhiana|jalandhar|chandigarh/, "Punjab"],
    [/haryana|gurugram|faridabad|hisar|ambala|rohtak/, "Haryana"],
    [/andhra\s*pradesh|\bap\b|visakhapatnam|vijayawada|tirupati/, "Andhra Pradesh"],
    [/telangana|hyderabad|warangal|nizamabad/, "Telangana"],
    [/kerala|thiruvananthapuram|kochi|kozhikode|thrissur/, "Kerala"],
    [/assam|guwahati|dibrugarh|silchar/, "Assam"],
    [/bihar|patna|gaya|muzaffarpur|bhagalpur/, "Bihar"],
    [/jharkhand|ranchi|jamshedpur|dhanbad/, "Jharkhand"],
    [/chhattisgarh|raipur|bilaspur|bhilai/, "Chhattisgarh"],
    [/\bdelhi\b|new\s*delhi|noida|ghaziabad/, "Delhi"],
    [/himachal|shimla|manali|dharamshala/, "Himachal Pradesh"],
    [/uttarakhand|dehradun|haridwar|rishikesh/, "Uttarakhand"],
    [/\bgoa\b|panaji|margao/, "Goa"],
    [/manipur|imphal/, "Manipur"],
    [/meghalaya|shillong/, "Meghalaya"],
    [/nagaland|kohima|dimapur/, "Nagaland"],
    [/sikkim|gangtok/, "Sikkim"],
    [/tripura|agartala/, "Tripura"],
    [/arunachal|itanagar/, "Arunachal Pradesh"],
  ];
  for (const [re, state] of map) {
    if (re.test(t)) return state;
  }
  return null;
};

// ─── State-specific MSME Schemes ────────────────────────────────────────────
const getStateScheme = (state: string): string => {
  const schemes: Record<string, string> = {
    "Odisha": "🏛️ Odisha-Specific Schemes:\n• OMMPC – Capital subsidy up to 25% (Odisha MSME Policy 2022)\n• MUKTA – Mukhyamantri Karma Tatpara Abhiyan for livelihoods\n• OSIC – Technical & marketing support\n• Focus sectors: food processing, handicraft, fisheries\n• Portal: msme.odisha.gov.in",
    "Maharashtra": "🏛️ Maharashtra-Specific Schemes:\n• MAH-MSME Policy 2019 – Capital subsidy 10–20%\n• MSSIDC – Raw material depots\n• CM Employment Generation Programme\n• Portal: udyog.maharashtra.gov.in",
    "Karnataka": "🏛️ Karnataka-Specific Schemes:\n• Karnataka Udyog Mitra (KUM) – Single window clearance\n• MSME Policy 2020–25 – Capital subsidy 15–25%\n• Startup Karnataka – Incubation & seed support\n• Portal: udyogmitra.karnataka.gov.in",
    "Tamil Nadu": "🏛️ Tamil Nadu-Specific Schemes:\n• TN MSME Policy 2021 – Capital & interest subsidies\n• TANSI – Industrial plots for MSMEs\n• SAMRIDHI – Women entrepreneur fund\n• Portal: msmeonline.tn.gov.in",
    "Gujarat": "🏛️ Gujarat-Specific Schemes:\n• CM Atmanirbhar Gujarat Sahay Yojana – Collateral-free up to ₹1L\n• GIDC – Subsidised industrial land\n• iCreate – Startup & innovation support\n• Portal: ic.gujarat.gov.in",
    "Rajasthan": "🏛️ Rajasthan-Specific Schemes:\n• RIPS 2019 – Capital subsidy + investment incentives\n• RIICO – Industrial plots at subsidised rates\n• CM Laghu Udyog Protsahan Yojana\n• Portal: industries.rajasthan.gov.in",
    "Uttar Pradesh": "🏛️ UP-Specific Schemes:\n• UP MSME Policy 2022 – Capital subsidy up to 25%\n• CM Yuva Udyami Yojana – ₹10L–₹25L for youth\n• One District One Product (ODOP) – Cluster development\n• Portal: niveshmitra.up.nic.in",
    "West Bengal": "🏛️ West Bengal-Specific Schemes:\n• WB MSME Policy 2023\n• Sishu Saathi – Micro enterprise support\n• Portal: wbbedboard.com",
    "Madhya Pradesh": "🏛️ MP-Specific Schemes:\n• Mukhyamantri Udyam Kranti Yojana\n• MPIDC – Industrial corridors\n• Portal: msme.mponline.gov.in",
    "Bihar": "🏛️ Bihar-Specific Schemes:\n• Mukhyamantri Udyami Yojana – ₹10L (50% GRANT for SC/ST/Women)\n• Portal: udyami.bihar.gov.in",
    "Delhi": "🏛️ Delhi-Specific Schemes:\n• Delhi MSME Loan Mela scheme\n• DSIIDC – Cluster support & raw materials\n• Portal: dcmsme.gov.in",
    "Kerala": "🏛️ Kerala-Specific Schemes:\n• Kerala Startup Mission (KSUM) – Seed funding\n• KSIDC – Manufacturing MSME support\n• Portal: industry.kerala.gov.in",
    "Assam": "🏛️ Assam / North East:\n• NEIDS – 30% capital subsidy (HIGHEST IN INDIA for NE states)\n• Covers all 8 North East states\n• Portal: indcom.assam.gov.in",
    "Jharkhand": "🏛️ Jharkhand-Specific Schemes:\n• CM Laghu Udyog Protsahan Yojana\n• JIIDCO – Industrial estates\n• Portal: investjharkhand.jharkhand.gov.in",
    "Himachal Pradesh": "🏛️ HP – Special Category State:\n• Higher central subsidy (up to 80% in some schemes)\n• HP Industrial Policy – Capital subsidy 25–30%\n• Portal: hpsidc.nic.in",
    "Telangana": "🏛️ Telangana-Specific Schemes:\n• T-Hub – World's largest startup incubator\n• WE-Hub – State platform for women entrepreneurs\n• Portal: telangana.gov.in/industries",
    "Andhra Pradesh": "🏛️ AP-Specific Schemes:\n• AP MSME Policy 2023–28 – Capital + interest subsidies\n• YSR Cheyutha – Women SC/ST/BC scheme\n• Portal: apiic.in",
  };
  const found = schemes[state];
  if (found) return found;
  return `🏛️ ${state} State Schemes:\nVisit your District Industries Centre (DIC) or state industries portal for specific MSME schemes. Central schemes (MUDRA, PMEGP, CGTMSE, Stand-Up India) apply across all states.`;
};

const extractAmountRupees = (msg: string): number | null => {
  const croreMatch = msg.match(/(\d+(?:\.\d+)?)\s*(?:crore|cr)\b/i);
  if (croreMatch) return parseFloat(croreMatch[1]) * 10000000;

  const lakhMatch = msg.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)\b/i);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;

  const directAmountMatch = msg.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]{4,}(?:\.\d+)?)/i);
  if (directAmountMatch) {
    return parseFloat(directAmountMatch[1].replace(/,/g, ""));
  }

  return null;
};

const extractInterestRate = (msg: string): number | null => {
  const percentMatch = msg.match(/(\d+(?:\.\d+)?)\s*%/i);
  if (percentMatch) {
    const rate = parseFloat(percentMatch[1]);
    if (rate > 0 && rate <= 36) return rate;
  }

  const namedRateMatch = msg.match(/interest(?:\s*rate)?\s*(?:of|is|at)?\s*(\d+(?:\.\d+)?)/i);
  if (namedRateMatch) {
    const rate = parseFloat(namedRateMatch[1]);
    if (rate > 0 && rate <= 36) return rate;
  }

  return null;
};

const extractTenureMonths = (msg: string): number | null => {
  const yearMatch = msg.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i);
  if (yearMatch) return Math.max(1, Math.round(parseFloat(yearMatch[1]) * 12));

  const monthMatch = msg.match(/(\d+)\s*(?:months?|mos?)/i);
  if (monthMatch) return Math.max(1, parseInt(monthMatch[1], 10));

  return null;
};

const calculateEmiBreakdown = (principal: number, annualRatePct: number, months: number) => {
  const monthlyRate = annualRatePct / 1200;
  const monthlyEmi =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);

  const totalPayment = monthlyEmi * months;
  const totalInterest = totalPayment - principal;

  return { monthlyEmi, totalPayment, totalInterest };
};

const getEazyBizyOverviewReply = () =>
  "🏢 ABOUT EazyBizy\n\nEazyBizy is a digital MSME and government-loan assistance platform designed to make business financing simpler, faster, and more structured.\n\n✅ What EazyBizy helps with:\n• Guided loan applications and smart scheme discovery\n• Auto-generated CMA Reports and Detailed Project Reports\n• PMEGP-ready documentation and subsidy guidance\n• Application tracking and support during the journey\n\n✅ Why customers choose EazyBizy:\n• Bank-ready, RBI-compliant report formats\n• Faster preparation with less manual paperwork\n• Helpful guidance for schemes, documents, and next steps\n• Support in English, हिंदी, and ଓଡ଼ିଆ\n\nIf you want, I can also help with Contact Us, FAQs, EMI Calculator, CMA Reports, or a step-by-step application walkthrough.";

const getEazyBizyFaqReply = () =>
  "❓ EAZYBIZY FAQS\n\n1️⃣ How long does the process take?\n• Most applicants complete the form in about 20–30 minutes.\n• Once the required details are ready, the report can be generated immediately.\n• Bank approval usually takes 7–21 working days, depending on the lender.\n\n2️⃣ Do I need a CA or consultant?\n• Not always. EazyBizy helps generate a professional CMA report, which can reduce manual consultant effort and save time.\n\n3️⃣ Which banks can use EazyBizy reports?\n• EazyBizy prepares bank-ready, RBI-compliant reports designed for scheduled commercial banks and formal loan review.\n\n4️⃣ Is subsidy available?\n• Yes. Under PMEGP, eligible applicants may receive a subsidy of 15–35%, depending on category and location.\n\n5️⃣ Can I track my application?\n• Yes. You can log in to your dashboard and monitor your application status there.\n\nIf you'd like, I can explain any of these answers in more detail.";

const getWhyChooseEazyBizyReply = () =>
  "⭐ WHY CHOOSE EazyBizy\n\nCustomers choose EazyBizy because it combines convenience with professional, bank-ready documentation.\n\n• Auto-generated CMA and project reports from your application data\n• Guidance on eligible schemes, subsidies, and documentation\n• RBI-compliant, structured report formats\n• Fully digital workflow with less paperwork and easier tracking\n• Expert support for questions during the application journey\n• Helpful tools like form guidance and EMI estimation\n\nIn short, EazyBizy helps you save time, stay organized, and present your loan case more professionally.";

const getHowEazyBizyWorksReply = () =>
  "🧭 HOW EazyBizy WORKS\n\n1️⃣ Create your account and start a new application.\n2️⃣ Complete the guided form with your personal, business, and loan details.\n3️⃣ EazyBizy prepares your CMA report and project report in a bank-ready format.\n4️⃣ Review, download, submit, and track your application from the dashboard.\n\nTypical timelines:\n• Form completion: about 20–30 minutes\n• Report preparation: immediate once details are complete\n• Bank decision: usually 7–21 working days\n\nIf you'd like, I can also guide you page by page or field by field.";

const getNewApplicationReply = () =>
  "🆕 NEW APPLICATION FORM\n\nTo start a new application:\n• Log in and go to /dashboard\n• Click the New Application card or button\n• The \"EazyBizy Loan Application\" form opens in a popup window\n\nHow the form works:\n• It is a guided 10-step application with a progress bar at the top\n• Use Next and Previous to move between steps\n• Use Save Draft anytime if you want to pause and continue later\n• When you move to the next step, your progress is also saved\n\nThe 10 steps are:\n1️⃣ Personal Information\n2️⃣ Business Information\n3️⃣ Business & Loan Details\n4️⃣ Business Description\n5️⃣ Project Requirements\n6️⃣ Project Summary\n7️⃣ Monthly Expenses\n8️⃣ Working Capital\n9️⃣ Project Report Inputs\n🔟 Preview Application\n\nAfter the final step, you can review everything and submit the application. If you want, I can explain any step in detail.";

const getApplicationDraftReply = () =>
  "💾 SAVE DRAFT, CONTINUE, AND EDIT\n\nEazyBizy lets you continue the New Application form at your own pace.\n\n• Click Save Draft anytime inside the form\n• Your progress is also saved when you move to the next step\n• Draft applications appear in /dashboard under My Applications\n• To continue later, open the draft application and click Continue\n• After submission, the application moves out of draft and can be tracked by status\n\nCommon status flow:\nDraft → Submitted → Under Review → Approved / Rejected → Disbursed\n\nIf you'd like, I can also tell you what to fill in each step so you can complete the form more smoothly.";

const getEazyBizyContactReply = () =>
  "📞 CONTACT EazyBizy\n\nYou can reach the EazyBizy team through the following channels:\n• Phone: +91 6743184837\n• Email: info@eazybizy.in\n• Support: support@eazybizy.in\n• Business Hours: Mon–Fri 9:00 AM–6:00 PM, Sat 10:00 AM–4:00 PM\n\nOffice locations:\n• Corporate Office: Plot no-1480, Bhaktamadhu Nagar Road, Pokhariput, Bhubaneswar, Odisha 751030\n• Registered Office: Plot no-188, KH-629, Friends Colony, Cuttack, Odisha 753001\n\nYou can also visit the Contact Us page at /contact. If you want, I can help answer product or application questions right here as well.";

const getCmaReportsReply = () =>
  "📊 CMA REPORTS AT EazyBizy\n\nCMA stands for Credit Monitoring Arrangement. A CMA Report helps lenders assess repayment capacity and business viability, and EazyBizy prepares it in a structured, bank-ready format.\n\nWhat the report typically includes:\n• Historical financial figures, where available\n• Projected sales, expenses, and profitability\n• Cash flow and fund flow statements\n• Key ratios such as DSCR, current ratio, and debt-equity ratio\n• A repayment view aligned to the proposed loan\n\nWhy it matters:\n• It gives lenders a clearer financial picture\n• It reduces manual drafting effort\n• It helps present your application more professionally\n\nIf you'd like, I can also explain DSCR, the required inputs, or how EazyBizy generates the CMA report.";

const getEmiCalculatorReply = (text: string) => {
  const principal = extractAmountRupees(text);
  const annualRatePct = extractInterestRate(text);
  const months = extractTenureMonths(text);

  if (principal !== null && annualRatePct !== null && months !== null) {
    const { monthlyEmi, totalInterest, totalPayment } = calculateEmiBreakdown(
      principal,
      annualRatePct,
      months,
    );

    return `🧮 EMI ESTIMATE\n\nBased on the details you shared:\n• Loan Amount: ${formatInr(principal)}\n• Interest Rate: ${annualRatePct}% p.a.\n• Tenure: ${months} months\n\nEstimated results:\n• Monthly EMI: ${formatInr(monthlyEmi)}\n• Total Interest: ${formatInr(totalInterest)}\n• Total Payment: ${formatInr(totalPayment)}\n\nThis is an estimate for planning purposes. Actual lender figures may vary slightly depending on the sanction date, rate structure, and repayment schedule.`;
  }

  return "🧮 EAZYBIZY EMI CALCULATOR\n\nThe EMI Calculator helps you estimate:\n• Monthly EMI\n• Total interest payable\n• Total repayment amount\n\nTo calculate it, please share:\n• Loan amount\n• Interest rate (% per year)\n• Tenure (months or years)\n\nExample: \"Calculate EMI for ₹5 lakh at 9.5% for 5 years.\"\n\nIf you share those details here, I can estimate it for you right away.";
};

// ─── Main AI Reply Function ─────────────────────────────────────────────────
const getDemoReply = (text: string, history: Message[]): string => {
  const lang = detectLang(text);
  const msg = text.toLowerCase();
  const lastBotMsg = [...history].reverse().find(m => m.role === "assistant")?.content ?? "";
  const detectedState = detectState(text) || detectState(lastBotMsg.slice(0, 300));

  // ── Language Switch Requests ───────────────────────────────────────────────
  if (msg.match(/hindi.*mein|hindi.*me.*bata|explain.*hindi|hindi.*explain|hindi.*boliye|mujhe.*hindi.*mein/)) {
    return "बिल्कुल! 😊 अब मैं हिंदी में जवाब दूँगा।\n\nकृपया बताइए:\n• कितने रुपये का लोन चाहिए?\n• कौन सी योजना के बारे में जानकारी चाहिए?\n• आपका व्यवसाय नया है या पुराना?\n\nउदाहरण:\n💬 \"मुझे 10 लाख का लोन चाहिए\"\n💬 \"MUDRA लोन क्या है?\"\n💬 \"PMEGP के बारे में बताइए\"";
  }

  if (msg.match(/odia.*explain|explain.*odia|odia.*bata|odia.*re.*kah/)) {
    return "ଠିକ ଅଛି! 😊 ମୁଁ ଏବେ ଓଡ଼ିଆରେ ଉତ୍ତର ଦେବି।\n\nଦୟାକରି କୁହନ୍ତୁ:\n• ଆପଣ କେତେ ଟଙ୍କା ଋଣ ଚାହୁଁଛନ୍ତି?\n• ଆପଣଙ୍କ ବ୍ୟବସାୟ କ'ଣ?\n• ନୂଆ ବ୍ୟବସାୟ ନା ଚାଲୁ ଥିବା?\n\nଉଦାହରଣ: \"ମୋତେ 10 ଲକ୍ଷ ଟଙ୍କା ଲୋନ ଦରକାର\"";
  }

  // ── EazyBizy Platform Topics ─────────────────────────────────────────────
  if (msg.match(/\bfaqs?\b|frequently.*asked.*questions|common.*questions/)) {
    return getEazyBizyFaqReply();
  }

  if (msg.match(/why.*(?:choose|trust).*eazybizy|why.*eazybizy|benefits?.*eazybizy|features?.*eazybizy|what.*makes.*eazybizy/)) {
    return getWhyChooseEazyBizyReply();
  }

  if (msg.match(/how.*it.*work|how.*does.*eazybizy.*work|how.*eazybizy.*works|eazybizy.*workflow|eazybizy.*process/)) {
    return getHowEazyBizyWorksReply();
  }

  if (msg.match(/new.*application|start.*application|start.*new.*application|loan.*application.*form|new.*application.*form|open.*application.*form|click.*new.*application|what.*happens.*after.*new.*application/)) {
    return getNewApplicationReply();
  }

  if (msg.match(/save.*draft|draft.*application|continue.*application|resume.*application|edit.*application|continue.*draft|save.*progress/)) {
    return getApplicationDraftReply();
  }

  if (msg.match(/emi.*calculator|calculate.*emi|emi.*estimate|monthly.*emi|loan.*emi/)) {
    return getEmiCalculatorReply(text);
  }

  if (msg.match(/\bcma\b.*reports?|\bcma reports?\b|credit.*monitoring.*arrangement|bank.*ready.*report|rbi.*compliant.*report/)) {
    return getCmaReportsReply();
  }

  if (msg.match(/contact\s*us|reach.*(?:team|support)|contact|support|call|phone|email|human|consultant|speak.*agent/)) {
    return getEazyBizyContactReply();
  }

  // ── Odia Queries ──────────────────────────────────────────────────────────
  if (lang === "od") {
    const amtOd = extractAmount(text);
    if (amtOd !== null) {
      const stateInfo = detectedState ? `\n\n${getStateScheme(detectedState)}` : "\n\n📍 ଆପଣ କେଉଁ ରାଜ୍ୟରେ ଅଛନ୍ତି? ରାଜ୍ୟ-ନିର୍ଦ୍ଦିଷ୍ଟ ଯୋଜନା ପାଇଁ ଜଣାନ୍ତୁ।";
      return `ଆପଣ ₹${amtOd} ଲକ୍ଷ ଋଣ ଚାହୁଁଛନ୍ତି। 😊\n\nସଠିକ ଯୋଜନା ଦେଖାଇବା ପାଇଁ ଏ ସୂଚନା ଦିଅନ୍ତୁ:\n\n1️⃣ ବ୍ୟବସାୟ ଧରଣ:\n   🏭 ଉତ୍ପାଦନ (Manufacturing)\n   🛒 ସେବା/ଦୋକାନ (Service/Trade)\n   🌾 କୃଷି (Agriculture)\n\n2️⃣ ବ୍ୟବସାୟ ସ୍ଥିତି:\n   🆕 ନୂଆ ବ୍ୟବସାୟ ଆରମ୍ଭ\n   🔄 ଚାଲୁ ଥିବା ବ୍ୟବସାୟ ବଢ଼ାଇବା\n\n3️⃣ ଶ୍ରେଣୀ:\n   👤 ସାଧାରଣ (General)\n   👩 ମହିଳା (Women)\n   🎯 SC/ST\n\n4️⃣ ଅବସ୍ଥାନ:\n   🏙️ ସହର (Urban)\n   🌳 ଗ୍ରାମ (Rural)${stateInfo}`;
    }
    if (/mudra/i.test(text)) {
      return "🏦 MUDRA ଲୋନ (Pradhan Mantri Mudra Yojana)\n\n📖 ଏହା ଏକ ସରକାରୀ ଋଣ ଯୋଜନା — ବିନା ଜାମିନ୍‌ ରେ ଛୋଟ ବ୍ୟବସାୟ ପାଇଁ।\n\n3 ବିଭାଗ:\n🌱 ଶିଶୁ — ₹50,000 ପର୍ଯ୍ୟନ୍ତ\n🌿 କିଶୋର — ₹50,001 ରୁ ₹5 ଲକ୍ଷ\n🌳 ତରୁଣ — ₹5 ଲକ୍ଷ ରୁ ₹10 ଲକ୍ଷ\n\n✅ ଯୋଗ୍ୟତା: ଭାରତୀୟ ନାଗରିକ, ଅଣ-କୃଷି ବ୍ୟବସାୟ\n💰 ସୁଧ: 8–16% ପ୍ରତି ବର୍ଷ\n📑 ଆବେଦନ: mudra.org.in ବା EazyBizy";
    }
    if (/pmegp/i.test(text)) {
      return "🏦 PMEGP — ପ୍ରଧାନମନ୍ତ୍ରୀ ରୋଜଗାର ସୃଜନ ଯୋଜନା\n\n📖 ନୂଆ ଉଦ୍ୟୋଗ ଆରମ୍ଭ ପାଇଁ ଅନୁଦାନ (Subsidy) ଯୁକ୍ତ ଋଣ।\n\n💰 ଋଣ ରାଶି:\n• ଉତ୍ପାଦନ: ₹25 ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ\n• ସେବା: ₹10 ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ\n\n🎯 ଅନୁଦାନ:\n• ସହର ସାଧାରଣ: 15% | ଗ୍ରାମ ସାଧାରଣ: 25%\n• ଗ୍ରାମ SC/ST/ମହିଳା: 35%\n\n✅ ଯୋଗ୍ୟତା: ବୟସ 18+, ନୂଆ ଉଦ୍ୟୋଗ\n📑 ଆବେଦନ: kviconline.gov.in ବା EazyBizy";
    }
    return "ନମସ୍କାର! 🙏 EazyBizy ରେ ଆପଣଙ୍କୁ ସ୍ୱାଗତ।\n\nମୁଁ ଆପଣଙ୍କ AI ଆର୍ଥିକ ସହାୟକ।\n\nପଚାରନ୍ତୁ:\n💬 \"ମୋତେ 10 ଲକ୍ଷ ଟଙ୍କା ଲୋନ ଦରକାର\"\n💬 \"MUDRA ଲୋନ କ'ଣ?\"\n💬 \"PMEGP ଯୋଜନା ବିଷୟରେ ବୁଝାନ୍ତୁ\"\n💬 \"ଦସ୍ତାବେଜ କ'ଣ ଦରକାର?\"\n\n🌍 ଭାଷା: English | हिंदी | ଓଡ଼ିଆ";
  }

  // ── Hindi Queries ─────────────────────────────────────────────────────────
  if (lang === "hi") {
    const amtHi = extractAmount(text);
    if (amtHi !== null) {
      const stateInfo = detectedState ? `\n\n${getStateScheme(detectedState)}` : "\n\n📍 आप किस राज्य में हैं? राज्य-विशेष योजनाओं के लिए बताइए।";
      return `आपको ₹${amtHi} लाख का लोन चाहिए। 😊\n\nसबसे सही योजना बताने के लिए कुछ जानकारी चाहिए:\n\n1️⃣ व्यवसाय का प्रकार:\n   🏭 उत्पादन (Manufacturing)\n   🛒 सेवा/दुकान (Service/Trade)\n   🌾 कृषि (Agriculture)\n\n2️⃣ व्यवसाय की स्थिति:\n   🆕 नया व्यवसाय शुरू करना है\n   🔄 पुराना व्यवसाय बढ़ाना है\n\n3️⃣ आप किस वर्ग में हैं:\n   👤 सामान्य (General)\n   👩 महिला उद्यमी (Women)\n   🎯 SC / ST\n   🪖 भूतपूर्व सैनिक\n\n4️⃣ स्थान:\n   🏙️ शहरी (Urban)\n   🌳 ग्रामीण (Rural)\n${stateInfo}\n\nएक साथ जवाब दे सकते हैं — जैसे: \"नई मैन्युफैक्चरिंग, SC, ग्रामीण, ओडिशा\"`;
    }
    if (/mudra|मुद्रा/.test(msg)) {
      return "🏦 MUDRA लोन — प्रधानमंत्री मुद्रा योजना (PMMY)\n\n📖 परिभाषा: बिना गारंटी के छोटे व्यवसायों के लिए सरकारी लोन।\n\n3 श्रेणियाँ:\n🌱 शिशु — ₹50,000 तक | ब्याज: 8–12%\n🌿 किशोर — ₹50K–₹5 लाख | ब्याज: 9–14%\n🌳 तरुण — ₹5–₹10 लाख | ब्याज: 10–16%\n\n✅ पात्रता:\n• भारतीय नागरिक | आयु 18+\n• गैर-कृषि व्यवसाय\n• लोन डिफॉल्ट नहीं\n\n📑 दस्तावेज़: आधार, पैन, व्यवसाय प्रमाण, बैंक स्टेटमेंट\n🏛️ आवेदन: mudra.org.in या EazyBizy\n⚠️ दरें बैंक के अनुसार भिन्न हो सकती हैं।";
    }
    if (/pmegp|पीएमईजीपी/.test(msg)) {
      return "🏦 PMEGP — प्रधानमंत्री रोजगार सृजन कार्यक्रम\n\n📖 नए उद्यम के लिए सरकारी सब्सिडी-युक्त लोन।\n\n💰 लोन राशि:\n• उत्पादन: ₹25 लाख तक | सेवा: ₹10 लाख तक\n\n🎯 सब्सिडी:\n• शहरी सामान्य: 15% | ग्रामीण सामान्य: 25%\n• शहरी विशेष*: 25% | ग्रामीण विशेष*: 35%\n(*SC/ST/महिला/भूतपूर्व सैनिक/अल्पसंख्यक)\n\n✅ पात्रता: आयु 18+, नया उद्यम, EDP प्रशिक्षण\n📑 आवेदन: kviconline.gov.in या EazyBizy\n✨ EazyBizy — PMEGP प्रोजेक्ट रिपोर्ट ऑटो-जनरेट करता है!\n⚠️ शर्तें बदल सकती हैं।";
    }
    if (/cgtmse/.test(msg)) {
      return "🏦 CGTMSE — बिना गारंटी के MSE लोन\n\n📖 सरकारी गारंटी—बैंक लोन देता है, सरकार 75–85% जोखिम उठाती है।\n\n💰 लोन राशि: ₹200 लाख तक\n🛡️ गारंटी कवर: 75–85%\n\n✅ पात्रता:\n• Udyam पंजीकृत MSE\n• NPA नहीं | कोई भी सेक्टर\n\n📑 आवेदन: cgtmse.in या निकटतम बैंक\n💡 PMEGP + CGTMSE = सब्सिडी + बिना गारंटी!";
    }
    if (/stand.?up|स्टैंड/.test(msg)) {
      return "🏦 स्टैंड-अप इंडिया योजना\n\n📖 SC/ST और महिला उद्यमियों के लिए विशेष बैंक लोन।\n\n💰 लोन राशि: ₹10 लाख – ₹1 करोड़\n📋 प्रकार: Composite (टर्म लोन + वर्किंग कैपिटल)\n⏱️ चुकौती: 7 साल तक | 18 माह की मोरेटोरियम\n\n✅ पात्रता:\n• SC/ST या महिला उद्यमी\n• आयु 18+ | नया उद्यम\n• लोन डिफॉल्ट नहीं\n\n📑 आवेदन: standupmitra.in या निकटतम बैंक\n⚠️ शर्तें बदल सकती हैं।";
    }
    if (/document|kya.*chahiye|कागज|दस्तावेज/.test(msg)) {
      return "📑 MSME लोन के लिए आवश्यक दस्तावेज़:\n\n👤 KYC:\n• आधार कार्ड | पैन कार्ड | फोटो\n\n🏢 व्यवसाय:\n• Udyam प्रमाण पत्र ✅\n• GST प्रमाण पत्र\n• दुकान/स्थापना प्रमाण\n\n💰 वित्तीय:\n• 2 साल की ITR\n• 6 माह के बैंक स्टेटमेंट\n• CMA रिपोर्ट (EazyBizy बनाता है!)\n\n🏗️ प्रोजेक्ट लोन के लिए:\n• डिटेल्ड प्रोजेक्ट रिपोर्ट (EazyBizy बनाता है!)\n• मशीनरी कोटेशन\n\n✨ EazyBizy = CMA + DPR ऑटोमैटिक!";
    }
    if (/subsidy|sarkari.*help|subsidi|अनुदान|सब्सिडी/.test(msg)) {
      return "🎯 सरकारी सब्सिडी और फायदे:\n\n• PMEGP — 15–35% प्रोजेक्ट लागत की सब्सिडी\n• CLCSS — 15% तकनीक सुधार सब्सिडी (₹15 लाख तक)\n• CGTMSE — बिना गारंटी (सरकार 75–85% जोखिम)\n• KCC किसान — प्रभावी ब्याज ~4%\n• SVANidhi — 7% ब्याज सब्सिडी\n• बिहार CM योजना — SC/ST/महिला को 50% अनुदान!\n• NE राज्य (NEIDS) — 30% पूंजी सब्सिडी\n\n💡 EazyBizy सभी लागू सब्सिडियाँ आपकी रिपोर्ट में जोड़ता है!";
    }
    return "नमस्ते! 🙏 EazyBizy में आपका स्वागत है।\n\nमैं आपका AI वित्तीय सहायक हूँ।\n\nपूछिए:\n💬 \"मुझे 10 लाख का लोन चाहिए\"\n💬 \"MUDRA लोन क्या है?\"\n💬 \"PMEGP के बारे में बताइए\"\n💬 \"दस्तावेज़ क्या चाहिए?\"\n💬 \"स्टैंड-अप इंडिया क्या है?\"\n\nआपकी भाषा → आपका जवाब! 😊";
  }

  // ── English Greeting ──────────────────────────────────────────────────────
  if (msg.match(/\b(hello|hi|hey|helo|good\s*morning|good\s*evening|good\s*afternoon)\b/)) {
    return "Hello! 👋 Welcome to EazyBizy — Your AI Financial Advisor.\n\nI specialize in Indian Government Loan & Business Schemes.\n\n🌍 I speak: English | हिंदी | ଓଡ଼ିଆ\n📍 I know state-specific schemes for all Indian states\n📊 I can compare schemes side by side\n📋 I guide you through every step of the EazyBizy form\n\n🏛️ Schemes I cover:\nMUDRA • PMEGP • CGTMSE • Stand-Up India • NABARD\nNSIC • Startup India • KCC • CLCSS • ECLGS & more\n\nTry asking:\n💬 \"I need ₹10 lakh loan\" → Smart recommendations\n💬 \"Compare MUDRA and PMEGP\"\n💬 \"How to fill EazyBizy form\"\n💬 \"What is margin money?\"\n💬 \"मुझे 10 लाख का लोन चाहिए\" (Hindi)\n💬 \"ମୋତେ 10 ଲକ୍ଷ ଟଙ୍କା ଲୋନ ଦରକାର\" (Odia)";
  }

  if (msg.match(/\b(namaste|namaskar)\b/)) {
    return "नमस्ते! 🙏 EazyBizy में आपका स्वागत है।\n\nमैं Hindi, English और Odia में मदद कर सकता हूँ।\n\nपूछिए:\n💬 \"मुझे 10 लाख का लोन चाहिए\"\n💬 \"MUDRA लोन क्या है?\"\n💬 \"PMEGP की पूरी जानकारी दीजिए\"";
  }

  // ── EazyBizy Platform Overview ───────────────────────────────────────────
  if (msg.match(/what.*is.*eazybizy|about.*eazybizy|tell.*me.*about.*eazybizy|who.*are.*you|eazybizy.*features|eazybizy.*benefits|why.*eazybizy/)) {
    return getEazyBizyOverviewReply();
  }

  // ── EazyBizy Platform Navigation / Where to Fill Form ───────────────────
  if (msg.match(/where.*fill.*form|where.*application.*form|where.*apply.*eazybizy|kahan.*form|form.*kahan.*bhare|eazybizy.*form.*kahan|where.*new.*application|dashboard.*form/)) {
    return "📍 WHERE TO FILL THE NEW APPLICATION FORM\n\n━━━━━━━━━━━━━━━━━━━\n✅ For NEW users:\n1. Open Home page → /\n2. Click Apply Now / Login → /signup\n3. Complete signup and continue\n4. Open Dashboard → /dashboard\n5. Click the New Application card\n6. The EazyBizy Loan Application form opens in a popup window\n\n✅ For EXISTING users:\n1. Open Login page → /auth\n2. Sign in\n3. Go to Dashboard → /dashboard\n4. Click New Application\n\n━━━━━━━━━━━━━━━━━━━\n🧭 Where each major action is:\n• Start new form: /dashboard → New Application\n• Save draft: inside the form → Save Draft\n• Continue draft: /dashboard → My Applications → Continue\n• Track status: /dashboard → My Applications\n• Contact advisor: /contact\n\n💡 If you want, I can guide you field-by-field while you fill Step 1 to Step 10.";
  }

  // ── EazyBizy End-to-End Journey ─────────────────────────────────────────
  if (msg.match(/end.*to.*end|start.*to.*finish|complete.*process|full.*process|complete.*journey|eazybizy.*workflow|how.*does.*eazybizy.*work/)) {
    return getHowEazyBizyWorksReply();
  }

  // ── EazyBizy Route / Navigation Questions ───────────────────────────────
  if (msg.match(/where.*dashboard|where.*login|where.*signup|where.*learning|where.*loan.*schemes|where.*contact|which.*page|what.*page.*for/)) {
    return "🗺️ EazyBizy PAGE MAP\n\n• Home: /\n• Login: /auth\n• Signup: /signup\n• Dashboard (applications): /dashboard\n• Learning center: /learning\n• Loan schemes: /loan-schemes\n• How it works: /how-it-works\n• Features: /features\n• Contact support: /contact\n• Profile: /profile\n\n💡 Form fill location: /dashboard → New Application";
  }

  // ── Comparison Handler ────────────────────────────────────────────────────
  if (msg.match(/compare|versus|\bvs\b|difference.*between|which.*is.*better/)) {
    if (msg.match(/mudra.*pmegp|pmegp.*mudra/)) {
      return "📊 MUDRA vs PMEGP — Comparison\n\n┌────────────────┬──────────────────┬──────────────────┐\n│ Feature        │ MUDRA            │ PMEGP            │\n├────────────────┼──────────────────┼──────────────────┤\n│ Loan Amount    │ Up to ₹10 lakh   │ Up to ₹25L (mfg) │\n│ Subsidy        │ None             │ 15–35%           │\n│ Business       │ New OR existing  │ New ONLY         │\n│ Collateral     │ Not required     │ Not required     │\n│ Interest       │ 8–16% p.a.       │ Bank lending rate│\n│ Margin Money   │ None             │ 5–10%            │\n│ Education      │ None required    │ 8th pass (>₹10L) │\n│ EDP Training   │ Not needed       │ Mandatory        │\n│ Apply At       │ Banks/MFIs/NBFCs │ kviconline.gov.in│\n│ Time           │ 1–2 weeks        │ 3–6 weeks        │\n└────────────────┴──────────────────┴──────────────────┘\n\n✅ Choose MUDRA if: Existing business, need quick funds, no EDP training\n✅ Choose PMEGP if: Starting a NEW enterprise and want 15–35% subsidy\n\n💡 Best Combo: PMEGP + CGTMSE = Subsidy + No Collateral!\n⚠️ Terms may vary by bank/government updates.";
    }
    if (msg.match(/mudra.*cgtmse|cgtmse.*mudra/)) {
      return "📊 MUDRA vs CGTMSE — Comparison\n\n┌────────────────┬──────────────────┬──────────────────┐\n│ Feature        │ MUDRA            │ CGTMSE           │\n├────────────────┼──────────────────┼──────────────────┤\n│ Loan Amount    │ Up to ₹10 lakh   │ Up to ₹200 lakh  │\n│ Collateral     │ Not required     │ Not required     │\n│ Govt Guarantee │ Direct scheme    │ 75–85% coverage  │\n│ Udyam Required │ Not mandatory    │ Mandatory        │\n│ Business       │ Non-farm micro   │ Any registered MSE│\n│ CIBIL          │ Relaxed (~620+)  │ 650+ recommended │\n└────────────────┴──────────────────┴──────────────────┘\n\n✅ MUDRA: Best for small amounts under ₹10L, minimal documentation\n✅ CGTMSE: Best for larger amounts up to ₹200L, govt takes the risk\n⚠️ Terms may vary.";
    }
    if (msg.match(/stand.?up.*pmegp|pmegp.*stand.?up/)) {
      return "📊 Stand-Up India vs PMEGP — Comparison\n\n┌────────────────┬──────────────────┬──────────────────┐\n│ Feature        │ Stand-Up India   │ PMEGP            │\n├────────────────┼──────────────────┼──────────────────┤\n│ Loan Amount    │ ₹10L – ₹1 Crore  │ Up to ₹25L (mfg) │\n│ Who Eligible   │ SC/ST + Women    │ All categories   │\n│ Subsidy        │ None             │ 15–35%           │\n│ Business       │ New only         │ New only         │\n│ Tenure         │ 7 years          │ Bank terms       │\n│ Moratorium     │ 18 months        │ None             │\n│ Loan Type      │ Composite CC+TL  │ Term loan        │\n└────────────────┴──────────────────┴──────────────────┘\n\n✅ Stand-Up India: SC/ST/Women, larger amounts, moratorium benefit\n✅ PMEGP: All categories, subsidy advantage, lower amounts\n⚠️ Terms may vary.";
    }
    if (msg.match(/nabard.*mudra|mudra.*nabard/)) {
      return "📊 NABARD vs MUDRA — Comparison\n\n┌────────────────┬──────────────────┬──────────────────┐\n│ Feature        │ NABARD           │ MUDRA            │\n├────────────────┼──────────────────┼──────────────────┤\n│ Focus          │ Agriculture/Rural│ Non-farm MSME    │\n│ Key Product    │ KCC, SHG loans   │ Shishu/Kishor/Tarun│\n│ Target         │ Farmers, SHGs    │ Micro businesses │\n│ Interest       │ 4–11% (KCC ~4%) │ 8–16% p.a.       │\n│ Collateral     │ Land (KCC)       │ Not required     │\n│ Access         │ Via banks/RRBs   │ Via banks/MFIs   │\n└────────────────┴──────────────────┴──────────────────┘\n\n✅ NABARD/KCC: Best for farmers — lowest interest rate (~4% effective)\n✅ MUDRA: Best for non-farm small businesses\n⚠️ Terms may vary.";
    }
    return "📊 I can compare these scheme pairs:\n\n• MUDRA vs PMEGP\n• MUDRA vs CGTMSE\n• Stand-Up India vs PMEGP\n• NABARD vs MUDRA\n• Startup India vs PMEGP\n\nExample: \"Compare MUDRA and PMEGP\"\n\nWhich two would you like to compare?";
  }


  if (lastBotMsg.includes("I need a few details") || lastBotMsg.includes("सबसे सही योजना") || lastBotMsg.includes("ସଠିକ ଯୋଜନା ଦେଖାଇବା")) {
    const lakh = extractAmount(lastBotMsg) || extractAmount(msg) || 10;
    const isNew = msg.match(/new|naya|नया|नई|start|shuru|ନୂଆ|greenfield/);
    const isWomen = msg.match(/women|mahila|महिला|ମହିଳା/);
    const isSCST = msg.match(/\bsc\b|\bst\b|dalit|tribe|schedule/);
    const isRural = msg.match(/rural|village|gram|गाँव|ग्रामीण|ଗ୍ରାମ/);
    const isMfg = msg.match(/manufactur|production|factory|उत्पादन|ଉତ୍ପାଦନ|plant|machinery/);
    const loc = isRural ? "Rural" : "Urban";
    const cat = isSCST ? "SC/ST" : isWomen ? "Women" : "General";
    const bizType = isMfg ? "Manufacturing" : "Service/Trade";
    const subs = cat === "General" ? (loc === "Rural" ? 25 : 15) : (loc === "Rural" ? 35 : 25);
    const fmtLakh = lakh >= 100 ? `₹${lakh / 100} crore` : `₹${lakh} lakh`;
    let resp = `✅ Based on your profile:\n📊 ${bizType} | ${loc} | ${cat} | ${fmtLakh}\n\n`;
    if (isNew) {
      resp += `🥇 PMEGP — Best for New Enterprises\n• ${isMfg ? "Up to ₹25 lakh" : "Up to ₹10 lakh"}\n• Subsidy: ${subs}% → saves ₹${Math.round(lakh * subs / 100 * 10) / 10} lakh upfront\n• Apply: kviconline.gov.in\n\n`;
    }
    if (lakh <= 10) {
      resp += `🥈 MUDRA ${lakh <= 5 ? "Kishor" : "Tarun"} — Quick & No Collateral\n• ${lakh <= 5 ? "₹50K – ₹5 lakh" : "₹5L – ₹10 lakh"} | Interest: ${lakh <= 5 ? "9–14%" : "10–16%"} p.a.\n\n`;
    }
    if (isSCST || isWomen) {
      resp += `🥉 Stand-Up India — Exclusive for SC/ST/Women\n• ₹10 lakh – ₹1 crore | Tenure: 7 years | 18-month moratorium\n\n`;
    }
    resp += `🛡️ Add CGTMSE for Collateral-Free Protection\n• Govt covers 75–85% risk — banks approve more confidently\n\n💡 Power Combo: PMEGP + CGTMSE = Subsidy + No Collateral\n\n📑 Next Steps:\n1️⃣ Get Udyam Registration (udyamregistration.gov.in)\n2️⃣ Apply via EazyBizy (auto-generates CMA + Project Report)\n3️⃣ Submit to bank\n\n⚠️ Terms may vary by bank/government updates.`;
    return resp;
  }

  // ── State-specific (when user mentions state without asking about a scheme) ─
  if (detectedState && !msg.match(/mudra|pmegp|cgtmse|stand.?up|startup|nabard|nsic|eclgs|clcss|svanidhi|kcc|loan|amount|lakh|crore/)) {
    return `📍 You mentioned ${detectedState}!\n\n${getStateScheme(detectedState)}\n\n━━━━━━━━━━━━━━━━━━━\n🏦 Central Schemes also available in ${detectedState}:\n• MUDRA — Up to ₹10 lakh (no collateral)\n• PMEGP — Up to ₹25 lakh (15–35% subsidy)\n• CGTMSE — Up to ₹200 lakh (no collateral)\n• Stand-Up India — ₹10L–₹1Cr (SC/ST/Women)\n• Startup India — Innovative ventures\n\n💬 Tell me your loan amount & business type for personalised recommendations!\n⚠️ Terms may vary by bank/govt updates.`;
  }

  // ── Amount-based query (English) ──────────────────────────────────────────
  const amount = extractAmount(msg);
  if (amount !== null && msg.match(/loan|lend|borrow|fund|need|want|require|apply|crore|lakh|rs\.|₹|rupee/)) {
    const quickRecommendation = getLoanByAmount(amount);
    const stateInfo = detectedState ? `\n\n${getStateScheme(detectedState)}` : "";
    return `${quickRecommendation}\n\n━━━━━━━━━━━━━━━━━━━\nTo make this recommendation precise for YOUR profile, reply with:\n\n1️⃣ Business Type:\n   🏭 Manufacturing (factory/production)\n   🛒 Service / Trade (shop/restaurant/salon)\n   🌾 Agriculture / Agro-processing\n\n2️⃣ Business Status:\n   🆕 New enterprise (want to start)\n   🔄 Existing business (want to expand)\n\n3️⃣ Category:\n   👤 General | 👩 Women | 🎯 SC/ST | 🪖 Ex-Serviceman | 🌲 Minority\n\n4️⃣ Location:\n   🏙️ Urban (city/town) | 🌳 Rural (village)\n\n📍 State (for state-specific subsidy checks)${stateInfo}\n\n👉 Example reply: \"New manufacturing, SC, rural, Odisha\"\n\n💡 If you want, I can also give a quick comparison for this amount (interest, subsidy, collateral, timeline).`;
  }

  // ── MUDRA ─────────────────────────────────────────────────────────────────
  if (msg.match(/\bmudra\b|pradhan.*mantri.*mudra|pmmy/)) {
    return "🏦 MUDRA LOAN — Pradhan Mantri Mudra Yojana (PMMY)\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\nCollateral-free government loan for non-corporate, non-farm micro & small businesses via PSU banks, RRBs, NBFCs, MFIs.\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY FEATURES — 3 Tiers\n🌱 Shishu — Up to ₹50,000 | Interest: 8–12%\n   For: New micro businesses, vendors, artisans\n🌿 Kishor — ₹50,001 to ₹5 lakh | Interest: 9–14%\n   For: Growing businesses\n🌳 Tarun — ₹5 lakh to ₹10 lakh | Interest: 10–16%\n   For: Established businesses expanding\n\n━━━━━━━━━━━━━━━━━━━\n3. ELIGIBILITY\n• Indian citizen | Age 18+\n• Non-farm income-generating business\n• No prior loan default\n• Any business: shop, salon, transport, artisan, etc.\n\n━━━━━━━━━━━━━━━━━━━\n4. BENEFITS\n• No collateral required\n• No processing fee\n• RuPay MUDRA Card for revolving credit\n• Available at all PSU banks across India\n\n━━━━━━━━━━━━━━━━━━━\n5. HOW TO APPLY\n1️⃣ Visit nearest PSU bank / NBFC / MFI\n2️⃣ Fill MUDRA application form\n3️⃣ Submit KYC + business proof\n4️⃣ Disbursed in 7–15 days\n🌐 mudra.org.in\n\n━━━━━━━━━━━━━━━━━━━\n6. EXAMPLE\nRamesh (vendor, Bhubaneswar) applies for MUDRA Kishor ₹2 lakh — no collateral, 12% rate → EMI ≈ ₹3,760/month for 5 years.\n\n💡 Tip: Combine with CGTMSE for loans above ₹10L\n⚠️ Rates vary by bank/NBFC.";
  }

  // ── PMEGP ─────────────────────────────────────────────────────────────────
  if (msg.match(/\bpmegp\b|pm.*employment.*generation|prime.*minister.*employment/)) {
    return "🏦 PMEGP — PM Employment Generation Programme\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\nCredit-linked subsidy scheme by KVIC for NEW manufacturing/service enterprises. Subsidy credited upfront — directly reduces your loan.\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY FEATURES\n• Manufacturing: Up to ₹25 lakh | Service: Up to ₹10 lakh\n• Subsidy: 15–35% of project cost (see table)\n• Margin Money: 5% (special) / 10% (general)\n\n━━━━━━━━━━━━━━━━━━━\n3. SUBSIDY TABLE\n┌──────────────────────┬────────┬─────────┐\n│ Category             │ Urban  │ Rural   │\n├──────────────────────┼────────┼─────────┤\n│ General              │ 15%    │ 25%     │\n│ SC/ST/Women/Ex-Svc   │ 25%    │ 35%     │\n│ NE/Hill/Minorities   │ 25%    │ 35%     │\n└──────────────────────┴────────┴─────────┘\n\n━━━━━━━━━━━━━━━━━━━\n4. ELIGIBILITY\n• Age 18+ | NEW enterprise ONLY\n• 8th pass for projects above ₹10 lakh\n• EDP training mandatory\n• No existing business / no prior loan default\n\n━━━━━━━━━━━━━━━━━━━\n5. HOW TO APPLY\n1️⃣ Register at kviconline.gov.in\n2️⃣ Upload Project Report + KYC\n3️⃣ KVIC verifies → forwards to bank\n4️⃣ Bank sanctions & disburses\n5️⃣ Subsidy credited to account\n⏱️ Time: 3–6 weeks\n\n━━━━━━━━━━━━━━━━━━━\n6. EXAMPLE\nPriya (Women, Rural, Odisha) starts food processing unit ₹10 lakh:\n• Subsidy 35% = ₹3.5 lakh FREE\n• She pays 5% margin = ₹50K\n• Bank loan needed: ₹6 lakh only!\n\n✨ EazyBizy auto-generates PMEGP-ready Project Report!\n⚠️ Terms subject to govt updates.";
  }

  // ── CGTMSE ────────────────────────────────────────────────────────────────
  if (msg.match(/cgtmse|credit.*guarantee.*fund|collateral.?free.*msme|cgtmse.*scheme/)) {
    return "🏦 CGTMSE — Credit Guarantee Fund Trust for Micro & Small Enterprises\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\nGovt trust that guarantees MSE loans without collateral — enabling small businesses to access credit without pledging property.\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY FEATURES\n• Loan: Up to ₹200 lakh\n• Guarantee Coverage:\n┌──────────────────┬──────────┐\n│ Loan Size        │ Cover    │\n├──────────────────┼──────────┤\n│ Up to ₹5 lakh    │ 85%      │\n│ ₹5–50 lakh       │ 75–85%   │\n│ ₹50–200 lakh     │ 75%      │\n│ Women/NER        │ 85%+     │\n└──────────────────┴──────────┘\n\n━━━━━━━━━━━━━━━━━━━\n3. ELIGIBILITY\n• Udyam-registered MSE\n• New or existing business\n• Any sector (mfg or service)\n• Not NPA / no default\n\n━━━━━━━━━━━━━━━━━━━\n4. BENEFITS\n• No property required as security\n• Banks approve more confidently (govt bears risk)\n• Faster sanctioning\n\n━━━━━━━━━━━━━━━━━━━\n5. HOW TO APPLY\n1️⃣ Get Udyam Certificate\n2️⃣ Apply at any CGTMSE member bank\n3️⃣ Bank registers the guarantee\n4️⃣ Loan disbursed\n🌐 cgtmse.in\n\n💡 Best Combo: PMEGP + CGTMSE = Subsidy + No Collateral!\n⚠️ Terms may vary by bank/govt.";
  }

  // ── Stand-Up India ────────────────────────────────────────────────────────
  if (msg.match(/stand.?up\s*india/)) {
    return "🏦 STAND-UP INDIA SCHEME\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\nCentral govt mandate: every bank branch must provide at least 1 SC/ST and 1 Woman borrower a greenfield enterprise loan.\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY FEATURES\n• Amount: ₹10 lakh – ₹1 crore\n• Type: Composite loan (Term Loan + Working Capital)\n• Tenure: Up to 7 years | 18-month moratorium\n• Interest: ~Base Rate + 3% (approx 10–14%)\n\n━━━━━━━━━━━━━━━━━━━\n3. ELIGIBILITY\n• SC/ST or Women entrepreneur\n• Age 18+ | New enterprise (Greenfield) only\n• Not in default with any institution\n\n━━━━━━━━━━━━━━━━━━━\n4. BENEFITS\n• Mandatory allocation: banks MUST approve (higher chance)\n• No sector restriction\n• Composite loan covers full project\n\n━━━━━━━━━━━━━━━━━━━\n5. HOW TO APPLY\n1️⃣ Register at standupmitra.in\n2️⃣ Prepare business plan\n3️⃣ Approach any scheduled bank\n⏱️ Time: 3–4 weeks\n\n━━━━━━━━━━━━━━━━━━━\n6. EXAMPLE\nSunita (Women, Bhopal) starts a garment unit needing ₹25 lakh. Stand-Up India provides full amount as composite loan with 18-month no-EMI period.\n\n⚠️ Terms subject to bank/govt updates.";
  }

  // ── NABARD ────────────────────────────────────────────────────────────────
  if (msg.match(/\bnabard\b|national bank.*agriculture.*rural/)) {
    return "🏦 NABARD — National Bank for Agriculture & Rural Development\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\nApex bank for agriculture & rural development. Provides refinance to banks for agri and rural MSME lending.\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY SCHEMES\n🌾 Kisan Credit Card (KCC)\n• Revolving crop credit | Effective rate ~4% p.a.\n• For farmers, sharecroppers, fisherfolk\n\n🏭 Rural Agri-MSME Loans\n• Food processing, cold chain, agri-equipment\n• Via banks & RRBs at subsidised rates\n\n🏘️ SHG-Bank Linkage\n• Self Help Groups linked to formal credit\n• No collateral, group guarantee\n\n━━━━━━━━━━━━━━━━━━━\n3. ELIGIBILITY\n• Farmers, rural artisans, agro-MSMEs\n• SHG/JLG members | Rural cooperatives\n\n━━━━━━━━━━━━━━━━━━━\n4. HOW TO ACCESS\n• Apply at local PSU bank, Co-op bank, or RRB\n🌐 nabard.org\n⚠️ Terms subject to govt updates.";
  }

  // ── NSIC ──────────────────────────────────────────────────────────────────
  if (msg.match(/\bnsic\b|national small industries/)) {
    return "🏦 NSIC — National Small Industries Corporation\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\nGovt PSU under MSME Ministry — provides marketing, technology, credit, and raw material support to small industries.\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY SERVICES\n💳 Credit Support\n• Composite loan (WC + Term) up to ₹25 crore\n• Bank credit facilitation\n\n🏭 Raw Material Assistance\n• Steel, chemicals, textiles, plastics on credit\n\n📢 Marketing Support\n• Single Point Registration (SPRS) for Govt tenders\n• Zero tender fee + EMD exemption\n• Government procurement preference\n\n💻 Technology Support\n• Technology incubation centres\n• Software Technology Parks\n\n━━━━━━━━━━━━━━━━━━━\n3. HOW TO ACCESS\n1️⃣ Register at nsic.co.in\n2️⃣ Submit Udyam Certificate + financials\n3️⃣ Apply for specific service\n🌐 nsic.co.in\n⚠️ Terms subject to govt updates.";
  }

  // ── Startup India ─────────────────────────────────────────────────────────
  if (msg.match(/startup\s*india|dpiit.*startup|startup.*fund|startup.*loan|startup.*scheme|startup.*registration/)) {
    return "🚀 STARTUP INDIA\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\nEcosystem of funding, tax benefits, incubation & regulatory support for DPIIT-recognised startups.\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY FINANCIAL SCHEMES\n🌱 Startup India Seed Fund (SISFS)\n• ₹20L for PoC | ₹50L for product trials\n• Via DPIIT-approved incubators\n\n💰 Fund of Funds (FFS)\n• ₹10,000 Cr via VCs/AIFs | SIDBI manages\n\n🛡️ Credit Guarantee (CGSS)\n• Collateral-free up to ₹10 crore\n• 80% govt guarantee\n\n━━━━━━━━━━━━━━━━━━━\n3. ELIGIBILITY\n• Pvt Ltd / LLP registered in India\n• Less than 10 years old\n• Annual turnover < ₹100 crore\n• Innovative / scalable model\n• Not a subsidiary\n\n━━━━━━━━━━━━━━━━━━━\n4. BENEFITS\n• 3-year income tax exemption\n• Patent fee rebate (80%)\n• Fast winding-up under IBC\n• Govt tender exemptions (DPIIT)\n\n━━━━━━━━━━━━━━━━━━━\n5. HOW TO APPLY\n1️⃣ Register at startupindia.gov.in\n2️⃣ Get DPIIT Recognition (3–5 days)\n3️⃣ Apply for specific fund/incubator\n⚠️ Terms subject to govt updates.";
  }

  // ── KCC ───────────────────────────────────────────────────────────────────
  if (msg.match(/kisan.*credit.*card|\bkcc\b|farmer.*credit|agri.*credit.*card/)) {
    return "🌾 KISAN CREDIT CARD (KCC)\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\nRevolving credit for farmers — crop expenses, post-harvest, allied activities. Interest subvention makes effective rate as low as 4%.\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY FEATURES\n• Amount: Based on land holding + crop type\n• Interest: 9% − 2% subvention − 3% prompt repayment = 4% effective\n• Tenure: 5 years (renewed annually)\n• Repayment: Aligned with harvest cycle\n\n━━━━━━━━━━━━━━━━━━━\n3. ELIGIBILITY\n• Farmers, tenant farmers, sharecroppers\n• SHG/JLG of farmers\n• Allied activity farmers (fisheries, animal husbandry)\n\n━━━━━━━━━━━━━━━━━━━\n4. BENEFITS\n• Revolving credit — use, repay, reuse\n• Crop insurance (PMFBY) included\n• ATM-enabled RuPay Kisan Card\n• Accidental insurance ₹50K\n\n━━━━━━━━━━━━━━━━━━━\n5. HOW TO APPLY\n• Visit nearest PSU/Co-op/RRB bank\n• Submit land records + Aadhaar + crop details\n⚠️ Terms may vary by bank.";
  }

  // ── ECLGS ─────────────────────────────────────────────────────────────────
  if (msg.match(/eclgs|emergency.*credit.*line|emergency.*credit.*guarantee/)) {
    return "🏦 ECLGS — Emergency Credit Line Guarantee Scheme\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\nCOVID-relief scheme — 100% Govt-guaranteed additional credit for existing MSME borrowers without collateral.\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY FEATURES\n• Amount: 20–40% of outstanding credit\n• Guarantee: 100% by Govt of India (via NCGTC)\n• Interest Cap: 9.25% banks / 14% NBFCs\n• Tenure: 4 years | 12-month moratorium\n\n━━━━━━━━━━━━━━━━━━━\n3. ELIGIBILITY\n• Existing MSME borrower\n• Account standard (not NPA)\n• Turnover up to ₹250 crore\n\n━━━━━━━━━━━━━━━━━━━\n4. HOW TO APPLY\n• Contact your EXISTING lending bank directly\n• No new application needed — automatic eligibility\n⚠️ Terms subject to govt updates.";
  }

  // ── CLCSS ─────────────────────────────────────────────────────────────────
  if (msg.match(/clcss|credit.*linked.*capital.*subsidy|technology.*upgrade.*subsidy|tech.*upgrade.*msme/)) {
    return "🏦 CLCSS — Credit Linked Capital Subsidy Scheme\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\n15% upfront capital subsidy on institutional loans for technology upgradation in Small Scale Industries.\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY FEATURES\n• Subsidy: 15% of loan (max ₹15 lakh)\n• Maximum eligible loan: ₹1 crore\n• 51 eligible sub-sectors\n\n━━━━━━━━━━━━━━━━━━━\n3. ELIGIBLE SECTORS\nFood processing | Textiles | Leather | Rubber\nIT industry | Glass | Hosiery | Pharmaceuticals\n\n━━━━━━━━━━━━━━━━━━━\n4. ELIGIBILITY\n• Existing MSE (Udyam registered)\n• Technology upgrade from approved source\n• Loan from bank/SFCs/NABARD/SIDBI\n\n━━━━━━━━━━━━━━━━━━━\n5. HOW TO APPLY\n1️⃣ Apply through SIDBI, NABARD, or SFCs\n2️⃣ Submit Udyam cert + technology upgrade plan\n3️⃣ Subsidy credited after verification\n⚠️ Terms subject to govt updates.";
  }

  // ── PM SVANidhi ───────────────────────────────────────────────────────────
  if (msg.match(/svanidhi|pm\s*svanidhi|street.*vendor|rehri|thela/)) {
    return "🏦 PM SVANidhi — PM Street Vendor's AtmaNirbhar Nidhi\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\nMicro-credit for urban street vendors — collateral-free with 7% interest subsidy.\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY FEATURES\n• 1st Loan: ₹10,000 (12 months)\n• 2nd Loan: ₹20,000 (on timely repayment)\n• 3rd Loan: ₹50,000\n• Interest Subsidy: 7% per year\n• Digital payment incentive: ₹1,200/year\n\n━━━━━━━━━━━━━━━━━━━\n3. ELIGIBILITY\n• Urban street vendor\n• Certificate of Vending from ULB\n\n━━━━━━━━━━━━━━━━━━━\n4. HOW TO APPLY\n🌐 pmsvanidhi.mohua.gov.in\n⚠️ Terms subject to govt updates.";
  }

  // ── MSME Overview ─────────────────────────────────────────────────────────
  if (msg.match(/\bmsme\b|small.*business.*overview|micro.*enterprise.*overview|medium.*enterprise.*overview/)) {
    return "🏢 MSME — Micro, Small & Medium Enterprises\n\n━━━━━━━━━━━━━━━━━━━\n1. CLASSIFICATION (2020)\n┌──────────┬───────────────┬──────────────────┐\n│ Category │ Investment    │ Turnover         │\n├──────────┼───────────────┼──────────────────┤\n│ Micro    │ ≤ ₹1 crore    │ ≤ ₹5 crore       │\n│ Small    │ ≤ ₹10 crore   │ ≤ ₹50 crore      │\n│ Medium   │ ≤ ₹50 crore   │ ≤ ₹250 crore     │\n└──────────┴───────────────┴──────────────────┘\n\n━━━━━━━━━━━━━━━━━━━\n2. KEY MSME SCHEMES\n• MUDRA — Up to ₹10L (no collateral)\n• PMEGP — Up to ₹25L (15–35% subsidy)\n• CGTMSE — Up to ₹200L (no collateral)\n• CLCSS — 15% tech upgrade subsidy\n• Stand-Up India — ₹10L–₹1Cr (SC/ST/Women)\n• NSIC — Raw material + Govt tender support\n• ECLGS — Emergency credit (100% Govt guarantee)\n• SIDBI — Direct MSME financing\n\n━━━━━━━━━━━━━━━━━━━\n3. FIRST STEP → Udyam Registration (FREE)\n🌐 udyamregistration.gov.in\nDoc needed: Aadhaar + PAN only\n\n💬 Tell me your amount for personalised scheme recommendation!\n⚠️ Terms may vary.";
  }

  // ── Interest / EMI ────────────────────────────────────────────────────────
  if (msg.match(/interest.*rate|emi|repay|instalment|monthly.*pay|how.*much.*interest|\bemi\b/)) {
    return "💰 INTEREST RATES — Govt Schemes & MSME Loans\n\n━━━━━━━━━━━━━━━━━━━\n┌──────────────────────┬──────────────────────┐\n│ Scheme               │ Interest Rate        │\n├──────────────────────┼──────────────────────┤\n│ MUDRA Shishu         │ 8–12% p.a.           │\n│ MUDRA Kishor         │ 9–14% p.a.           │\n│ MUDRA Tarun          │ 10–16% p.a.          │\n│ PMEGP                │ Bank rate + subsidy  │\n│ CGTMSE               │ 10–14% p.a.          │\n│ Stand-Up India       │ ~Base Rate + 3%      │\n│ ECLGS                │ Capped at 9.25%      │\n│ KCC (Farmer)         │ 4% effective         │\n│ SVANidhi             │ ~7% with subsidy     │\n│ MSME Term Loan       │ 10–15% p.a.          │\n└──────────────────────┴──────────────────────┘\n\n━━━━━━━━━━━━━━━━━━━\n📊 EMI per ₹1 lakh borrowed:\n• 8% / 5yr → ₹2,028/month\n• 10% / 5yr → ₹2,125/month\n• 12% / 5yr → ₹2,224/month\n• 14% / 5yr → ₹2,327/month\n\n💡 Tips to get lower rate:\n✅ CIBIL 700+ | Udyam registration\n✅ 2+ years business vintage\n✅ PMEGP subsidy reduces effective cost\n\n🧮 Use EazyBizy's Loan Calculator for exact EMI!\n⚠️ Rates vary by bank, scheme, and credit profile.";
  }

  // ── Eligibility ──────────────────────────────────────────────────────────
  if (msg.match(/eligib|qualify|who\s*can|criteria|am\s*i\s*eligible/)) {
    return "📋 ELIGIBILITY — MSME & Govt Loan Schemes\n\n━━━━━━━━━━━━━━━━━━━\n✅ Common Requirements (All Schemes):\n• Indian citizen | Age 18+\n• Valid KYC (Aadhaar + PAN)\n• No active loan default\n\n━━━━━━━━━━━━━━━━━━━\n📌 Scheme-Specific Eligibility:\n┌──────────────────┬────────────────────────────────────┐\n│ Scheme           │ Key Requirement                    │\n├──────────────────┼────────────────────────────────────┤\n│ MUDRA            │ Non-farm business, any CIBIL       │\n│ PMEGP            │ New enterprise, 8th pass (>₹10L)   │\n│ CGTMSE           │ Udyam registered MSE, Not NPA      │\n│ Stand-Up India   │ SC/ST OR Women, new enterprise     │\n│ Startup India    │ DPIIT recognised, <10 yr old       │\n│ NABARD KCC       │ Farmer / Sharecropper / Fisher     │\n│ SVANidhi         │ Urban street vendor with ULB cert  │\n│ NSIC             │ Udyam cert, good credit history    │\n│ ECLGS            │ Existing MSME borrower, not NPA    │\n└──────────────────┴────────────────────────────────────┘\n\n💡 Tell me your profile (age, business type, category) and I'll confirm which schemes you qualify for!\n⚠️ Requirements may vary by bank/state.";
  }

  // ── Documents ─────────────────────────────────────────────────────────────
  if (msg.match(/document|doc\b|required.*paper|paper.*required|kyc|what.*need.*apply/)) {
    return "📑 DOCUMENTS REQUIRED — MSME Loans\n\n━━━━━━━━━━━━━━━━━━━\n👤 KYC (All Loans):\n• Aadhaar Card (mandatory)\n• PAN Card\n• 2 Passport-size photographs\n• Address proof (utility bill / rent agreement)\n\n━━━━━━━━━━━━━━━━━━━\n🏢 Business Documents:\n• Udyam / MSME Registration Certificate ✅ (most important)\n• GST Registration Certificate\n• Shop & Establishment License\n• Partnership Deed / MOA (if applicable)\n\n━━━━━━━━━━━━━━━━━━━\n💰 Financial Documents:\n• Last 2 years ITR (CA certified)\n• Last 2 years Balance Sheet & P&L\n• Last 6 months bank statements\n• CMA Report ← EazyBizy auto-generates!\n\n━━━━━━━━━━━━━━━━━━━\n🏗️ For Project/Term Loans:\n• Detailed Project Report (DPR) ← EazyBizy!\n• Machinery/equipment quotations\n• Land or building proof\n\n━━━━━━━━━━━━━━━━━━━\n🌾 PMEGP Specific:\n• EDP Training certificate\n• 8th pass certificate (if project > ₹10L)\n• Category/caste certificate (if applicable)\n\n✨ EazyBizy can help prepare your CMA + DPR once the required application details are completed.";
  }

  // ── Subsidy ───────────────────────────────────────────────────────────────
  if (msg.match(/subsid|grant|benefit|sarkari.*help|government.*benefit|free.*money|hidden.*benefit/)) {
    return "🎯 GOVERNMENT SUBSIDIES & HIDDEN BENEFITS\n\n━━━━━━━━━━━━━━━━━━━\n┌──────────────────┬───────────────────────────────────────┐\n│ Scheme           │ Subsidy / Benefit                     │\n├──────────────────┼───────────────────────────────────────┤\n│ PMEGP            │ 15–35% project cost (cash subsidy)    │\n│ CLCSS            │ 15% capital subsidy (max ₹15 lakh)    │\n│ CGTMSE           │ No collateral (govt takes 75–85% risk)│\n│ KCC              │ ~4% effective rate (3%+2% subvention) │\n│ SVANidhi         │ 7% interest subsidy                   │\n│ ECLGS            │ 100% govt guarantee, no collateral    │\n│ PMAY CLSS        │ Up to ₹2.67L on home loan             │\n│ Bihar CM Yojana  │ 50% GRANT (₹5L) for SC/ST/Women       │\n│ NE NEIDS         │ 30% capital subsidy (highest!)        │\n│ HP State         │ Up to 80% in special categories       │\n└──────────────────┴───────────────────────────────────────┘\n\n━━━━━━━━━━━━━━━━━━━\n💡 Combination Tips:\n• PMEGP + CGTMSE = Max subsidy + No collateral\n• KCC + PMFBY = Crop credit + Insurance\n• Udyam + NSIC = Formal credit + Govt tender access\n\n💡 EazyBizy identifies ALL applicable subsidies in your region!\n⚠️ Terms subject to govt updates.";
  }

  // ── CIBIL / Credit Score ─────────────────────────────────────────────────
  if (msg.match(/cibil|credit.*score|improve.*credit|credit.*rating|credit.*history/)) {
    return "📊 CIBIL SCORE & MSME LOANS\n\n━━━━━━━━━━━━━━━━━━━\n┌──────────┬───────────────────────────────────┐\n│ Score    │ Loan Outcome                      │\n├──────────┼───────────────────────────────────┤\n│ 750–900  │ Best rates, instant approval      │\n│ 700–749  │ Standard rates, likely approval   │\n│ 650–699  │ Higher rate, may need collateral  │\n│ 600–649  │ Difficult — try PMEGP/MUDRA       │\n│ Below 600│ Govt scheme focus, secure loan    │\n└──────────┴───────────────────────────────────┘\n\n━━━━━━━━━━━━━━━━━━━\n✅ How to Improve:\n• Pay all EMIs on time (biggest impact)\n• Keep credit card usage below 30%\n• Don't apply to multiple banks simultaneously\n• Check cibil.com for errors — get them corrected\n\n━━━━━━━━━━━━━━━━━━━\n💡 Schemes with Relaxed CIBIL:\n• PMEGP — No minimum threshold\n• MUDRA — 620+ acceptable\n• SVANidhi — No CIBIL required\n• CGTMSE — 650+ recommended";
  }

  // ── FAQ ────────────────────────────────────────────────────────────────────
  if (msg.match(/faq|frequently.*asked|common.*question|popular.*question/)) {
    return "❓ FREQUENTLY ASKED QUESTIONS\n\n━━━━━━━━━━━━━━━━━━━\nQ1. Easiest government loan to get?\n✅ MUDRA Shishu (≤₹50K) — minimal docs, no collateral, at every bank.\n\nQ2. Loan without income proof?\n✅ MUDRA Shishu, PM SVANidhi, NABARD SHG-Linkage\n\nQ3. MUDRA or PMEGP — which is better?\n✅ MUDRA: Existing business, fast processing\n   PMEGP: New enterprise, get 15–35% subsidy\n\nQ4. Can I combine PMEGP and CGTMSE?\n✅ YES — Best combo. PMEGP subsidy + CGTMSE no-collateral.\n\nQ5. Special benefits for SC/ST/Women?\n✅ PMEGP gives 35% rural subsidy\n   Stand-Up India is exclusive to SC/ST+Women\n   Bihar CM Udyami: 50% GRANT up to ₹5L\n\nQ6. How long does approval take?\n✅ MUDRA: 1–2 weeks | PMEGP: 3–6 weeks\n   Stand-Up: 3–4 weeks | Startup India: 3–5 days (recognition)\n\nQ7. Do I need Udyam registration?\n✅ Not mandatory for MUDRA, MANDATORY for CGTMSE.\n   Strongly recommended for all — improves chances.\n\nQ8. What if PMEGP is rejected?\n✅ Improve project report, reapply after 3 months.\n   EazyBizy AI-DPR significantly improves success rates.\n\nQ9. Any loan with 0% interest?\n✅ SVANidhi effectively ~0% after 7% subsidy.\n   Some state schemes offer interest-free periods.\n\nQ10. Which scheme if I have no property?\n✅ MUDRA, PMEGP, Stand-Up India, CGTMSE — all collateral-free!\n\n💬 Ask any question for detailed answers!";
  }

  // ── Scheme Combinations ───────────────────────────────────────────────────
  if (msg.match(/combination|combine.*scheme|scheme.*together|best.*combo|power.*combo/)) {
    return "💡 POWERFUL SCHEME COMBINATIONS\n\n━━━━━━━━━━━━━━━━━━━\n🥇 PMEGP + CGTMSE (BEST COMBO)\nWhy: Get 15–35% subsidy AND collateral-free loan\nWho: New MSME without property to pledge\nHow: Apply PMEGP → bank sanctions → CGTMSE covers automatically\n\n🥈 Udyam + NSIC (Govt Tender Access)\nWhy: Win government contracts — zero tender fee + EMD exemption\nHow: Udyam Registration → NSIC SPRS registration → bid on tenders\n\n🥉 KCC + PMFBY (Farmer Safety Net)\nWhy: Crop credit + insurance coverage\nHow: KCC at bank + PMFBY enrollment at same branch\n\n🏅 MUDRA + Stand-Up India\nWhy: SC/ST/Women needing ₹10L–₹1Cr\nHow: Stand-Up for main project + MUDRA working capital\n\n🏅 Startup India + SIDBI Fund of Funds\nWhy: Tech startups need equity + credit\nHow: DPIIT recognition → SISFS incubator → SIDBI FoF via VCs\n\n💬 Tell me your business type for the best combination for you!\n⚠️ Terms may vary by bank/scheme.";
  }

  // ── Working Capital ─────────────────────────────────────────────────────
  if (msg.match(/working.*capital|cash.*flow|inventory.*finance|overdraft|stock.*finance/)) {
    return "💼 WORKING CAPITAL LOANS\n\n━━━━━━━━━━━━━━━━━━━\n1. OVERVIEW\nShort-term funding for day-to-day operations — inventory, payroll, trade expenses.\n\n━━━━━━━━━━━━━━━━━━━\n2. OPTIONS\n• Cash Credit (CC) — Revolving limit from bank\n• Overdraft (OD) — Against property/FD\n• MUDRA Tarun — ₹5L–₹10L for micro businesses\n• TReDS — Invoice discounting (B2B suppliers)\n• Receivables Finance — Against pending invoices\n\n━━━━━━━━━━━━━━━━━━━\n3. KEY DETAILS\n💰 Range: ₹50K – ₹5 crore\n⏱️ Tenure: 12 months (renewable)\n📈 Interest: 10–16% p.a.\n\n━━━━━━━━━━━━━━━━━━━\n4. ELIGIBILITY\n• 1+ year business vintage preferred\n• GST returns, bank statements, Udyam\n\n💬 Tell me your amount and business type!\n⚠️ Terms vary by bank.";
  }

  // ── Project Report / CMA ─────────────────────────────────────────────────
  if (msg.match(/project.*report|cma|financial.*report|\bdpr\b|appraisal|credit.*monitoring/)) {
    return "📊 PROJECT REPORT & CMA — EazyBizy Support\n\n━━━━━━━━━━━━━━━━━━━\nThese documents help lenders review business viability, repayment capacity, and overall financial readiness.\n\n✅ What EazyBizy helps prepare:\n\n1. CMA Data Report\n• Historical financials where available\n• 5-year projections\n• Fund flow, cash flow, and ratio analysis\n• Structured, bank-ready presentation\n\n2. Detailed Project Report (DPR)\n• Promoter and business background\n• Market and demand overview\n• Technical feasibility\n• Financial projections, break-even, and ROI\n\n3. PMEGP Documentation Support\n• Project details aligned for PMEGP applications\n• Subsidy-related inputs and summary support\n\n━━━━━━━━━━━━━━━━━━━\n⏱️ With EazyBizy: generated from your application once the required details are complete\n📈 Manual route: often takes several days and extra consultant effort\n\nIf you'd like, I can explain the inputs needed for the CMA or DPR next.";
  }

  // ── EazyBizy Form — Overview ──────────────────────────────────────────────
  if (msg.match(/eazybizy.*form|fill.*eazybizy|eazybizy.*fill|gtab.*form|form.*fill|fill.*form|form.*kaise.*bhare|form.*kaise|how.*fill.*form|application.*form.*guide|form.*step|eazybizy.*application|eazybizy.*apply|eazybizy.*process/)) {
    return "📋 HOW TO FILL THE NEW APPLICATION FORM\n\n━━━━━━━━━━━━━━━━━━━\nThis is the same form that opens when you click New Application on the dashboard.\n\nThe form has 10 guided steps:\n\n👤 Step 1 — Personal Information\nYour name, gender, date of birth, education, and social category\n\n🏢 Step 2 — Business Information\nBusiness address, city, state, PIN code, registration type, mobile number, and email\n\n📋 Step 3 — Business & Loan Details\nNew or existing business, business name, industry type, loan scheme, and loan purpose\n\n📝 Step 4 — Business Description\nWhat your business does, products/services, target market, and business background\n\n🔧 Step 5 — Project Requirements\nLand, building, machinery, equipment, and supplier-related details\n\n📊 Step 6 — Project Summary\nAuto-calculated project cost, margin money, and eligible loan amount\n\n💰 Step 7 — Monthly Expenses\nRent, salaries, raw material, utilities, transport, marketing, and other running expenses\n\n🎯 Step 8 — Working Capital\nWorking capital amount and the relevant period\n\n🧾 Step 9 — Project Report Inputs\nPromoter profile, market analysis, products, competitors, and projection inputs\n\n👁️ Step 10 — Preview Application\nReview the final application before submission\n\n━━━━━━━━━━━━━━━━━━━\nUseful actions inside the form:\n• Next → moves to the next step and saves progress\n• Previous → returns to the earlier step\n• Save Draft → lets you stop and continue later\n\n⏱️ Typical completion time: about 20–30 minutes\n📄 Final output: Application preview plus report-ready data\n\n💬 Ask about any specific step:\n\"Tell me about Step 1\" | \"How to fill Step 3\" | \"Can I save draft?\"";
  }

  // ── EazyBizy Form — Step 1 Personal Info ──────────────────────────────────
  if (msg.match(/step.*1|personal.*info.*step|step.*personal|personal.*detail.*form|first.*step.*form/)) {
    return "👤 STEP 1 — PERSONAL INFORMATION\n\n━━━━━━━━━━━━━━━━━━━\n📌 Fields to fill:\n\n✅ Owner Name:\n• First Name | Middle Name (optional) | Last Name\n• Use name exactly as on Aadhaar Card\n\n✅ Gender: Male / Female / Prefer not to say\n\n✅ Date of Birth:\n• Format: DD/MM/YYYY\n• Must be 18+ years\n\n✅ Education:\n• Post Graduate | Graduate | 12th Pass (Plus Two) | 10th Pass\n• 📌 PMEGP tip: For projects above ₹10 lakh, minimum 8th pass required\n\n✅ Social Category:\n• General | OBC | Minority | SC | ST | Prefer not to disclose\n• 📌 This affects PMEGP subsidy — SC/ST/Women get 25–35%!\n\n━━━━━━━━━━━━━━━━━━━\n💡 TIPS:\n• Enter name in CAPITAL LETTERS as on official documents\n• If SC/ST/OBC — keep caste certificate ready for bank submission\n• Education affects loan eligibility for some schemes\n\n💬 Say \"Step 2\" for Business Information guidance";
  }

  // ── EazyBizy Form — Step 2 Business Info ─────────────────────────────────
  if (msg.match(/step.*2|business.*info.*step|business.*address.*form|step.*address/)) {
    return "🏢 STEP 2 — BUSINESS INFORMATION\n\n━━━━━━━━━━━━━━━━━━━\n📌 Fields to fill:\n\n✅ Business Address:\n• Address Line 1 — Building No., Street Name (required)\n• Address Line 2 — Landmark, Area (optional)\n• City (required)\n• State — Select from dropdown (all 28 states + UTs listed)\n• PIN Code (required)\n\n✅ Registration Type:\n• Proprietorship — Single owner (most common for MUDRA/PMEGP)\n• Partnership — Two or more partners\n• LLP — Limited Liability Partnership\n• Private Limited Company\n\n✅ Contact:\n• Phone Number (with country code +91)\n\n━━━━━━━━━━━━━━━━━━━\n💡 TIPS:\n• Address must match your Udyam / GST certificate\n• Proprietorship is simplest — no separate legal registration needed\n• If home-based business, use residential address\n• Rural addresses qualify for higher PMEGP subsidy (25–35% vs 15–25%)\n\n💬 Say \"Step 3\" for Business & Loan Details guidance";
  }

  // ── EazyBizy Form — Step 3 Business & Loan Details ───────────────────────
  if (msg.match(/step.*3|business.*loan.*detail.*step|loan.*detail.*step|step.*loan.*detail|industry.*selection/)) {
    return "📋 STEP 3 — BUSINESS & LOAN DETAILS\n\n━━━━━━━━━━━━━━━━━━━\n📌 Fields to fill:\n\n✅ Business Type:\n• New Business — Starting fresh (use PMEGP for subsidy)\n• Existing Business — Already running (use MUDRA / CGTMSE)\n• If existing: enter months in business\n\n✅ Business Entity Name:\n• Official name of your business\n• e.g., \"Ramesh Enterprises\" or \"Sunita Food Products\"\n\n✅ Type of Business:\n• Free-text: Describe what you do\n• e.g., \"Soap Manufacturing\", \"Rice Mill\", \"Beauty Salon\"\n\n✅ Industry Type:\n• Manufacturing | Service | Trading | Agriculture | Others\n• Select based on primary activity\n\n✅ Loan Scheme:\n• MUDRA — Existing or new micro enterprise (up to ₹10 lakh)\n• PMEGP — New enterprise with government subsidy\n• Normal MSME — Standard term/working capital loan\n• Other Scheme — Stand-Up India, CGTMSE, etc.\n\n✅ Loan Purpose:\n• Term Loan — For buying machinery, land, building\n• Working Capital — For daily operations, raw material, inventory\n• Term + Working Capital — Combined (most PMEGP projects)\n\n━━━━━━━━━━━━━━━━━━━\n💡 TIPS:\n• Choose PMEGP for new business + subsidy\n• Term + Working Capital is recommended for manufacturing\n• Industry type affects which subsidies apply\n\n💬 Say \"Step 4\" for Business Description guidance";
  }

  // ── EazyBizy Form — Step 4 Business Description ──────────────────────────
  if (msg.match(/step.*4|business.*description.*step|step.*description|describe.*business.*form/)) {
    return "📝 STEP 4 — BUSINESS DESCRIPTION\n\n━━━━━━━━━━━━━━━━━━━\n📌 What to write:\n\nThis is a free-text field where you explain your business in detail. Banks use this to understand your project.\n\n✅ Include the following:\n1. What your business makes or does\n2. Who your customers are (target market)\n3. How you will sell (local market, online, wholesale)\n4. Your experience or qualification in this field\n5. Why you need the loan and how it will help grow\n\n━━━━━━━━━━━━━━━━━━━\n📌 EXAMPLE for a Soap Manufacturing unit:\n\"We plan to set up a soap manufacturing unit producing herbal and detergent soaps for local retail shops and wholesale distributors in Bhubaneswar district. The promoter has 3 years of experience in FMCG trading. The loan will be used to purchase machinery and raw materials, and we expect monthly revenue of ₹80,000 from the 6th month onwards.\"\n\n━━━━━━━━━━━━━━━━━━━\n💡 TIPS:\n• Write minimum 5–6 lines for better bank impression\n• Mention your experience or prior work in this industry\n• Include realistic revenue expectations\n• Avoid very vague statements like \"will do business\" — be specific\n\n💬 Say \"Step 5\" for Project Requirements guidance";
  }

  // ── EazyBizy Form — Step 5 Project Requirements ──────────────────────────
  if (msg.match(/step.*5|project.*requirement.*step|step.*machinery|plant.*machinery.*form|land.*cost.*form|shed.*cost.*form/)) {
    return "🔧 STEP 5 — PROJECT REQUIREMENTS\n\n━━━━━━━━━━━━━━━━━━━\n📌 Infrastructure Costs (₹):\n\n• Land Cost — Cost of buying land (if applicable; enter 0 if rented)\n• Shed / Building Cost — Construction or renovation cost\n• Computers / Laptops / Printers\n• Furniture & Fixtures\n• Electrification & Power Backup (wiring, generator)\n• Racks & Storage Units\n• Transportation Cost (vehicle for business)\n• Machinery Installation Cost\n• Other Initial Expenditure\n\n━━━━━━━━━━━━━━━━━━━\n📌 Plant & Machinery Section:\nFor EACH machine, enter:\n• Machine Name — e.g., \"Soap Mixing Machine\"\n• Cost (₹) — exact quote from supplier\n• Supplier Name, Phone, Email\n\n📌 Example machinery for Soap Unit:\n• Soap Mixer Machine — ₹80,000 (XYZ Machines, Bengaluru)\n• Soap Cutting Machine — ₹45,000 (ABC Suppliers, Pune)\n• Packaging Machine — ₹30,000\n\n━━━━━━━━━━━━━━━━━━━\n💡 TIPS:\n• Enter actual quotation amounts from suppliers\n• Keep supplier quotation letters for bank verification\n• Rented premises: enter 0 for Land Cost (mention rent in Step 7)\n• Banks check machinery costs against market rates — don't over-inflate\n• PMEGP subsidy is calculated on TOTAL project cost (incl. machinery)\n\n💬 Say \"Step 6\" for Project Summary guidance";
  }

  // ── EazyBizy Form — Step 6 Project Summary ───────────────────────────────
  if (msg.match(/step.*6|project.*summary.*step|project.*cost.*summary|total.*project.*cost/)) {
    return "📊 STEP 6 — PROJECT SUMMARY\n\n━━━━━━━━━━━━━━━━━━━\n📌 This step is AUTO-CALCULATED — no manual input needed!\n\nEazyBizy automatically shows:\n\n✅ Total Project Cost\n= Land + Building + Machinery + Furniture + All other costs\n\n✅ Margin Money (your contribution)\n= % you must contribute from own funds (5–10% for PMEGP)\n• General category: 10% of project cost\n• SC/ST/Women/Special: 5% of project cost\n\n✅ Eligible Loan Amount\n= Total Project Cost − Subsidy − Margin Money\n= What the bank will actually lend you\n\n━━━━━━━━━━━━━━━━━━━\n📌 EXAMPLE for ₹10 lakh PMEGP project (Women, Rural):\n• Total Project Cost = ₹10,00,000\n• Subsidy (35%) = ₹3,50,000\n• Margin Money (5%) = ₹50,000\n• Loan from Bank = ₹6,00,000 ✅\n\n━━━━━━━━━━━━━━━━━━━\n💡 TIPS:\n• If total cost seems too high/low — go back to Step 5 and adjust\n• Margin money is YOUR own investment — must be available upfront\n• Subsidy is NOT given in cash — it's adjusted from the loan after 3 years of repayment\n\n💬 Say \"Step 7\" for Monthly Expenses guidance";
  }

  // ── EazyBizy Form — Step 7 Monthly Expenses ──────────────────────────────
  if (msg.match(/step.*7|monthly.*expense.*step|step.*expense|expense.*form|operating.*expense.*form/)) {
    return "💰 STEP 7 — MONTHLY EXPENSES\n\n━━━━━━━━━━━━━━━━━━━\n📌 Enter all monthly running costs of your business:\n\n✅ Rent (per month) — shop/factory/office rent\nIf owned premises, enter 0\n\n✅ Number of Employees\n• Example: 3 workers\n\n✅ Salary per Employee (₹/month)\n• Auto-multiplies: employees × salary = total monthly salary\n\n✅ Raw Material Cost (₹/month)\n• Main input costs — ingredients, materials, packaging\n\n✅ Stationery & Office Supplies\n\n✅ Electricity & Water (₹/month)\n• For machines, AC, lighting, water bills\n\n✅ Repair & Maintenance (₹/month)\n• Regular servicing of machinery, premises\n\n✅ Transport (₹/month)\n• Delivery, logistics, vehicle fuel\n\n✅ Telephone & Internet (₹/month)\n\n✅ Marketing & Advertising (₹/month)\n\n✅ Miscellaneous (₹/month)\n• Small unexpected expenses — typically 3–5% of total\n\n━━━━━━━━━━━━━━━━━━━\n💡 TIPS:\n• Enter realistic amounts — banks verify against industry benchmarks\n• Raw material is usually the HIGHEST expense (60–70% of sales)\n• Total Monthly Expenses = your minimum monthly break-even point\n• Low expenses vs high revenue = better DSCR (loan repayment ratio)\n\n💬 Say \"Step 8\" for Working Capital guidance";
  }

  // ── EazyBizy Form — Step 8 Working Capital ───────────────────────────────
  if (msg.match(/step.*8|working.*capital.*step|step.*working.*capital|working.*capital.*form/)) {
    return "🎯 STEP 8 — WORKING CAPITAL REQUIREMENT\n\n━━━━━━━━━━━━━━━━━━━\n📌 What is Working Capital?\nWorking Capital is the money needed to run day-to-day business operations — buying raw materials, paying wages, covering expenses before payments come in.\n\nFormula: Working Capital = Current Assets − Current Liabilities\n\n━━━━━━━━━━━━━━━━━━━\n📌 Fields:\n\n✅ Total Working Capital Required (₹)\n• Enter the amount you need per month OR per year\n\n✅ Requirement Period:\n• Monthly — if entering monthly working capital\n• Annual — if entering yearly working capital\n• EazyBizy auto-converts between monthly and annual for you!\n\n━━━━━━━━━━━━━━━━━━━\n📌 HOW TO CALCULATE:\nMonthly Working Capital = Monthly Raw Material + Monthly Salaries + Monthly Operating Expenses\n\n📌 EXAMPLE:\n• Raw Material: ₹40,000/month\n• Salaries: ₹15,000/month\n• Other Expenses: ₹10,000/month\n► Monthly Working Capital = ₹65,000\n► Annual Working Capital = ₹7,80,000\n\n━━━━━━━━━━━━━━━━━━━\n💡 TIPS:\n• Working capital = typically 1–3 months of operating expenses\n• For manufacturing, keep at least 2 months as buffer\n• PMEGP includes working capital in the project cost\n• TReDS or Cash Credit (CC) is ideal for ongoing working capital\n\n💬 Say \"Step 9\" for Project Report Inputs guidance";
  }

  // ── EazyBizy Form — Step 9 Project Report Inputs ─────────────────────────
  if (msg.match(/step.*9|project.*report.*input|step.*report|step.*nine|promoter.*detail.*form/)) {
    return "🧾 STEP 9 — PROJECT REPORT INPUTS\n\n━━━━━━━━━━━━━━━━━━━\nThis is the most detailed step — it generates your full Project Report (DPR) and CMA.\n\n📌 Sections:\n\n✅ Promoter Details\n• Full Name, Father's Name, DOB, Gender\n• PAN Number, Aadhaar Number, Mobile, Email\n• Years of experience | Previous employer/role\n\n✅ Business Details\n• GST Number (if registered)\n• MSME / Udyam Number ← IMPORTANT\n• Target market description\n• Target areas (cities/regions)\n• Market size (₹ crores) | Market growth %\n\n✅ Loan Details\n• Loan Type: Term Loan / Working Capital / Composite\n• Loan Amount | Interest Rate | Tenure | Moratorium Period\n\n✅ Product / Revenue Categories\nFor each product/service:\n• Category name (e.g., \"Herbal Soap\")\n• Units sold per month\n• Average price per unit\n→ EazyBizy auto-calculates monthly revenue!\n\n✅ Competitor Analysis\nFor each competitor:\n• Name | Type (Organized/Unorganized/Online)\n• Distance from your location\n• Their strengths and weaknesses\n\n━━━━━━━━━━━━━━━━━━━\n💡 TIPS:\n• Udyam Number is MANDATORY for CGTMSE and bank loans\n• Register free at udyamregistration.gov.in (5 mins, Aadhaar-based)\n• Revenue projections should be conservative — don't overestimate\n• Listing 2–3 competitors shows the bank you've done market research\n• Moratorium period = months before EMI starts (PMEGP: 0, Stand-Up: 18 months)\n\n💬 Say \"Step 10\" for Preview & Submission guidance";
  }

  // ── EazyBizy Form — Step 10 Preview ──────────────────────────────────────
  if (msg.match(/step.*10|preview.*step|step.*preview|final.*step.*form|submit.*form|application.*preview/)) {
    return "👁️ STEP 10 — PREVIEW & SUBMIT APPLICATION\n\n━━━━━━━━━━━━━━━━━━━\n📌 What happens in this step:\n\nEazyBizy auto-generates 3 documents from your form inputs:\n\n1️⃣ GTAB Application Form\n• Your complete loan application in bank-accepted format\n• Includes all personal, business, and project details\n\n2️⃣ CMA Data Report\n• Credit Monitoring Arrangement report\n• 3-year historical (if existing business) + 5-year projections\n• Cash flow, fund flow, key financial ratios\n\n3️⃣ Detailed Project Report (DPR)\n• Full project viability study\n• Market analysis, competitor study, revenue projections\n• Break-even analysis, ROI, DSCR\n\n━━━━━━━━━━━━━━━━━━━\n📌 What to review before submitting:\n✅ All amounts match your actual plan\n✅ Name and address match Aadhaar/PAN\n✅ Loan amount is within scheme limits\n✅ Industry and business type are correctly selected\n\n━━━━━━━━━━━━━━━━━━━\n📤 After Submission:\n1. EazyBizy sends your application to a consultant for review (within 24 hrs)\n2. Consultant verifies and forwards to bank\n3. Track status on your EazyBizy Dashboard\n4. Bank response in 7–21 working days\n\n✅ You're done! All 10 steps completed.\n\n💡 Download the ZIP/PDF and carry hard copies to the bank.";
  }

  // ── Definitions: Margin Money ─────────────────────────────────────────────
  if (msg.match(/margin.*money|what.*margin|define.*margin|margin.*kya|margin.*matlab/)) {
    return "📖 DEFINITION: Margin Money\n\n━━━━━━━━━━━━━━━━━━━\nMargin Money is the minimum percentage of the total project cost that YOU must contribute from your own funds before the bank provides the loan.\n\nIn simpler terms: It's your \"own investment\" or \"down payment\" for the project.\n\n━━━━━━━━━━━━━━━━━━━\n📌 PMEGP Margin Money Rules:\n┌───────────────────────┬────────────┐\n│ Category              │ Margin     │\n├───────────────────────┼────────────┤\n│ General               │ 10% of cost│\n│ SC/ST/Women/Special   │ 5% of cost │\n│ NE/Hill/Minority      │ 5% of cost │\n└───────────────────────┴────────────┘\n\n━━━━━━━━━━━━━━━━━━━\n📌 EXAMPLE:\nProject Cost = ₹10,00,000\n• General category (10%) → You pay ₹1,00,000 yourself\n• Bank gives = ₹9,00,000 (less govt subsidy)\n\n• SC/ST/Women (5%) → You pay ₹50,000 yourself\n• Bank gives = ₹9,50,000 (less govt subsidy)\n\n━━━━━━━━━━━━━━━━━━━\n⚠️ IMPORTANT:\n• Margin money is NOT the same as subsidy\n• Subsidy is what the GOVERNMENT contributes\n• Margin money is what YOU contribute\n• Banks verify that margin money is available upfront\n\n💬 Ask: \"What is subsidy?\" or \"What is PMEGP subsidy?\"";
  }

  // ── Definitions: Working Capital ─────────────────────────────────────────
  if (msg.match(/define.*working.*capital|working.*capital.*meaning|working.*capital.*kya|working.*capital.*definition|what.*working.*capital/)) {
    return "📖 DEFINITION: Working Capital\n\n━━━━━━━━━━━━━━━━━━━\nWorking Capital is the money a business needs to handle its day-to-day operations — like buying raw materials, paying employee salaries, and covering monthly expenses — before money comes in from customers.\n\n━━━━━━━━━━━━━━━━━━━\n📐 FORMULA:\nWorking Capital = Current Assets − Current Liabilities\n\n━━━━━━━━━━━━━━━━━━━\n📌 SIMPLE EXAMPLE:\nA soap factory needs every month:\n• Raw Materials: ₹40,000\n• Wages: ₹15,000\n• Electricity: ₹5,000\n• Packaging: ₹8,000\n\n➡️ Total Working Capital = ₹68,000/month\n\nThe factory sells soap worth ₹1,00,000/month but customers pay after 30 days — so the business needs ₹68,000 upfront to operate. This is working capital.\n\n━━━━━━━━━━━━━━━━━━━\n📌 TYPES OF WORKING CAPITAL LOANS:\n• Cash Credit (CC) — Revolving bank overdraft\n• MUDRA Loan — Up to ₹10 lakh\n• PMEGP — Includes WC in project\n• TReDS — Invoice financing (B2B)\n\n💡 Working capital is typically 1–3 months of operating expenses.\n\n💬 Ask: \"What is cash credit?\" or \"What is PMEGP?\"";
  }

  // ── Definitions: CMA Report ──────────────────────────────────────────────
  if (msg.match(/what.*\bcma\b|define.*\bcma|cma.*report.*meaning|cma.*kya.*hota|credit.*monitoring.*arrangement/)) {
    return getCmaReportsReply();
  }

  // ── Definitions: DPR (Detailed Project Report) ────────────────────────────
  if (msg.match(/what.*\bdpr\b|define.*\bdpr|dpr.*meaning|dpr.*kya|detailed.*project.*report.*meaning/)) {
    return "📖 DEFINITION: DPR — Detailed Project Report\n\n━━━━━━━━━━━━━━━━━━━\nA Detailed Project Report (DPR) is a comprehensive document that explains what the business will do, how it will operate, and how the proposed loan can be repaid.\n\nBanks often ask for a DPR when reviewing MSME and project-based loans.\n\n━━━━━━━━━━━━━━━━━━━\n📌 WHAT DPR CONTAINS:\n\n1️⃣ Promoter Profile — Background, experience, qualifications\n2️⃣ Business Overview — What the business does\n3️⃣ Industry & Market Analysis — Market size, competition, demand\n4️⃣ Technical Feasibility — Location, machinery, process flow\n5️⃣ Project Cost Breakdown — Land, machinery, working capital\n6️⃣ Means of Finance — Bank loan + own contribution + subsidy\n7️⃣ Financial Projections — Revenue, expenses, profit for 5 years\n8️⃣ Break-Even Analysis — How long to become profitable\n9️⃣ ROI & DSCR — Return on investment, loan repayment capacity\n🔟 Risk Assessment — How risks will be managed\n\n━━━━━━━━━━━━━━━━━━━\n📌 MANUAL vs EazyBizy:\n• Manual DPR: usually takes 3–7 days and extra consultant effort\n• EazyBizy DPR: generated from your application data in a bank-ready format\n\n💬 Ask: \"What is CMA?\" or \"What is DSCR?\"";
  }

  // ── Definitions: DSCR ────────────────────────────────────────────────────
  if (msg.match(/\bdscr\b|debt.*service.*coverage|dscr.*meaning|dscr.*kya/)) {
    return "📖 DEFINITION: DSCR — Debt Service Coverage Ratio\n\n━━━━━━━━━━━━━━━━━━━\nDSCR measures whether your business generates ENOUGH profit to repay loan EMIs.\n\nFormula:\nDSCR = Net Cash Accrual / (Principal Repayment + Interest)\n\n━━━━━━━━━━━━━━━━━━━\n📌 WHAT BANKS EXPECT:\n┌──────────┬────────────────────────────────────────┐\n│ DSCR     │ Interpretation                         │\n├──────────┼────────────────────────────────────────┤\n│ 1.5+     │ Very strong — high approval chance     │\n│ 1.25–1.5 │ Good — meets most bank requirements    │\n│ 1.0–1.25 │ Marginal — may need collateral          │\n│ Below 1  │ Weak — likely rejection                │\n└──────────┴────────────────────────────────────────┘\n\n━━━━━━━━━━━━━━━━━━━\n📌 EXAMPLE:\n• Monthly EMI = ₹8,000\n• Monthly Business Profit = ₹12,000\n• DSCR = 12,000 / 8,000 = 1.5 ✅ (Good to go!)\n\n━━━━━━━━━━━━━━━━━━━\n💡 HOW TO IMPROVE DSCR:\n• Increase projected revenue (realistic increase)\n• Reduce expenses\n• Choose longer loan tenure (reduces monthly EMI)\n• Use PMEGP subsidy to reduce the loan amount\n\nEazyBizy auto-calculates DSCR in the CMA Report!\n\n💬 Ask: \"What is CMA?\" or \"What is margin money?\"";
  }

  // ── Definitions: Term Loan ────────────────────────────────────────────────
  if (msg.match(/what.*term.*loan|define.*term.*loan|term.*loan.*meaning|term.*loan.*kya/)) {
    return "📖 DEFINITION: Term Loan\n\n━━━━━━━━━━━━━━━━━━━\nA Term Loan is a fixed loan for a specific time period (tenure) used to buy fixed assets — like land, building, machinery, or equipment.\n\nYou borrow a lump sum and repay it in fixed monthly EMIs over the agreed tenure.\n\n━━━━━━━━━━━━━━━━━━━\n📌 KEY FEATURES:\n• Purpose: Buying fixed assets\n• Repayment: Fixed monthly EMI\n• Tenure: 1–10 years (PMEGP: up to 7 years)\n• Collateral: May or may not be required\n\n━━━━━━━━━━━━━━━━━━━\n📌 vs WORKING CAPITAL LOAN:\n┌────────────────┬──────────────┬──────────────────┐\n│ Feature        │ Term Loan    │ Working Capital  │\n├────────────────┼──────────────┼──────────────────┤\n│ Purpose        │ Fixed assets │ Daily operations │\n│ Repayment      │ Fixed EMI    │ Revolving/on-call│\n│ Tenure         │ Long (3–10yr)│ Short (1 yr)     │\n│ Example        │ Buy machinery│ Buy raw material │\n└────────────────┴──────────────┴──────────────────┘\n\n━━━━━━━━━━━━━━━━━━━\n💡 In EazyBizy Step 3, choose:\n• Term Loan — only for machinery/assets\n• Working Capital — for ops\n• Term + Working Capital — BOTH (recommended for PMEGP manufacturing)\n\n💬 Ask: \"What is working capital?\" or \"How to fill Step 3?\"";
  }

  // ── Definitions: Udyam / MSME Registration ────────────────────────────────
  if (msg.match(/udyam.*registration|udyam.*kya|what.*udyam|msme.*registration|define.*udyam/)) {
    return "📖 DEFINITION: Udyam Registration\n\n━━━━━━━━━━━━━━━━━━━\nUdyam Registration is the official government registration for Micro, Small & Medium Enterprises (MSMEs) in India. It's FREE and done entirely online.\n\nUdyam Certificate = Your business's official MSME identity card.\n\n━━━━━━━━━━━━━━━━━━━\n📌 WHY IT'S IMPORTANT:\n• Mandatory for CGTMSE (collateral-free credit)\n• Required for NSIC registration (govt tenders)\n• Enables access to all MSME schemes\n• Proof of MSME status for banks\n• Subsidy calculations depend on it\n\n━━━━━━━━━━━━━━━━━━━\n📌 HOW TO REGISTER (5 minutes):\n1️⃣ Go to udyamregistration.gov.in\n2️⃣ Enter Aadhaar Number\n3️⃣ OTP verification\n4️⃣ Fill basic business details\n5️⃣ Udyam Certificate generated instantly ✅\n\n━━━━━━━━━━━━━━━━━━━\n📌 WHAT INFORMATION YOU NEED:\n• Aadhaar card | PAN (optional for micro)\n• Bank account details\n• Business activity details\n• NIC code (industry classification)\n\n⚠️ No cost, no documents, no office visit needed!\n🏛️ Portal: udyamregistration.gov.in\n\n💬 Ask: \"What is CGTMSE?\" or \"How to apply?\"";
  }

  // ── EazyBizy Form — Common Mistakes ──────────────────────────────────────
  if (msg.match(/common.*mistake|mistake.*form|error.*form|form.*error|avoid.*mistake|tips.*form|form.*tips/)) {
    return "⚠️ COMMON MISTAKES TO AVOID IN EazyBizy FORM\n\n━━━━━━━━━━━━━━━━━━━\n❌ Mistake 1: Name mismatch\nEnter name EXACTLY as on Aadhaar — even one letter difference causes bank rejection.\n\n❌ Mistake 2: Inflated project cost\nDon't over-state machinery/land costs — banks compare with market rates. Enter actual quotation amounts.\n\n❌ Mistake 3: Skipping Udyam Number\nUdyam Registration is FREE and takes 5 minutes. Without it, CGTMSE and NSIC benefits are unavailable.\n\n❌ Mistake 4: Wrong loan scheme selection\n• PMEGP is for NEW businesses ONLY\n• MUDRA works for both new and existing\n• Use \"Term + Working Capital\" for manufacturing, not just \"Term Loan\"\n\n❌ Mistake 5: Unrealistic revenue projections\nIf projected profit is too high, banks lose confidence. Keep Month 1–3 revenue conservative and ramp up gradually.\n\n❌ Mistake 6: Wrong social category\nSC/ST/Women/OBC get higher subsidy — always mention correct category and keep category certificate ready.\n\n❌ Mistake 7: Missing supplier details\nFor each machine in Step 5, the supplier's name, phone, and email must be filled — banks may verify.\n\n❌ Mistake 8: Monthly vs Annual working capital confusion\nIn Step 8, select the correct period (monthly/annual) — entering annual amount as monthly multiplies by 12 in calculations!\n\n━━━━━━━━━━━━━━━━━━━\n💡 EazyBizy auto-validates many fields before final submit.\n\n💬 Ask about any specific step for more guidance!";
  }

  // ── How to Apply ──────────────────────────────────────────────────────────
  if (msg.match(/how.*apply|apply.*loan|application.*process|steps.*apply|apply.*kaise/)) {
    return "📝 HOW TO APPLY — MSME Loans via EazyBizy\n\n━━━━━━━━━━━━━━━━━━━\n🚀 EazyBizy Process:\n1️⃣ Click 'Apply Now' on homepage\n2️⃣ Select Role: Loan Applicant\n3️⃣ Fill Personal & Business Details\n4️⃣ Enter Loan Amount + Purpose\n5️⃣ EazyBizy auto-generates:\n   ✅ CMA Data Report\n   ✅ Detailed Project Report (DPR)\n   ✅ PMEGP Application support (if applicable)\n6️⃣ Review and download your bank-ready PDF\n7️⃣ Submit to your preferred bank\n8️⃣ Track status on Dashboard\n\n⏱️ Your part: about 20–30 minutes\n📞 Consultant review: within 24 business hours\n\n━━━━━━━━━━━━━━━━━━━\n🏛️ Direct Govt Portals:\n• MUDRA → mudra.org.in\n• PMEGP → kviconline.gov.in\n• SVANidhi → pmsvanidhi.mohua.gov.in\n• Stand-Up → standupmitra.in\n• Startup → startupindia.gov.in\n• Udyam → udyamregistration.gov.in\n\n💡 A helpful first step is to complete your Udyam Registration if applicable.";
  }

  // ── Track / Status ────────────────────────────────────────────────────────
  if (msg.match(/status|track.*application|progress|application.*status|where.*application/)) {
    return "🔍 TRACK YOUR APPLICATION\n\n1️⃣ Login at /auth (or /signup if new user)\n2️⃣ Open Dashboard: /dashboard\n3️⃣ Go to My Applications\n4️⃣ Open the specific application to see current step + status\n\n📊 Journey:\nDraft → Submitted → Under Review → Approved/Rejected → Disbursed\n\n📧 Email + SMS alerts are sent at key stages\n\n🌐 Govt portals (if directly applied):\n• PMEGP → kviconline.gov.in\n• SVANidhi → pmsvanidhi.mohua.gov.in\n• Stand-Up → standupmitra.in";
  }

  // ── Contact ───────────────────────────────────────────────────────────────
  if (msg.match(/contact|support|call|phone|email|human|consultant|speak.*agent/)) {
    return getEazyBizyContactReply();
  }

  // ── Thanks / Bye ──────────────────────────────────────────────────────────
  if (msg.match(/^(thank|thanks|thank\s*you|shukriya|dhanyawad|dhanyabad)[\s!.]*$/)) {
    return "You're most welcome! 😊\n\nAnything else I can help with?\n• More scheme details\n• Eligibility check\n• Document checklist\n• Start application\n\nI'm here 24/7! 🚀";
  }

  if (msg.match(/^(bye|goodbye|alvida|see\s*you)[\s!.]*$/)) {
    return "Goodbye! 👋 Thank you for choosing EazyBizy.\nWishing you great success! 🚀";
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  const stateHint = detectedState ? `\n\n📍 I noticed you mentioned ${detectedState} — ask me about ${detectedState}-specific MSME schemes!` : "";
  return `Can you please share a little more detail so I can guide you properly?\n\nYou can ask me about:\n💬 \"I need ₹10 lakh loan\" → Scheme guidance\n💬 \"Compare MUDRA and PMEGP\" → Side-by-side comparison\n💬 \"How does EazyBizy work?\" → Platform journey\n💬 \"How do I fill the New Application form?\" → Step-by-step form help\n💬 \"Can I save draft and continue later?\" → Draft guidance\n💬 \"Show me the FAQs\" → Common customer questions\n💬 \"How can I contact EazyBizy?\" → Contact details\n💬 \"Calculate EMI for ₹5 lakh at 9.5% for 5 years\" → EMI estimate\n💬 \"What is CMA report?\" → CMA explanation${stateHint}\n\n🌍 Supported languages: English | हिंदी | ଓଡ଼ିଆ\n\n⚠️ Information is indicative and may vary by bank, scheme, or government updates.`;
};

const RobotMark = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
    <circle cx="32" cy="8.5" r="6.3" fill="currentColor" />
    <rect x="30.2" y="14.2" width="3.6" height="5.4" rx="1.8" fill="currentColor" />
    <rect x="10.2" y="18" width="43.6" height="29" rx="13" stroke="currentColor" strokeWidth="4.8" />
    <rect x="21.8" y="18.9" width="20.4" height="8" rx="4" fill="currentColor" />
    <circle cx="23.8" cy="32.3" r="4.6" fill="currentColor" />
    <circle cx="40.2" cy="32.3" r="4.6" fill="currentColor" />
    <rect x="5.2" y="25.1" width="6.2" height="14.4" rx="3.1" fill="currentColor" />
    <rect x="52.6" y="25.1" width="6.2" height="14.4" rx="3.1" fill="currentColor" />
    <path d="M25.8 49.2h12.4c0 6.4-2.5 10.8-6.2 10.8s-6.2-4.4-6.2-10.8Z" fill="currentColor" />
    <path d="M17.4 53.1c2.5-1.2 5.1-1.2 6.9 0v2.1c-2.2 1.3-4.9 1.3-6.9 0v-2.1Z" fill="currentColor" />
    <path d="M39.7 53.1c2.5-1.2 5.1-1.2 6.9 0v2.1c-2.2 1.3-4.9 1.3-6.9 0v-2.1Z" fill="currentColor" />
  </svg>
);

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [launcherPos, setLauncherPos] = useState(() => getInitialPosition(LAUNCHER_SIZE, LAUNCHER_SIZE));
  const [panelPos, setPanelPos] = useState(() => {
    const panelSize = getPanelSize();
    return getInitialPosition(panelSize.width, panelSize.height);
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clampPosition = (x: number, y: number, width: number, height: number) => {
    const viewport = getViewport();
    return {
      x: Math.min(Math.max(x, EDGE_GAP), Math.max(EDGE_GAP, viewport.width - width - EDGE_GAP)),
      y: Math.min(Math.max(y, EDGE_GAP), Math.max(EDGE_GAP, viewport.height - height - EDGE_GAP)),
    };
  };

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-easybizy-chatbot", onOpen);
    return () => window.removeEventListener("open-easybizy-chatbot", onOpen);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setLauncherPos((prev) => clampPosition(prev.x, prev.y, LAUNCHER_SIZE, LAUNCHER_SIZE));
      const panelSize = getPanelSize();
      setPanelPos((prev) => clampPosition(prev.x, prev.y, panelSize.width, panelSize.height));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const startDrag = (target: DragTarget, e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;

    suppressClickRef.current = false;
    const current = target === "launcher" ? launcherPos : panelPos;
    dragStateRef.current = {
      target,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: current.x,
      originY: current.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveDrag = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      suppressClickRef.current = true;
    }

    if (drag.target === "launcher") {
      const next = clampPosition(drag.originX + dx, drag.originY + dy, LAUNCHER_SIZE, LAUNCHER_SIZE);
      setLauncherPos(next);
      return;
    }

    const panelSize = getPanelSize();
    const next = clampPosition(drag.originX + dx, drag.originY + dy, panelSize.width, panelSize.height);
    setPanelPos(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    dragStateRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const sendMessage = () => {
    const userText = input.trim();
    if (!userText || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: getDemoReply(userText, prev) }]);
      setLoading(false);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  const panelSize = getPanelSize();

  return (
    <>
      {!open && (
        <button
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            setOpen(true);
          }}
          onPointerDown={(e) => startDrag("launcher", e)}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Open chatbot"
          className="fixed z-50 h-[62px] w-[62px] rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-xl shadow-teal-500/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-teal-500/40"
          style={{ top: launcherPos.y, left: launcherPos.x, touchAction: "none" }}
        >
          <RobotMark className="mx-auto h-10 w-10 text-white" />
        </button>
      )}

      {open && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden rounded-3xl border border-slate-600/50 bg-gradient-to-br from-slate-800/95 to-slate-900/95 shadow-2xl shadow-slate-900/50 backdrop-blur-xl"
          style={{
            top: panelPos.y,
            left: panelPos.x,
            width: panelSize.width,
            height: panelSize.height,
          }}
        >
          <div
            className="flex cursor-move items-center justify-between border-b border-slate-600/50 px-4 py-3 text-white bg-gradient-to-r from-teal-600/20 to-slate-700/20 backdrop-blur-sm"
            onPointerDown={(e) => startDrag("panel", e)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{ touchAction: "none" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 border border-teal-400/30">
                <RobotMark className="h-7 w-7 text-teal-300" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none text-white">EazyBizy AI Assistant</p>
                <p className="mt-0.5 text-xs text-slate-300">Always here to help you</p>
              </div>
            </div>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setOpen(false)}
              aria-label="Close chatbot"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-800/50 to-slate-900/50 px-4 py-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user" ? "bg-teal-600" : "bg-slate-700 border border-slate-600/50"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-teal-400" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-tr-sm bg-teal-600 text-white"
                      : "rounded-tl-sm bg-slate-700/60 text-slate-200 border border-slate-600/30"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 border border-slate-600/50">
                  <Bot className="h-4 w-4 text-teal-400" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-slate-700/60 px-3.5 py-2.5 border border-slate-600/30">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-600/50 bg-slate-800/60 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-xl border border-slate-600/50 bg-slate-700/40 px-3 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-xs text-slate-400">EazyBizy</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;