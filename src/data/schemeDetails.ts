import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Factory,
  FileBadge2,
  Globe,
  HandCoins,
  Landmark,
  LucideIcon,
  Rocket,
  ShieldCheck,
} from "lucide-react";

export type SchemeDetail = {
  slug: string;
  title: string;
  shortTitle: string;
  ministry: string;
  tagline: string;
  heroBadge: string;
  description: string;
  heroImage?: string;
  heroImagePosition?: string;
  gradient: string;
  accentClass: string;
  softAccentClass: string;
  icon: LucideIcon;
  stats: Array<{ label: string; value: string }>;
  supportSummary: Array<{ label: string; value: string; icon: LucideIcon }>;
  idealFor: string[];
  highlights: string[];
  eligibility: string[];
  documents: string[];
  process: string[];
  faqs: Array<{ question: string; answer: string }>;
  portalLabel: string;
  portalUrl: string;
  helpline: string;
  related: Array<{ title: string; href: string; description: string }>;
};

export const schemeDetails: Record<string, SchemeDetail> = {
  mudra: {
    slug: "mudra",
    title: "PM MUDRA Loan Yojana",
    shortTitle: "Micro Units Development and Refinance Agency support",
    ministry: "Ministry of Finance, Government of India",
    tagline:
      "Collateral-free business finance for early-stage entrepreneurs, traders and service businesses.",
    heroBadge: "Government-backed MSME support",
    description:
      "Mudra is one of the most approachable business finance options for small entrepreneurs. It supports first-time founders and micro businesses with category-based loan sizes and a simpler path to funding without traditional collateral.",
    heroImage: "/mudra-banner.png",
    heroImagePosition: "object-[72%_center]",
    gradient: "from-cyan-500 via-teal-500 to-emerald-500",
    accentClass: "text-cyan-300",
    softAccentClass: "bg-cyan-400/10 border-cyan-300/20",
    icon: HandCoins,
    stats: [
      { label: "Loan Range", value: "Rs. 50,000 to Rs. 10 lakh" },
      { label: "Categories", value: "Shishu, Kishore and Tarun" },
      { label: "Collateral", value: "Usually not required" },
    ],
    supportSummary: [
      { label: "Best For", value: "Micro and small business starters", icon: Rocket },
      { label: "Popular Use", value: "Working capital and small business setup", icon: Briefcase },
      { label: "Advantage", value: "Structured category-wise funding journey", icon: ArrowUpRight },
    ],
    idealFor: [
      "First-time entrepreneurs starting a shop, service unit or small trade activity",
      "Very small businesses needing manageable funding without heavy security",
      "Applicants who want a scheme aligned to business stage and ticket size",
    ],
    highlights: [
      "Shishu supports the earliest business stage with small ticket funding",
      "Kishore and Tarun help users move into growth and expansion phases",
      "Useful for manufacturing, trading and service businesses",
      "A strong project note still improves lender confidence and approval quality",
    ],
    eligibility: [
      "Applicant should be an Indian citizen with an income-generating business proposal",
      "Suitable for non-corporate, non-farm micro or small business activity",
      "Business purpose should be genuine and commercially viable",
      "KYC, banking and business details should be complete and consistent",
    ],
    documents: [
      "Aadhaar, PAN and address proof",
      "Business profile or project report with basic cost estimates",
      "Bank statements and account details",
      "Business registration or trade proof where applicable",
      "Quotation or use-of-funds summary for the requested amount",
    ],
    process: [
      "Choose the right Mudra category based on the business stage and amount needed",
      "Prepare KYC, business summary and simple financial assumptions",
      "Apply through an eligible bank, NBFC or microfinance channel",
      "After review and sanction, the amount is disbursed based on lender terms",
    ],
    faqs: [
      {
        question: "Which Mudra category should a new user choose?",
        answer:
          "Most new micro businesses begin with Shishu, while Kishore and Tarun are more suitable once the business requirement and scale increase.",
      },
      {
        question: "Is collateral always required?",
        answer:
          "Mudra is widely known for collateral-free support, but final sanction conditions still depend on the lender and the application profile.",
      },
      {
        question: "Does Mudra work for service businesses too?",
        answer:
          "Yes. Small service businesses, trading units and manufacturing activities can all fit when the business case is valid.",
      },
    ],
    portalLabel: "Mudra Scheme Information",
    portalUrl: "https://www.mudra.org.in/",
    helpline: "+91-674-3184837",
    related: [
      {
        title: "PMEGP",
        href: "/pmegp",
        description: "A better fit when the user needs subsidy-backed support for a new enterprise.",
      },
      {
        title: "MSME Loan",
        href: "/msme-loan",
        description: "Useful once the business matures and needs formal growth capital.",
      },
    ],
  },
  pmegp: {
    slug: "pmegp",
    title: "PMEGP",
    shortTitle: "Prime Minister's Employment Generation Programme",
    ministry: "Ministry of MSME, Government of India",
    tagline:
      "A subsidy-backed scheme for first-generation entrepreneurs launching new businesses.",
    heroBadge: "Government subsidy for new enterprises",
    description:
      "PMEGP combines bank finance with margin money subsidy so users can start a manufacturing or service business with lower promoter contribution and structured government support.",
    heroImage: "/pmegp-banner.png",
    heroImagePosition: "object-[76%_center]",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    accentClass: "text-amber-300",
    softAccentClass: "bg-amber-400/10 border-amber-300/20",
    icon: Landmark,
    stats: [
      { label: "Project Cost", value: "Up to Rs. 50 lakh" },
      { label: "Subsidy Support", value: "15% to 35%" },
      { label: "Business Type", value: "New units only" },
    ],
    supportSummary: [
      { label: "Best For", value: "New manufacturing and service units", icon: Rocket },
      { label: "Promoter Margin", value: "Starts from 5% for select categories", icon: HandCoins },
      { label: "Application Mode", value: "Online portal plus bank appraisal", icon: Globe },
    ],
    idealFor: [
      "First-time founders starting a new rural or urban enterprise",
      "Applicants who need subsidy support to reduce upfront capital burden",
      "Manufacturing, retail, repair, food processing and service businesses",
    ],
    highlights: [
      "Subsidy is credited after bank sanction and lock-in norms",
      "Supports both rural and urban entrepreneurs",
      "Training and project guidance can improve bank readiness",
      "Works well when the business report is detailed and realistic",
    ],
    eligibility: [
      "Applicant should be at least 18 years old",
      "New project only, not an already-running unit",
      "Minimum 8th pass for higher-value project categories",
      "Individual, SHG, trust, society or eligible institution can apply",
    ],
    documents: [
      "Aadhaar, PAN and address proof",
      "Detailed project report with cost and revenue assumptions",
      "Education proof where applicable",
      "Category certificate for subsidy benefits if applicable",
      "Business activity details and bank branch preference",
    ],
    process: [
      "Complete the online PMEGP application and upload project details",
      "District-level scrutiny and interview are carried out by the nodal agency",
      "The bank evaluates viability, financials and promoter contribution",
      "After sanction, training and subsidy processing are completed before full release",
    ],
    faqs: [
      {
        question: "Can an existing business apply for PMEGP?",
        answer:
          "No. PMEGP is designed for new ventures. Existing units are generally not eligible under this scheme.",
      },
      {
        question: "Why does the project report matter so much?",
        answer:
          "Because the bank uses it to judge feasibility, repayment comfort, employment generation and subsidy suitability.",
      },
      {
        question: "Is subsidy paid directly to the user?",
        answer:
          "The subsidy is routed through the financing bank and follows scheme conditions rather than being treated as unrestricted cash.",
      },
    ],
    portalLabel: "PMEGP e-Portal",
    portalUrl: "https://www.kviconline.gov.in/pmegp/",
    helpline: "+91-674-3184837",
    related: [
      {
        title: "Mudra Loan",
        href: "/mudra-loan",
        description: "For micro-enterprises that need fast collateral-free working capital.",
      },
      {
        title: "MSME Loan",
        href: "/msme-loan",
        description: "For businesses with operating history seeking expansion finance.",
      },
    ],
  },
  msme: {
    slug: "msme",
    title: "MSME Loan",
    shortTitle: "Business expansion finance for Udyam-registered enterprises",
    ministry: "Ministry of MSME and partner banks",
    tagline:
      "A broad lending category covering working capital, machinery purchase and business expansion.",
    heroBadge: "Growth capital for registered businesses",
    description:
      "MSME loans are suited for enterprises with real operating traction. They are commonly used for stock purchase, machinery, shop fit-outs, working capital cycles and expansion into larger markets.",
    heroImage: "/msme-banner.png",
    heroImagePosition: "object-[74%_center]",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    accentClass: "text-emerald-300",
    softAccentClass: "bg-emerald-400/10 border-emerald-300/20",
    icon: Factory,
    stats: [
      { label: "Loan Range", value: "Rs. 1 lakh to Rs. 2 crore+" },
      { label: "Use Cases", value: "Working capital, equipment, expansion" },
      { label: "Tenure", value: "Up to 10 years" },
    ],
    supportSummary: [
      { label: "Best For", value: "Existing MSMEs with turnover visibility", icon: Briefcase },
      { label: "Key Requirement", value: "Udyam and business financials", icon: FileBadge2 },
      { label: "Advantage", value: "Bank and NBFC options with digital processing", icon: ArrowUpRight },
    ],
    idealFor: [
      "Growing businesses that need inventory or working capital support",
      "Units planning machinery upgrades, renovation or capacity expansion",
      "Enterprises with banking history and formal registration",
    ],
    highlights: [
      "Suitable for both term loan and overdraft style funding",
      "Often faster when GST, bank statements and turnover data are clean",
      "Can support CAPEX as well as daily business operations",
      "Works best when repayment capacity is clearly demonstrated",
    ],
    eligibility: [
      "Udyam registration is generally expected",
      "Business vintage of at least 1 to 2 years is preferred by most lenders",
      "Banking discipline and acceptable credit profile improve approval odds",
      "Financial statements, GST or turnover proofs should support requested amount",
    ],
    documents: [
      "Udyam certificate and business PAN",
      "Bank statements and GST returns",
      "ITR, balance sheet or income proof",
      "Ownership, shop or office proof",
      "Quotation for machinery or asset purchase if applicable",
    ],
    process: [
      "Choose loan type based on working capital or expansion requirement",
      "Prepare financial pack with turnover, banking and end-use details",
      "Lender reviews business strength, repayment ability and collateral position",
      "Sanction, documentation and disbursement follow the approved structure",
    ],
    faqs: [
      {
        question: "Do all MSME loans require collateral?",
        answer:
          "Not always. Smaller facilities may be unsecured, while higher amounts can require security or be structured under guarantee support.",
      },
      {
        question: "What helps approval the most?",
        answer:
          "Stable turnover, healthy banking, a clear loan purpose and documents that match the requested amount.",
      },
      {
        question: "Can a new business apply?",
        answer:
          "Some lenders support newer units, but most MSME term facilities become easier once the business shows operating history.",
      },
    ],
    portalLabel: "MSME Portal",
    portalUrl: "https://www.msme.gov.in/",
    helpline: "+91-674-3184837",
    related: [
      {
        title: "PMEGP",
        href: "/pmegp",
        description: "Useful when the business is new and subsidy support is important.",
      },
      {
        title: "Other Schemes",
        href: "/other-schemes",
        description: "Explore niche support for state, rural and sector-specific use cases.",
      },
    ],
  },
  other: {
    slug: "other",
    title: "Other Schemes",
    shortTitle: "State, sector and founder-specific support programmes",
    ministry: "State governments, MSME bodies and sector institutions",
    tagline:
      "A curated category for users who may qualify for more targeted schemes beyond the standard loan products.",
    heroBadge: "Targeted support beyond the mainstream options",
    description:
      "Many users are better served by specialised programmes tied to geography, category, sector, export activity, women entrepreneurship or rural development. This page helps position those options clearly.",
    heroImage: "/government-schemes-banner.png",
    heroImagePosition: "object-top",
    gradient: "from-sky-500 via-indigo-500 to-violet-500",
    accentClass: "text-sky-300",
    softAccentClass: "bg-sky-400/10 border-sky-300/20",
    icon: Building2,
    stats: [
      { label: "Coverage", value: "State and sector-specific programmes" },
      { label: "Support Type", value: "Loans, subsidy, reimbursement, guarantee" },
      { label: "Fit", value: "Depends on user profile and business type" },
    ],
    supportSummary: [
      { label: "Best For", value: "Users with niche business or category advantage", icon: ShieldCheck },
      { label: "Examples", value: "Startup, rural, women, export and cluster schemes", icon: Building2 },
      { label: "Approach", value: "Shortlist schemes based on geography and activity", icon: Globe },
    ],
    idealFor: [
      "Applicants who do not fit neatly into Mudra or standard MSME finance",
      "Businesses eligible for state subsidy or reimbursement programmes",
      "Founders in agriculture-allied, export, manufacturing cluster or women-led categories",
    ],
    highlights: [
      "Can include capital subsidy, interest subvention or reimbursement",
      "Eligibility often depends on state, district, category or business segment",
      "The right scheme mix can materially reduce cost of capital",
      "Professional documentation is critical because the rules vary across programmes",
    ],
    eligibility: [
      "No single eligibility rule applies across all schemes",
      "Many programmes require location-based or category-based proof",
      "Sector activity, promoter profile and project size often determine fit",
      "Users should shortlist schemes before preparing the final application set",
    ],
    documents: [
      "Identity and address proof of promoters",
      "Business registration and activity classification",
      "Project report with capital expenditure and job creation details",
      "State-specific declarations or category certificates if applicable",
      "Licences, quotations or approvals relevant to the target programme",
    ],
    process: [
      "Identify whether the business has a state, category or sector-specific advantage",
      "Shortlist the most relevant programme instead of applying everywhere",
      "Prepare a scheme-specific project note with required declarations",
      "Submit through the designated state portal, nodal office or partner bank",
    ],
    faqs: [
      {
        question: "Why group these under one page?",
        answer:
          "Because these schemes change by state and sector, so the best user experience is to guide users toward the right bucket first.",
      },
      {
        question: "Are these always better than regular MSME loans?",
        answer:
          "Not always. They are better when the user genuinely qualifies for subsidy, reimbursement or a special support window.",
      },
      {
        question: "What should the user do first?",
        answer:
          "Start with business type, state, ownership profile and project size. That quickly narrows the scheme shortlist.",
      },
    ],
    portalLabel: "MSME Scheme Directory",
    portalUrl: "https://www.msme.gov.in/1/schemes",
    helpline: "+91-674-3184837",
    related: [
      {
        title: "PMEGP",
        href: "/pmegp",
        description: "For new units where subsidy and employment generation are central.",
      },
      {
        title: "MSME Loan",
        href: "/msme-loan",
        description: "For established businesses seeking formal growth capital.",
      },
    ],
  },
};