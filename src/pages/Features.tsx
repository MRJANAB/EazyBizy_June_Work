




import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  BadgeCheck,
  LayoutList,
  MessagesSquare,
  CloudUpload,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  BadgeCheck as TrustIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/* ──────────────────────────────────────────
   DATA
────────────────────────────────────────── */
const features = [
  {
    icon: ClipboardList,
    title: "Auto-Generated Reports",
    description:
      "Bank-ready CMA and project reports generated automatically from your application — no manual drafting needed.",
    pill: "Fast",
    pillColor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    iconColor: "from-cyan-500 to-teal-500",
    glowColor: "hover:shadow-[0_0_40px_hsl(188_88%_42%/0.15)]",
    hoverBorder: "hover:border-cyan-500/30",
  },
  {
    icon: BadgeCheck,
    title: "RBI Compliant",
    description:
      "Every report strictly follows RBI and banking guidelines, ensuring your submission is accepted without rejection.",
    pill: "Secure",
    pillColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    iconColor: "from-emerald-500 to-green-500",
    glowColor: "hover:shadow-[0_0_40px_rgba(34,197,94,0.12)]",
    hoverBorder: "hover:border-emerald-500/30",
  },
  {
    icon: LayoutList,
    title: "9-Step Process",
    description:
      "A guided 9-step digital form takes you from personal info to a complete loan application — in one seamless flow.",
    pill: "Simple",
    pillColor: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    iconColor: "from-blue-500 to-indigo-500",
    glowColor: "hover:shadow-[0_0_40px_rgba(99,102,241,0.12)]",
    hoverBorder: "hover:border-blue-500/30",
  },
  {
    icon: MessagesSquare,
    title: "Expert Support",
    description:
      "Dedicated loan advisors available to help you choose the right scheme, review documents, and answer queries.",
    pill: "Trusted",
    pillColor: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    iconColor: "from-violet-500 to-purple-500",
    glowColor: "hover:shadow-[0_0_40px_rgba(167,139,250,0.12)]",
    hoverBorder: "hover:border-violet-500/30",
  },
  {
    icon: CloudUpload,
    title: "100% Digital",
    description:
      "No paperwork, no branch visits. Apply from anywhere, track your loan status, and download reports instantly.",
    pill: "No Paperwork",
    pillColor: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    iconColor: "from-rose-500 to-pink-500",
    glowColor: "hover:shadow-[0_0_40px_rgba(244,63,94,0.12)]",
    hoverBorder: "hover:border-rose-500/30",
  },
];

