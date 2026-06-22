import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  Headphones,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type FaqEntry = {
  q: string;
  a: string;
};

type TopicConfig = {
  label: string;
  terms: string[];
};

const FaqItem = ({ q, a, index }: { q: string; a: string; index: number }) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.32, delay: index * 0.05 }}
      className={`overflow-hidden rounded-3xl border transition-all duration-300 ${
        open ? "border-primary/30 bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/20"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-base font-semibold text-foreground">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.24 }}>
          <ChevronDown className="w-5 h-5 text-primary" />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <p className="px-6 pb-6 text-sm leading-7 text-muted-foreground border-t border-border pt-4">
          {a}
        </p>
      </motion.div>
    </motion.div>
  );
};

const entrepreneurFaqs: FaqEntry[] = [
  {
    q: "What is EAZYBIZY?",
    a: "EAZYBIZY is a simple digital tool that helps entrepreneurs plan their business and prepare a bank-ready project report without depending on business support institutions and independent consultants.",
  },
  {
    q: "Do I need a computer to use EAZYBIZY?",
    a: "No. EAZYBIZY works on mobile phones, tablets, and computers. If you can use a smartphone, you can use EAZYBIZY.",
  },
  {
    q: "I don’t know English well. Can I still use EAZYBIZY?",
    a: "Yes, EAZYBIZY provides local-language support. While preparing your report online, you’ll have access to voice assistance that explains the process in your preferred local language. Please use this voice support feature whenever English feels difficult to follow.",
  },
  {
    q: "I have never done business before. Is EAZYBIZY useful for me?",
    a: "Yes. EAZYBIZY is designed especially for first-time entrepreneurs. It guides you step by step and shows examples. When in doubt always use the Human Interaction service to speak to a live person.",
  },
  {
    q: "What if I don’t know exact costs or prices?",
    a: "No problem. EAZYBIZY already has market rates, examples, and benchmarks. You can always start with an estimate and improve later. When in doubt always use the Human Interaction service to speak to a live person.",
  },
  {
    q: "Will banks accept EAZYBIZY project reports?",
    a: "Yes. EAZYBIZY generates standardized project reports that are accepted by banks and government loan schemes.",
  },
  {
    q: "Will EAZYBIZY guarantee that I get a loan?",
    a: "No one can guarantee a loan. But EAZYBIZY improves your chances by making your project report clear, realistic, and complete.",
  },
  {
    q: "Can I change my project details after creating it?",
    a: "Yes. You can edit and improve your project any number of times until you are satisfied.",
  },
  {
    q: "What if EAZYBIZY shows my project as risky?",
    a: "That is information. EAZYBIZY warns you before you go to the bank, so you can correct the plan and avoid rejection.",
  },
  {
    q: "Is EAZYBIZY expensive?",
    a: "No. EAZYBIZY is low-cost compared to consultants and saves money, time, and travel to multiple offices.",
  },
  {
    q: "Can women SHGs and group businesses use EAZYBIZY?",
    a: "Yes. EAZYBIZY supports individual entrepreneurs, SHGs, partnerships, and group enterprises.",
  },
  {
    q: "What happens after I submit the report to the bank?",
    a: "After you submit your report to the bank, it’s important to stay in communication and follow up. If the bank requests any modifications, you can revise your project report accordingly and continue using EAZYBIZY for guidance and improvements.",
  },
  {
    q: "Is my information safe?",
    a: "Yes. Your data is secure and private and is not shared without your permission.",
  },
];

const analystFaqs: FaqEntry[] = [
  {
    q: "Is this project report in a standard bank format?",
    a: "Yes. EAZYBIZY generates standardized project reports aligned with formats commonly used by banks and government-supported loan schemes.",
  },
  {
    q: "How reliable are the cost and revenue estimates?",
    a: "The estimates are based on current market benchmarks, sector norms, and location-specific data. Entrepreneurs can further refine figures during appraisal discussions.",
  },
  {
    q: "Does the report include financial indicators required by banks?",
    a: "Yes. EAZYBIZY automatically calculates key indicators such as project cost, promoter contribution, loan requirement, profitability, break-even, and repayment capacity.",
  },
  {
    q: "Can assumptions be modified based on bank feedback?",
    a: "Yes. The project is fully editable. Assumptions and projections can be revised quickly based on bank or appraisal feedback.",
  },
  {
    q: "How does EAZYBIZY help reduce appraisal time?",
    a: "EAZYBIZY provides structured, complete, and validated data, reducing manual verification and follow-ups, thereby saving officer time.",
  },
  {
    q: "Does EAZYBIZY replace bank appraisal?",
    a: "No. EAZYBIZY supports and strengthens the appraisal process by improving data quality. Final appraisal decisions remain with the bank.",
  },
  {
    q: "Can this be used for government loan schemes like MUDRA or PMEGP?",
    a: "Yes. EAZYBIZY supports multiple government schemes and aligns reports to their broad documentation requirements.",
  },
  {
    q: "Is applicant data secure?",
    a: "Yes. All applicant data is secure, confidential, and shared only with consent of the entrepreneur.",
  },
];

const bankFaqs: FaqEntry[] = [
  {
    q: "How does EAZYBIZY reduce NPAs and appraisal time?",
    a: "EAZYBIZY reduces NPAs and appraisal time by helping entrepreneurs submit complete, structured applications with validated financial assumptions and clear bank-ready reports.",
  },
  {
    q: "How does EAZYBIZY improve application quality?",
    a: "EAZYBIZY ensures applications are complete, structured, and standardized, reducing rejection due to missing or inconsistent information.",
  },
  {
    q: "How does EAZYBIZY support realistic assumptions?",
    a: "Built-in sector benchmarks and validation checks prevent overstated revenues and underestimated costs, lowering default risk.",
  },
  {
    q: "How does EAZYBIZY identify risk early?",
    a: "Viability indicators such as DSCR, break-even, and repayment capacity flag weak proposals early—before sanction.",
  },
  {
    q: "How does EAZYBIZY reduce manual effort?",
    a: "Auto-calculated financials and ready formats significantly cut manual verification, back-and-forth queries, and rework.",
  },
  {
    q: "Does EAZYBIZY help faster decision-making?",
    a: "Clean data and clear projections enable quicker appraisal, sanction, and disbursement.",
  },
  {
    q: "Does EAZYBIZY keep applicant data confidential?",
    a: "Yes. All applicant data is secure, confidential, and shared only with consent of the entrepreneur.",
  },
];

const popularTopics: TopicConfig[] = [
  {
    label: "Getting Started",
    terms: ["what is", "first-time", "never done business", "smartphone", "local-language"],
  },
  {
    label: "Required Documents",
    terms: ["document", "aadhaar", "pan", "required"],
  },
  {
    label: "Project Report",
    terms: ["project report", "report", "financial indicators", "standard bank format"],
  },
  {
    label: "Application Status",
    terms: ["submit the report", "follow up", "bank requests", "modifications", "application quality", "decision-making"],
  },
  {
    label: "Bank Submission",
    terms: ["bank", "appraisal", "sanction", "disbursement"],
  },
  {
    label: "Data Security",
    terms: ["secure", "confidential", "safe", "permission", "consent"],
  },
];

const beforeApplyChecklist = [
  "Aadhaar / PAN ready",
  "Business details ready",
  "Estimated project cost",
  "Monthly expenses",
  "Bank account details",
  "Document upload ready",
];

const FAQ = () => {
  const [faqSearch, setFaqSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const normalizedSearch = faqSearch.trim().toLowerCase();
  const selectedTopicConfig = popularTopics.find((topic) => topic.label === selectedTopic) ?? null;
  const matchesTextSearch = (faq: FaqEntry) => {
    if (!normalizedSearch) return true;

    const searchableText = `${faq.q} ${faq.a}`.toLowerCase();
    return normalizedSearch
      .split(/\s+/)
      .filter(Boolean)
      .some((term) => searchableText.includes(term));
  };
  const matchesSelectedTopic = (faq: FaqEntry) => {
    if (!selectedTopicConfig) return true;

    const searchableText = `${faq.q} ${faq.a}`.toLowerCase();
    return selectedTopicConfig.terms.some((term) => searchableText.includes(term));
  };
  const matchesFilters = (faq: FaqEntry) => matchesTextSearch(faq) && matchesSelectedTopic(faq);
  const filteredEntrepreneurFaqs = entrepreneurFaqs.filter(matchesFilters);
  const filteredAnalystFaqs = analystFaqs.filter(matchesFilters);
  const filteredBankFaqs = bankFaqs.filter(matchesFilters);
  const resultCount = filteredEntrepreneurFaqs.length + filteredAnalystFaqs.length + filteredBankFaqs.length;

  const handleTopicClick = (topic: string) => {
    setSelectedTopic((current) => (current === topic ? null : topic));
    setFaqSearch("");
  };

  const handleChecklistToggle = (item: string) => {
    setCheckedItems((current) =>
      current.includes(item)
        ? current.filter((checkedItem) => checkedItem !== item)
        : [...current, item]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="rounded-[2rem] border border-border bg-card/80 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
            <div className="flex flex-col gap-8">
              <div className="max-w-3xl">
                <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                  <Sparkles className="h-4 w-4" /> Frequently Asked Questions
                </p>
                <h1 className="mt-6 text-4xl font-extrabold text-foreground sm:text-5xl">EAZYBIZY FAQs</h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                  Answers for first-time entrepreneurs, credit analysts, and banks — all in one place. Use this page to learn how EAZYBIZY helps you prepare bank-ready reports with confidence.
                </p>
              </div>
            </div>
          </div>

          <section className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-12">
              {(!normalizedSearch || filteredEntrepreneurFaqs.length > 0) && (
              <div className="rounded-[2rem] border border-border bg-card p-8">
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-[0.4em] text-primary">For First-Time & Rural Entrepreneurs</span>
                  <h2 className="mt-3 text-3xl font-extrabold text-foreground">Entrepreneur FAQs</h2>
                </div>
                <div className="grid gap-4">
                  {filteredEntrepreneurFaqs.map((faq, index) => (
                    <FaqItem key={faq.q} q={faq.q} a={faq.a} index={index} />
                  ))}
                </div>
              </div>
              )}

              {(!normalizedSearch || filteredAnalystFaqs.length > 0) && (
              <div className="rounded-[2rem] border border-border bg-card p-8">
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-[0.4em] text-primary">Credit Analyst Questions</span>
                  <h2 className="mt-3 text-3xl font-extrabold text-foreground">Common Questions & Clarifications</h2>
                </div>
                <div className="grid gap-4">
                  {filteredAnalystFaqs.map((faq, index) => (
                    <FaqItem key={faq.q} q={faq.q} a={faq.a} index={index} />
                  ))}
                </div>
              </div>
              )}

              {(!normalizedSearch || filteredBankFaqs.length > 0) && (
              <div className="rounded-[2rem] border border-border bg-card p-8">
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-[0.4em] text-primary">Banks & Lending Institutions</span>
                  <h2 className="mt-3 text-3xl font-extrabold text-foreground">How EAZYBIZY Reduces NPAs & Appraisal Time</h2>
                </div>
                <div className="grid gap-4">
                  {filteredBankFaqs.map((faq, index) => (
                    <FaqItem key={faq.q} q={faq.q} a={faq.a} index={index} />
                  ))}
                </div>
              </div>
              )}

              {(normalizedSearch || selectedTopic) && resultCount === 0 ? (
                <div className="rounded-[2rem] border border-primary/20 bg-primary/5 p-8 text-center">
                  <p className="text-lg font-semibold text-foreground">No matching FAQs found.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try another keyword or contact support for direct help.
                  </p>
                </div>
              ) : null}
            </div>

            <aside className="h-fit space-y-5 rounded-[2rem] border border-primary/25 bg-[#061421]/95 p-5 shadow-[0_24px_80px_rgba(0,194,209,0.10)] ring-1 ring-primary/10 lg:sticky lg:top-28">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.34em] text-primary">
                    Smart Help Center
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fast guidance before you apply.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-primary/15 bg-[#0b1f35]/80 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-foreground">
                  1. Quick Search
                </p>
                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={faqSearch}
                    onChange={(event) => {
                      setFaqSearch(event.target.value);
                      setSelectedTopic(null);
                    }}
                    placeholder="Search your question..."
                    className="h-12 w-full rounded-2xl border border-primary/35 bg-[#07111f] px-4 pl-11 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {(normalizedSearch || selectedTopic) ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{resultCount} matching FAQ{resultCount === 1 ? "" : "s"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFaqSearch("");
                        setSelectedTopic(null);
                      }}
                      className="font-semibold text-primary transition hover:text-primary/80"
                    >
                      Clear search
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-primary/15 bg-[#0b1f35]/80 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-foreground">
                  2. Popular Topics
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {popularTopics.map((topic, index) => {
                    const isSelected = selectedTopic === topic.label;
                    const TopicIcon = topic.label.includes("Document") || topic.label.includes("Report") ? FileText : topic.label.includes("Security") ? ShieldCheck : CheckCircle2;

                    return (
                      <button
                        key={topic.label}
                        type="button"
                        onClick={() => handleTopicClick(topic.label)}
                        aria-pressed={isSelected}
                        className={`inline-flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-left text-sm font-semibold transition hover:-translate-y-0.5 ${
                          isSelected
                            ? "border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37]"
                            : index % 2 === 0
                              ? "border-primary/25 bg-primary/10 text-foreground"
                              : "border-emerald-400/20 bg-emerald-400/10 text-foreground"
                        }`}
                      >
                        <TopicIcon className={`h-4 w-4 shrink-0 ${isSelected ? "text-[#D4AF37]" : "text-primary"}`} />
                        <span>{topic.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-primary/15 bg-[#0b1f35]/80 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-foreground">
                  3. Before You Apply Checklist
                </p>
                <div className="mt-4 grid gap-3">
                  {beforeApplyChecklist.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleChecklistToggle(item)}
                      aria-pressed={checkedItems.includes(item)}
                      className="flex items-center gap-3 border-b border-white/10 pb-3 text-left transition hover:text-primary last:border-b-0 last:pb-0"
                    >
                      <CheckCircle2
                        className={`h-5 w-5 shrink-0 transition ${
                          checkedItems.includes(item) ? "fill-primary text-primary" : "text-primary"
                        }`}
                      />
                      <span className={`text-sm font-medium ${checkedItems.includes(item) ? "text-primary" : "text-foreground"}`}>
                        {item}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-primary/35 bg-[linear-gradient(135deg,rgba(0,194,209,0.16),rgba(8,20,35,0.95))] p-5 shadow-[0_18px_60px_rgba(0,194,209,0.12)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                    <Headphones className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-bold text-foreground">Still confused?</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Contact our support team for help with applications, documents, reports, and loan schemes.
                    </p>
                  </div>
                </div>
                <Link
                  to="/contact"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_12px_34px_rgba(0,194,209,0.22)] transition hover:bg-primary/90 sm:w-auto"
                >
                  Contact Support
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </aside>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
