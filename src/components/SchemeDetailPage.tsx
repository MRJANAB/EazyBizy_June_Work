import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  HelpCircle,
  LucideIcon,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SchemeDetail } from "@/data/schemeDetails";

type SchemeDetailPageProps = {
  scheme: SchemeDetail;
};

const sectionTitleClasses =
  "mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary sm:mb-5 sm:tracking-[0.24em]";

const InfoCard = ({
  icon: Icon,
  title,
  items,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
}) => (
  <div className="min-w-0 rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] sm:rounded-[1.75rem] sm:p-7">
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-bold text-foreground sm:text-xl">{title}</h3>
    </div>
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const SchemeDetailPage = ({ scheme }: SchemeDetailPageProps) => {
  const HeroIcon = scheme.icon;
  const location = useLocation();
  const navigate = useNavigate();
  const backTarget = (() => {
    const from = (location.state as { from?: string } | null)?.from;
    return from === "/home" || from === "/loan-schemes" ? from : null;
  })();
  const handleBackNavigation = () => {
    if (backTarget) {
      navigate(backTarget, { replace: true });
    }
  };
  const showBackButton = Boolean(backTarget);
  const openAiAssistant = () => {
    window.dispatchEvent(new Event("open-easybizy-chatbot"));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative min-h-screen overflow-x-hidden border-b border-border pt-16 sm:pt-20 lg:min-h-[calc(100vh-5rem)] lg:overflow-hidden lg:pt-24">
        {/* ── Full-bleed background image ── */}
        {scheme.heroImage && (
          <img
            src={scheme.heroImage}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[86%_top] opacity-100 select-none sm:object-[78%_top] lg:object-[72%_center]"
          />
        )}
        {/* Strong dark overlay on left fades to semi-dark on right — text always readable */}
        <div className="pointer-events-none absolute inset-0 bg-black/30 lg:hidden" />
        <div className="pointer-events-none absolute inset-0 lg:hidden" style={{background: "linear-gradient(105deg, rgba(3,7,21,0.78) 0%, rgba(3,7,21,0.58) 46%, rgba(3,7,21,0.18) 78%, rgba(3,7,21,0.04) 100%)"}} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/80 via-background/30 to-transparent lg:hidden" />
        <div className="pointer-events-none absolute inset-0 hidden lg:block" style={{background: "linear-gradient(to right, rgba(3,7,21,0.96) 0%, rgba(3,7,21,0.90) 45%, rgba(3,7,21,0.45) 75%, rgba(3,7,21,0.25) 100%)"}} />
        {/* Cyan glow top-left */}
        <div className="pointer-events-none absolute inset-0" style={{background: "radial-gradient(ellipse 60% 50% at 0% 0%, rgba(34,211,238,0.12), transparent)"}} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
          <div className="grid min-h-[calc(100svh-4rem)] gap-4 md:grid-cols-[minmax(0,1fr)_minmax(17rem,0.8fr)] lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(20rem,420px)] lg:gap-5">

            {/* ── LEFT: Content on light background ── */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="min-w-0 pb-6 pt-6 sm:pb-12 sm:pt-10 lg:px-12 lg:pb-14"
            >
              {showBackButton ? (
                <button
                  type="button"
                  onClick={handleBackNavigation}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-slate-950/60 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:border-cyan-300/45 hover:bg-slate-900/80"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : null}

              {/* Badge */}
              <div className={`${showBackButton ? "mt-4" : ""} inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300 sm:px-4 sm:text-xs sm:tracking-[0.24em]`}>
                <Sparkles className="h-3.5 w-3.5" />
                <span>{scheme.heroBadge}</span>
              </div>

              {/* Icon + Ministry row */}
              <div className="mt-5 flex items-start gap-3 sm:mt-6 sm:items-center sm:gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${scheme.gradient} text-white shadow-lg sm:h-14 sm:w-14`}>
                  <HeroIcon className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/60">{scheme.ministry}</p>
                  <p className="text-sm font-semibold text-cyan-300">{scheme.shortTitle}</p>
                </div>
              </div>

              {/* Title */}
              <h1 className="mt-5 max-w-xl text-[2.35rem] font-extrabold leading-[1.08] tracking-tight text-white sm:mt-6 sm:text-4xl md:text-5xl">
                {scheme.title}
              </h1>
              <p className="mt-4 max-w-xl text-base font-medium leading-7 text-white/85 sm:text-lg sm:leading-8">
                {scheme.tagline}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:leading-7">
                {scheme.description}
              </p>

              {/* Buttons */}
              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link
                  to="/signup"
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r ${scheme.gradient} px-7 py-3.5 font-semibold text-white shadow-lg transition hover:opacity-95 sm:w-auto`}
                >
                  Apply Now <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={openAiAssistant}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-7 py-3.5 font-semibold text-white transition hover:bg-slate-800 sm:w-auto dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  AI Assistant <Sparkles className="h-4 w-4" />
                </button>
              </div>

              {/* Stats row */}
              <div className="mt-7 grid gap-3 border-t border-white/15 pt-5 sm:mt-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/15 sm:pt-8">
                {scheme.stats.map((stat) => (
                  <div key={stat.label} className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-6 sm:py-2 sm:first:pl-0 sm:last:pr-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50 sm:text-xs sm:tracking-[0.22em]">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-base font-bold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── RIGHT: At A Glance floating panel ── */}
            <div className="relative flex pb-8 md:items-center lg:justify-center lg:py-10 lg:pr-8">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55 }}
                className="w-full rounded-2xl border border-white/15 bg-black/65 p-4 text-white backdrop-blur-md sm:p-5 lg:w-72"
              >
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
                  At A Glance
                </p>
                <div className="space-y-2">
                  {scheme.supportSummary.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center gap-1.5 text-cyan-300">
                        <Icon className="h-3 w-3" />
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em]">{label}</p>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold leading-5 text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">
                    Helpline
                  </p>
                  <p className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{scheme.helpline}</p>
                  <p className="mt-1 text-[10px] leading-5 text-white/50">
                    Use this as the official support reference while preparing your application.
                  </p>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <InfoCard icon={ShieldCheck} title="Ideal For" items={scheme.idealFor} />
          <InfoCard icon={Sparkles} title="Key Highlights" items={scheme.highlights} />
        </div>
      </section>

      <section className="border-y border-border bg-card px-4 py-10 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className={sectionTitleClasses}>Application Readiness</p>
            <h2 className="text-2xl font-bold leading-tight text-foreground md:text-4xl">
              Keep the process clear, complete and bank-ready
            </h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              Strong documentation and a clean explanation of the business model make these scheme pages more useful to real users and increase trust in the platform.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InfoCard icon={ShieldCheck} title="Eligibility Checklist" items={scheme.eligibility} />
            <InfoCard icon={FileText} title="Documents to Prepare" items={scheme.documents} />
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:rounded-[2rem] sm:p-7">
            <p className={sectionTitleClasses}>How It Works</p>
            <h2 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">Step-by-step application flow</h2>
            <div className="mt-6 space-y-4 sm:mt-8">
              {scheme.process.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-3 rounded-2xl border border-border bg-background/70 p-4 sm:gap-4 sm:p-5"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${scheme.gradient} text-sm font-bold text-white`}>
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-7 text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:rounded-[2rem] sm:p-7">
            <p className={sectionTitleClasses}>AI Assistant</p>
            <h3 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">Get guided help for this scheme</h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Users can open the assistant directly from this page to ask about eligibility, documents, fit and next steps before applying.
            </p>
            <button
              type="button"
              onClick={openAiAssistant}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm font-semibold text-primary transition hover:border-primary/40"
            >
              Open AI Assistant <Sparkles className="h-4 w-4" />
            </button>
            <a
              href={scheme.portalUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-3 rounded-2xl border border-border px-5 py-4 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" />
              {scheme.portalLabel}
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card px-4 py-10 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className={sectionTitleClasses}>FAQs</p>
            <h2 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">Questions users usually ask first</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {scheme.faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-[1.5rem] border border-border bg-background/80 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem] sm:p-6"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold leading-7 text-foreground">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-primary/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(15,23,42,0.02))] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:rounded-[2.25rem] sm:p-8 md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className={sectionTitleClasses}>Explore More</p>
              <h2 className="text-2xl font-bold leading-tight text-foreground md:text-4xl">
                Related scheme pages users can compare next
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                These links make the footer feel useful because each destination is now a real page with content, structure and a clear call to action.
              </p>
            </div>
            <Link
              to="/loan-schemes"
              className="inline-flex items-center gap-2 font-semibold text-primary transition hover:opacity-80"
            >
              View all schemes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {scheme.related.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="rounded-[1.5rem] border border-border bg-background/90 p-5 transition hover:border-primary/25 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6"
              >
                <p className="text-xl font-bold text-foreground">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Open page <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SchemeDetailPage;
