import { useState } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  UserCircle2,
  ClipboardEdit,
  FileBarChart2,
  BadgeCheck,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Timer,
  Building2,
  Banknote,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const steps = [
  {
    id: 1,
    number: "01",
    icon: UserCircle2,
    title: "Register & Login",
    description: "Create your free account in under 30 seconds — just an email and password.",
    detail: "Sign up as a loan applicant or use Google login. Your data is encrypted end-to-end and stored securely. No credit card required.",
    accent: "#06b6d4",
    bg: "from-cyan-500/10 to-teal-500/5",
    badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    bar: "bg-gradient-to-b from-cyan-500 to-teal-500",
  },
  {
    id: 2,
    number: "02",
    icon: ClipboardEdit,
    title: "Fill 9-Step Form",
    description: "Complete your loan application with guided digital steps — personal, business & project details.",
    detail: "Our smart form auto-saves your progress. Each step is clearly labelled with tooltips. Takes 15–20 minutes on average.",
    accent: "#f59e0b",
    bg: "from-amber-500/10 to-orange-500/5",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    bar: "bg-gradient-to-b from-amber-500 to-orange-500",
  },
  {
    id: 3,
    number: "03",
    icon: FileBarChart2,
    title: "Get Bank Report",
    description: "Receive your auto-generated, RBI-compliant CMA project report — ready for bank submission.",
    detail: "No manual drafting. Your report is generated instantly, formatted to bank standards, and downloadable as a PDF.",
    accent: "#22c55e",
    bg: "from-emerald-500/10 to-green-500/5",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    bar: "bg-gradient-to-b from-emerald-500 to-green-500",
  },
  {
    id: 4,
    number: "04",
    icon: BadgeCheck,
    title: "Get Approved",
    description: "Submit to your bank and receive your government loan — with up to 35% subsidy.",
    detail: "Our reports are accepted by 50+ scheduled banks. Track your application status and get expert support throughout.",
    accent: "#a855f7",
    bg: "from-violet-500/10 to-purple-500/5",
    badge: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    bar: "bg-gradient-to-b from-violet-500 to-purple-500",
  },
];

const faqs = [
  {
    q: "How long does the entire process take?",
    a: "Most applicants complete the form in 20–30 minutes. The bank report is generated instantly. Bank approval depends on the lender but typically takes 7–21 working days.",
  },
  {
    q: "Do I need a CA or consultant?",
    a: "No. EazyBizy auto-generates a professional CMA report that replaces what a CA would prepare manually — saving you ₹10,000–₹30,000 in fees.",
  },
  {
    q: "Which banks accept EazyBizy reports?",
    a: "All major scheduled commercial banks — SBI, PNB, Canara, Union Bank, Bank of Baroda, and 40+ others — accept our RBI-compliant project reports.",
  },
  {
    q: "Is there a subsidy available?",
    a: "Yes. Under PMEGP, you can receive a government subsidy of 15–35% of your project cost directly credited to your loan account.",
  },
];

const docs = [
  "Aadhaar & PAN Card",
  "Business Address Proof",
  "Udyam Registration (if existing)",
  "Bank Account Details",
  "Business Plan / Project Idea",
  "Passport-size Photograph",
];

const renderAnimatedStatValue = (rawValue: string, index: number) => {
  const cleanValue = rawValue.trim();
  const matched = cleanValue.match(/^(\d+(?:\.\d+)?)(.*)$/);
  const numericValue = matched ? Number(matched[1]) : 0;
  const suffix = matched ? matched[2] : "";
  const decimals = matched && matched[1].includes(".") ? matched[1].split(".")[1].length : 0;

  return (
    <motion.p
      key={`stat-value-${index}`}
      initial={{ opacity: 0, rotateY: -90, y: 12 }}
      animate={{ opacity: 1, rotateY: 0, y: 0 }}
      transition={{ duration: 1.6, ease: "easeOut" }}
      className="text-2xl font-extrabold text-foreground will-change-transform"
    >
      <CountUp
        start={0}
        end={numericValue}
        duration={1.6}
        decimals={decimals}
        suffix={suffix}
        preserveValue={false}
      />
    </motion.p>
  );
};

