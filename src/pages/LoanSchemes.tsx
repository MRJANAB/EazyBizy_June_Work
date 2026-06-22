import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Landmark,
  Factory,
  Building2,
  Coins,
  FileText,
  Shield,
  CheckCircle2,
  IndianRupee,
  Percent,
  Clock,
  Globe,
  Phone,
  ChevronRight,
  Sparkles,
  X,
  Home,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const schemes = [
  {
    id: "mudra",
    icon: Coins,
    gradient: "from-cyan-500 to-teal-500",
    accent: "#06b6d4",
    textColor: "text-cyan-400",
    name: "Mudra Loan",
    code: "MUDRA",
    ministry: "Ministry of Finance, GoI",
    tagline: "Micro Units Development & Refinance Agency",
    description: "Collateral-free funding for micro and small enterprises across manufacturing, trading and service sectors.",
    tags: ["Collateral Free", "Micro Business", "Self-Employed"],
    interestRate: "8.5% p.a.",
    loanAmount: "Up to ₹10 Lakhs",
    tenure: "Up to 5 Years",
    overview: "MUDRA provides collateral-free funding to non-corporate, non-farm small and micro enterprises through three growth-stage categories — Shishu (up to ₹50K), Kishore (₹50K–₹5L), and Tarun (₹5L–₹10L). Ideal for first-time entrepreneurs who need funding without pledging assets.",
    features: [
      { label: "Loan Amount", value: "₹50,000 – ₹10 Lakhs" },
      { label: "Interest Rate", value: "8.5% p.a. onwards" },
      { label: "Tenure", value: "Up to 5 years" },
    ],
    eligibility: [
      "Non-farm income-generating businesses",
      "Individuals, sole proprietors, partnerships & MSMEs",
      "New or existing small businesses",
      "Age: 18–65 years",
    ],
    benefits: [
      "No collateral required",
      "Flexible repayment schedule",
      "Covers all business sectors",
      "Fast-track disbursement",
    ],
    steps: [
      "Identify your category — Shishu, Kishore or Tarun",
      "Approach a scheduled commercial bank, MFI or NBFC",
      "Submit KYC documents and business plan",
      "Receive approval and loan disbursement",
    ],
    portal: "mudra.org.in",
    helpline: "+91-674-3184837",
  },
  {
    id: "pmegp",
    icon: Landmark,
    gradient: "from-amber-500 to-orange-500",
    accent: "#f59e0b",
    textColor: "text-amber-400",
    name: "PMEGP",
    code: "PMEGP",
    ministry: "Ministry of MSME, GoI",
    tagline: "PM Employment Generation Programme",
    description: "Credit-linked subsidy scheme creating employment opportunities through new self-employment ventures.",
    tags: ["Manufacturing", "Service Sector", "Govt. Subsidy"],
    interestRate: "~11% p.a.",
    loanAmount: "Up to ₹25 Lakhs",
    tenure: "3 – 7 Years",
    overview: "PMEGP is administered by KVIC to generate employment through new self-employment enterprises. The government provides a direct subsidy of 15–35% of the project cost, significantly reducing the financial burden for both rural and urban entrepreneurs starting new ventures.",
    features: [
      { label: "Loan Amount", value: "Up to ₹25L (Mfg) / ₹10L (Service)" },
      { label: "Interest Rate", value: "~11% p.a." },
      { label: "Govt. Subsidy", value: "15–35% of project cost" },
    ],
    eligibility: [
      "Age above 18 years",
      "Min. 8th-grade education (projects above ₹10L)",
      "New businesses only — no existing units",
      "Individuals, SHGs, NGOs and Co-operatives",
    ],
    benefits: [
      "Government subsidy up to 35%",
      "Supports rural employment generation",
      "Open to all sectors",
      "EDP training support included",
    ],
    steps: [
      "Register on the PMEGP e-Portal (kviconline.gov.in)",
      "Fill project details and select preferred bank",
      "Interview by KVIC/KVIB district office",
      "Complete EDP training and receive loan",
    ],
    portal: "kviconline.gov.in",
    helpline: "+91-674-3184837",
    
  },
  {
    id: "msme",
    icon: Factory,
    gradient: "from-emerald-500 to-green-500",
    accent: "#22c55e",
    textColor: "text-emerald-400",
    name: "MSME Loan",
    code: "MSME",
    ministry: "Ministry of MSME, GoI",
    tagline: "Micro, Small & Medium Enterprise Finance",
    description: "Standard bank loans for registered MSMEs covering working capital, machinery and business expansion.",
    tags: ["Term Loan", "Working Capital", "Machinery Finance"],
    interestRate: "From 12% p.a.",
    loanAmount: "Up to ₹2 Crore",
    tenure: "1 – 10 Years",
    overview: "MSME loans are offered by banks and NBFCs to registered enterprises for working capital, machinery purchase, expansion and infrastructure. Priority sector lending benefits apply, making approval faster and rates competitive for Udyam-registered businesses.",
    features: [
      { label: "Loan Amount", value: "₹1 Lakh – ₹2 Crore" },
      { label: "Interest Rate", value: "12% p.a. onwards" },
      { label: "Tenure", value: "1 to 10 years" },
    ],
    eligibility: [
      "Registered MSME (Udyam Registration mandatory)",
      "Business vintage of at least 1–2 years",
      "Credit score of 650+ preferred",
      "Stable annual turnover",
    ],
    benefits: [
      "Flexible end-use of funds",
      "Overdraft & term loan options available",
      "Priority sector lending benefits",
      "Quick digital approvals",
    ],
    steps: [
      "Obtain Udyam Registration Certificate",
      "Prepare CMA data and financial documents",
      "Apply at bank or via online MSME portal",
      "Bank assessment and loan disbursal",
    ],
    portal: "msme.gov.in",
    helpline: "+91-674-3184837",
    
  },
  {
    id: "other",
    icon: FileText,
    gradient: "from-rose-500 to-pink-500",
    accent: "#f43f5e",
    textColor: "text-rose-400",
    name: "Other Schemes",
    code: "STATE & SECTOR",
    ministry: "Various Ministries, GoI & State Govts.",
    tagline: "State & Sector-Specific Programmes",
    description: "NABARD, NSIC, Startup India and state-level MSME subsidy programmes for niche sectors and demographics.",
    tags: ["State Subsidies", "Sector Specific", "Women & Youth"],
    interestRate: "Varies",
    loanAmount: "As per scheme",
    tenure: "Varies",
    overview: "Beyond central government schemes, state-specific and sector-specific loan programmes provide targeted support — including NABARD for rural businesses, NSIC for traders, Startup India seed funding, and state-level MSME subsidy programmes catering to specific geographies, sectors or demographics.",
    features: [
      { label: "Schemes Include", value: "NABARD, NSIC, Startup India, State MSME" },
      { label: "Interest Rate", value: "Varies by scheme" },
      { label: "Subsidy", value: "Available in select programmes" },
    ],
    eligibility: [
      "Varies by individual scheme",
      "Typically SMEs, startups and rural entrepreneurs",
      "Some restricted by state or sector",
      "Refer to scheme-specific guidelines",
    ],
    benefits: [
      "Highly targeted, need-based support",
      "Grants and capital subsidies available",
      "Training and mentoring included",
      "Non-financial benefits often bundled",
    ],
    steps: [
      "Identify the scheme matching your business type and state",
      "Visit the relevant government portal or bank branch",
      "Submit required documents and application form",
      "Track status online or through the nodal officer",
    ],
    portal: "msme.gov.in",
    helpline: "+91-674-3184837",
    
  },
];

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
const schemeRouteMap: Record<string, string> = {
  mudra: "/mudra-loan",
  pmegp: "/pmegp",
  msme: "/msme-loan",
  other: "/other-schemes",
};