const trustStats = [
  { end: 10000, prefix: "", suffix: "+", label: "Applications Processed" },
  { end: 500, prefix: "₹", suffix: " Cr+", label: "Loans Facilitated" },
  { end: 35, prefix: "", suffix: "%", label: "Max Govt. Subsidy" },
  { end: 24, prefix: "", suffix: " hrs", label: "Avg. Report Generation" },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const STATS_ANIMATION_DURATION_MS = 1800;

/* ──────────────────────────────────────────
   FEATURE CARD
────────────────────────────────────────── */
const FeatureCard = ({ feature, index }: { feature: (typeof features)[0]; index: number }) => {
  const Icon = feature.icon;
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -8, transition: { duration: 0.22, ease: "easeOut" } }}
      className={`
        group relative rounded-2xl border border-border bg-card p-7
        transition-all duration-300 cursor-default
        ${feature.glowColor} ${feature.hoverBorder}
      `}
    >
      {/* Index watermark */}
      <span className="absolute top-5 right-6 text-6xl font-black text-foreground/[0.03] select-none pointer-events-none leading-none">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Icon */}
      <div
        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.iconColor} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
      >
        <Icon className="w-7 h-7 text-white" strokeWidth={1.75} />
      </div>

      {/* Pill + title */}
      <div className="flex items-center gap-2.5 mb-2">
        <h3 className="text-lg font-bold text-foreground leading-tight">{feature.title}</h3>
      </div>

      {/* Description */}
      <p className="text-muted-foreground text-sm leading-relaxed mb-5">{feature.description}</p>

      {/* Footer */}
      <div className="flex items-center pt-4 border-t border-border/60">
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${feature.pillColor}`}
        >
          {feature.pill}
        </span>
      </div>
    </motion.div>
  );
};

/* ──────────────────────────────────────────
   PAGE
────────────────────────────────────────── */
const Features = () => {
  const statsSectionRef = useRef<HTMLElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasAnimatedStatsRef = useRef(false);
  const [hasStartedStatsAnimation, setHasStartedStatsAnimation] = useState(false);
  const [animatedStatValues, setAnimatedStatValues] = useState(() => trustStats.map(() => 0));

  useEffect(() => {
    const statsSection = statsSectionRef.current;
    if (!statsSection || hasAnimatedStatsRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasAnimatedStatsRef.current) {
          return;
        }

        hasAnimatedStatsRef.current = true;
        setHasStartedStatsAnimation(true);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );

    observer.observe(statsSection);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!hasStartedStatsAnimation) {
      return;
    }

    const animationStartTime = performance.now();

    const animateStats = (now: number) => {
      const elapsed = now - animationStartTime;
      const progress = Math.min(elapsed / STATS_ANIMATION_DURATION_MS, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedStatValues(trustStats.map((stat) => Math.round(stat.end * easedProgress)));

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animateStats);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(animateStats);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hasStartedStatsAnimation]);

  const formattedAnimatedStats = useMemo(
    () =>
      trustStats.map((stat, index) => {
        const value = animatedStatValues[index] ?? 0;

        if (stat.label === "Applications Processed") {
          return `${value.toLocaleString("en-IN")}+`;
        }

        if (stat.label === "Loans Facilitated") {
          return `₹${value} Cr+`;
        }

        if (stat.label === "Max Govt. Subsidy") {
          return `${value}%`;
        }

        return `${value} hrs`;
      }),
    [animatedStatValues],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="gradient-hero pt-32 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] gradient-glow blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 gradient-glow blur-3xl opacity-15 pointer-events-none" />

        <div className="container mx-auto max-w-6xl px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="text-center max-w-3xl mx-auto"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-primary/25 bg-accent/60 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
                Platform Features
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight">
              Why Choose{" "}
              <span className="text-gradient-primary">EazyBizy</span>?
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto mb-10">
              We've reimagined government loan applications — fully digital, faster approvals, auto-generated bank-ready reports, and expert guidance at every step.
            </p>

            {/* Trust signals row */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { icon: Zap, label: "Instant Reports" },
                { icon: Lock, label: "Bank-Grade Security" },
                { icon: TrustIcon, label: "RBI Compliant" },
              ].map(({ icon: TIcon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-4 py-2 rounded-full gradient-card border border-border text-sm text-muted-foreground"
                >
                  <TIcon className="w-3.5 h-3.5 text-primary" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Trust Stats Strip ── */}
      <section ref={statsSectionRef} className="border-y border-border bg-card">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
            {trustStats.map(({ label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="flex flex-col items-center justify-center py-8 px-6 text-center"
              >
                <span className="text-3xl font-extrabold text-gradient-primary mb-1 inline-block">
                  {formattedAnimatedStats[i]}
                </span>
                <span className="text-muted-foreground text-xs uppercase tracking-wider">{label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Cards Grid ── */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Section label */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4 mb-12"
          >
            <div className="flex gap-1">
              <div className="w-1.5 h-6 rounded-full gradient-primary" />
              <div className="w-1.5 h-6 rounded-full bg-primary/30" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Everything You Need</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                Five reasons thousands of entrepreneurs trust EazyBizy
              </p>
            </div>
            <div className="flex-1 h-px bg-border" />
            <span className="hidden sm:block text-xs text-muted-foreground px-3 py-1.5 rounded-full border border-border bg-muted">
              5 Features
            </span>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-wrap justify-center gap-5"
          >
            {features.map((feature, index) => (
              <div key={feature.title} className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.875rem)]">
                <FeatureCard feature={feature} index={index} />
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="relative rounded-3xl overflow-hidden border border-primary/20 gradient-card shadow-elevated p-12 text-center"
          >
            {/* Glow blobs */}
            <div className="absolute -top-20 -right-20 w-72 h-72 gradient-glow blur-3xl opacity-30 pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 gradient-glow blur-3xl opacity-20 pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border border-primary/25 bg-accent/60">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
                  Get Started Today
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
                Ready to Apply for Your{" "}
                <span className="text-gradient-primary">Government Loan</span>?
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed max-w-xl mx-auto mb-8">
                Join thousands of entrepreneurs who have simplified their loan journey with EazyBizy. Start your application in minutes.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("open-easybizy-chatbot"))}
                  className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-primary-foreground gradient-primary hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-button text-base"
                >
                  AI Assistant
                  <ArrowRight className="w-5 h-5" />
                </button>
                <Link
                  to="/loan-schemes"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-foreground border border-border hover:border-primary/40 hover:bg-muted transition-all duration-200 text-base"
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

export default Features;