/* ─────────────────────────────────────────
   FAQ ITEM
───────────────────────────────────────── */
const FaqItem = ({ q, a, index }: { q: string; a: string; index: number }) => {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.38, delay: index * 0.07 }}
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${open ? "border-primary/40 bg-accent/30" : "border-border bg-card hover:border-primary/20"}`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
      >
        <span className="text-foreground font-semibold text-sm leading-snug">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="flex-shrink-0">
          <ChevronDown className="w-4 h-4 text-primary" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <p className="px-6 pb-5 text-muted-foreground text-sm leading-relaxed border-t border-border pt-4">{a}</p>
      </motion.div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const active = steps.find((s) => s.id === activeStep)!;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="gradient-hero pt-32 pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[420px] h-[420px] gradient-glow blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 gradient-glow blur-3xl opacity-10 pointer-events-none" />

        <div className="container mx-auto max-w-6xl px-4 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left copy */}
            <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}>
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-primary/25 bg-accent/60 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Simple · Fast · Transparent</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-5 leading-tight">
                How It <span className="text-gradient-primary">Works</span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Get your MSME government loan approved in 4 guided steps — fully digital, no paperwork, auto-generated bank-ready reports.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/signup"
                  className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-primary-foreground gradient-primary hover:opacity-90 active:scale-[0.98] transition-all shadow-button text-sm"
                >
                  Start Free Application <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/loan-schemes"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-foreground border border-border hover:border-primary/40 hover:bg-muted transition-all text-sm"
                >
                  View Loan Schemes
                </Link>
              </div>
            </motion.div>

            {/* Right: Stats grid */}
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { icon: Timer, value: "20 min", label: "Average form time", color: "text-cyan-400" },
                { icon: Building2, value: "50+", label: "Banks accepting reports", color: "text-amber-400" },
                { icon: Banknote, value: "35%", label: "Max govt. subsidy", color: "text-emerald-400" },
                { icon: Star, value: "4.9★", label: "Applicant satisfaction", color: "text-violet-400" },
              ].map(({ icon: Icon, value, label, color }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                  className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-2"
                >
                  <Icon className={`w-6 h-6 ${color}`} />
                  {renderAnimatedStatValue(value, i)}
                  <p className="text-muted-foreground text-xs leading-tight">{label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Interactive Steps ── */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">The Process</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Your Journey in 4 Steps</h2>
            <p className="text-muted-foreground text-sm">Click any step to explore what happens at each stage.</p>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-6 items-start">
            {/* Step selector — left column */}
            <div className="lg:col-span-2 flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const isActive = activeStep === step.id;
                return (
                  <motion.button
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    onClick={() => setActiveStep(step.id)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all duration-300 min-w-[200px] lg:min-w-0 flex-shrink-0 ${
                      isActive
                        ? "border-primary/40 bg-accent/40 shadow-md"
                        : "border-border bg-card hover:border-primary/20 hover:bg-muted/40"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        isActive ? "bg-gradient-to-br " + step.bar + " shadow-md" : "bg-muted"
                      }`}
                      style={isActive ? { background: `linear-gradient(135deg, ${step.accent}60, ${step.accent}20)` } : {}}
                    >
                      <Icon className="w-5 h-5" style={{ color: isActive ? step.accent : undefined }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Step {step.number}</p>
                      <p className={`text-sm font-bold leading-tight truncate ${isActive ? "text-foreground" : "text-foreground/70"}`}>{step.title}</p>
                    </div>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Step detail — right panel */}
            <div className="lg:col-span-3">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={`rounded-3xl border border-border overflow-hidden bg-gradient-to-br ${active.bg} p-8 lg:p-10 min-h-[320px] relative`}
              >
                {/* Glow */}
                <div
                  className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ background: active.accent }}
                />

                <span
                  className={`inline-flex items-center text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border mb-6 ${active.badge}`}
                >
                  Step {active.number}
                </span>

                <div className="flex items-start gap-5 mb-6 relative z-10">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${active.accent}, ${active.accent}80)` }}
                  >
                    {(() => { const Icon = active.icon; return <Icon className="w-8 h-8 text-white" strokeWidth={1.75} />; })()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-foreground mb-2">{active.title}</h3>
                    <p className="text-muted-foreground text-base leading-relaxed">{active.description}</p>
                  </div>
                </div>

                <p className="text-muted-foreground/80 text-sm leading-relaxed border-l-2 pl-4 relative z-10 mb-8" style={{ borderColor: active.accent }}>
                  {active.detail}
                </p>

                {/* Step progress dots */}
                <div className="flex items-center gap-2 relative z-10">
                  {steps.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveStep(s.id)}
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: activeStep === s.id ? 32 : 8,
                        background: activeStep === s.id ? active.accent : "#ffffff20",
                      }}
                    />
                  ))}
                  <span className="ml-auto text-xs text-muted-foreground font-medium">
                    {active.id} of {steps.length}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Documents strip ── */}
      <section className="py-16 px-4 border-y border-border bg-card">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-primary/25 bg-accent/40 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Documents You'll Need
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
                Keep these ready<br />before you start
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                Our smart form guides you through every field. Having these basics handy speeds things up significantly.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-3">
              {docs.map((doc, i) => (
                <motion.div
                  key={doc}
                  initial={{ opacity: 0, x: 14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted border border-border"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground font-medium">{doc}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-sm">Everything you need to know before applying.</p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="pb-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="relative rounded-3xl overflow-hidden border border-primary/20 gradient-card shadow-elevated"
          >
            <div className="absolute -top-20 -right-20 w-72 h-72 gradient-glow blur-3xl opacity-30 pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-56 h-56 gradient-glow blur-3xl opacity-20 pointer-events-none" />

            <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center px-10 py-12">
              <div>
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-primary/25 bg-accent/60 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Ready to Start?
                </div>
                <h2 className="text-3xl font-extrabold text-foreground mb-3 leading-tight">
                  Your Loan Journey<br />Starts <span className="text-gradient-primary">Here</span>
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                  Register free, fill your application in 20 minutes, and get a bank-ready report instantly — no consultants, no paperwork.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 lg:items-start xl:items-center">
                <Link
                  to="/signup"
                  className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-primary-foreground gradient-primary hover:opacity-90 active:scale-[0.98] transition-all shadow-button text-base"
                >
                  Start Free Application <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/loan-schemes"
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-foreground border border-border hover:border-primary/40 hover:bg-muted transition-all text-base"
                >
                  View Loan Schemes
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

export default HowItWorks;