const LoanSchemes = () => {
  const [activeId, setActiveId] = useState<string>("mudra");
  const active = schemes.find((s) => s.id === activeId)!;
  const ActiveIcon = active.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="gradient-hero pt-32 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] gradient-glow blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 gradient-glow blur-3xl opacity-10 pointer-events-none" />

        <div className="container mx-auto max-w-6xl px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="mb-6 flex justify-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </Link>
            </div>
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-primary/25 bg-accent/60 backdrop-blur-sm">
              <Landmark className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Government of India · MSME Finance Portal</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-5 leading-tight">
              Government <span className="text-gradient-primary">Loan Schemes</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto mb-8">
              Explore India's premier government-backed MSME loan programmes — compare features, check eligibility and apply in minutes.
            </p>

            {/* Scheme pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {schemes.map((s) => {
                const Icon = s.icon;
                const isCurrent = activeId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-200 ${
                      isCurrent
                        ? "border-transparent text-white shadow-md"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground bg-card"
                    }`}
                    style={isCurrent ? { background: `linear-gradient(135deg, ${s.accent}, ${s.accent}99)` } : {}}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {s.name}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Main Content: Sidebar + Detail ── */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-6">

            {/* ── Left: Scheme List ── */}
            <div className="lg:col-span-4 xl:col-span-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-1">Available Schemes</p>
              <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {schemes.map((s, i) => {
                  const Icon = s.icon;
                  const isCurrent = activeId === s.id;
                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.06 }}
                      onClick={() => setActiveId(s.id)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all duration-250 min-w-[190px] lg:min-w-0 flex-shrink-0 ${
                        isCurrent
                          ? "border-primary/40 bg-accent/40 shadow-md"
                          : "border-border bg-card hover:border-primary/20 hover:bg-muted/30"
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: isCurrent ? `linear-gradient(135deg, ${s.accent}60, ${s.accent}25)` : undefined }}
                      >
                        <Icon
                          className={`w-4 h-4 ${isCurrent ? s.textColor : "text-muted-foreground"}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold truncate leading-tight ${isCurrent ? "text-foreground" : "text-foreground/70"}`}>{s.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{s.loanAmount}</p>
                      </div>
                      {isCurrent && <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </motion.button>
                  );
                })}
              </div>

              {/* Quick compare strip */}
              <div className="hidden lg:block mt-6 rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Quick Stats</p>
                <div className="space-y-2.5">
                  {[
                    { icon: IndianRupee, label: "Amount", value: active.loanAmount },
                    { icon: Percent, label: "Rate", value: active.interestRate },
                    { icon: Clock, label: "Tenure", value: active.tenure },
                  ].map(({ icon: SI, label, value }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <SI className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="ml-auto text-xs font-semibold text-foreground text-right max-w-[55%] leading-tight">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: Detail Panel ── */}
            <div className="lg:col-span-8 xl:col-span-9">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-3xl border border-border overflow-hidden shadow-elevated"
                >
                  {/* Gradient Header */}
                  <div className={`relative bg-gradient-to-br ${active.gradient} px-8 py-8 overflow-hidden`}>
                    <div className="absolute top-4 right-4 z-20">
                      <Link
                        to={schemeRouteMap[active.id] ?? "/mudra-loan"}
                        state={{ from: "/loan-schemes" }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md shadow-sm transition hover:bg-white/20"
                      >
                        Read More
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    <div className="absolute -left-8 -bottom-12 w-48 h-48 rounded-full bg-black/20 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex items-start gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-lg flex-shrink-0">
                        <ActiveIcon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">{active.ministry}</p>
                        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">{active.name}</h2>
                        <p className="text-white/80 text-sm mt-1">{active.tagline}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {active.tags.map((tag) => (
                            <span key={tag} className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-white/90 font-medium">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Stat pills */}
                    <div className="relative z-10 mt-6 grid grid-cols-3 gap-3">
                      {[
                        { icon: IndianRupee, label: "Loan Amount", value: active.loanAmount },
                        { icon: Percent, label: "Interest Rate", value: active.interestRate },
                        { icon: Clock, label: "Tenure", value: active.tenure },
                      ].map(({ icon: SI, label, value }) => (
                        <div key={label} className="rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <SI className="w-3 h-3 text-white/60" />
                            <span className="text-white/60 text-[10px] uppercase tracking-widest">{label}</span>
                          </div>
                          <p className="text-white font-bold text-sm leading-tight">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="bg-card p-8 grid md:grid-cols-2 gap-10">
                    {/* Left column */}
                    <div className="space-y-8">
                      {/* Overview */}
                      <div>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${active.gradient}`} />
                          <h4 className="text-foreground font-bold text-xs uppercase tracking-widest">Overview</h4>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed border-l-2 pl-4" style={{ borderColor: active.accent }}>
                          {active.overview}
                        </p>
                      </div>

                      {/* Key Features */}
                      <div>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${active.gradient}`} />
                          <h4 className="text-foreground font-bold text-xs uppercase tracking-widest">Key Features</h4>
                        </div>
                        <div className="rounded-xl border border-border overflow-hidden">
                          {active.features.map((f, i) => (
                            <div
                              key={f.label}
                              className={`flex items-center justify-between px-5 py-3 ${i % 2 === 0 ? "bg-muted/50" : "bg-card"} ${i < active.features.length - 1 ? "border-b border-border" : ""}`}
                            >
                              <span className="text-muted-foreground text-sm">{f.label}</span>
                              <span className="text-foreground text-sm font-semibold text-right max-w-[55%] leading-tight">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Eligibility */}
                      <div>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${active.gradient}`} />
                          <h4 className="text-foreground font-bold text-xs uppercase tracking-widest">Eligibility</h4>
                        </div>
                        <ul className="space-y-2.5">
                          {active.eligibility.map((item) => (
                            <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                              <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${active.textColor}`} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-8">
                      {/* Benefits */}
                      <div>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${active.gradient}`} />
                          <h4 className="text-foreground font-bold text-xs uppercase tracking-widest">Key Benefits</h4>
                        </div>
                        <ul className="space-y-2.5">
                          {active.benefits.map((b) => (
                            <li key={b} className="flex items-start gap-3 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* How to Apply */}
                      <div>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${active.gradient}`} />
                          <h4 className="text-foreground font-bold text-xs uppercase tracking-widest">How to Apply</h4>
                        </div>
                        <ol className="space-y-3">
                          {active.steps.map((step, i) => (
                            <li key={step} className="flex items-start gap-3.5">
                              <span
                                className="flex-shrink-0 w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-sm"
                                style={{ background: `linear-gradient(135deg, ${active.accent}, ${active.accent}80)` }}
                              >
                                {i + 1}
                              </span>
                              <span className="text-muted-foreground text-sm leading-relaxed pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Resources */}
                      <div className="rounded-xl border border-border overflow-hidden">
                        <div className="px-5 py-3 bg-muted border-b border-border">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Official Resources</p>
                        </div>
                        <div className="p-5 space-y-3">
                          <a
                            href={`https://${active.portal}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors group/link"
                          >
                            <Globe className={`w-4 h-4 ${active.textColor} flex-shrink-0`} />
                            <span className="font-medium group-hover/link:underline">{active.portal}</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40 group-hover/link:opacity-100 transition-opacity" />
                          </a>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Phone className={`w-4 h-4 ${active.textColor} flex-shrink-0`} />
                            <span>Helpline — <span className="font-semibold text-foreground">{active.helpline}</span></span>
                          </div>
                        </div>
                      </div>

                      {/* CTA */}
                      <Link
                        to="/signup"
                        className={`flex items-center justify-center gap-2.5 w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r ${active.gradient} hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-button text-base`}
                      >
                        Apply Now <ArrowRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="py-16 px-4 border-t border-border bg-card">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Compare</p>
            <h2 className="text-2xl font-bold text-foreground">All Schemes at a Glance</h2>
          </motion.div>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Scheme</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Max Amount</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Rate</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Tenure</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Best For</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {schemes.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-border last:border-0 cursor-pointer transition-colors duration-150 ${activeId === s.id ? "bg-accent/30" : "hover:bg-muted/40"}`}
                      onClick={() => { setActiveId(s.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-semibold text-foreground">{s.name}</span>
                        </div>
                      </td>
                      <td className={`px-5 py-4 font-semibold ${s.textColor}`}>{s.loanAmount}</td>
                      <td className="px-5 py-4 text-muted-foreground">{s.interestRate}</td>
                      <td className="px-5 py-4 text-muted-foreground">{s.tenure}</td>
                      <td className="px-5 py-4">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">{s.tags[0]}</span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to={schemeRouteMap[s.id] ?? "/loan-schemes"}
                          className={`flex items-center gap-1 text-xs font-semibold ${s.textColor}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="relative rounded-3xl overflow-hidden border border-primary/20 gradient-card shadow-elevated p-12 text-center"
          >
            <div className="absolute -top-20 -right-20 w-72 h-72 gradient-glow blur-3xl opacity-30 pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 gradient-glow blur-3xl opacity-20 pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border border-primary/25 bg-accent/60">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Ready to Apply?</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
                Not sure which scheme? <br />
                <span className="text-gradient-primary">We'll guide you.</span>
              </h2>
              <p className="text-muted-foreground text-base max-w-xl mx-auto mb-8">
                Start your application — our smart form recommends the right scheme based on your business profile, automatically.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/signup"
                  className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-primary-foreground gradient-primary hover:opacity-90 active:scale-[0.98] transition-all shadow-button text-base"
                >
                  Start Free Application <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/how-it-works"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-foreground border border-border hover:border-primary/40 hover:bg-muted transition-all text-base"
                >
                  How It Works
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LoanSchemes;
