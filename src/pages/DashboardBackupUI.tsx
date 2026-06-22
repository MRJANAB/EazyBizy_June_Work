import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createPath, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  FileText,
  Landmark,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  Shield,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useConsultantAuth } from "@/hooks/useConsultantAuth";
import { useCreditAnalystAuth } from "@/hooks/useCreditAnalystAuth";
import GTABFormWizard, { type GTABFormWizardHandle } from "@/components/gtab/GTABFormWizard";
import Footer from "@/components/Footer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const trustHighlights = [
  { title: "Secure & Trusted", description: "Bank-level security for your data", icon: Shield },
  { title: "Fast Processing", description: "Quick verification and approvals", icon: Landmark },
  { title: "Transparent Process", description: "Track every step clearly", icon: FileText },
  { title: "Government Backed", description: "Trusted platform for MSMEs", icon: Building2 },
];

const quickActions = [
  {
    title: "New Application",
    description: "Start your loan journey in a few simple steps.",
    tag: "Primary",
    icon: Plus,
    actionKey: "new",
    featured: true,
    ctaLabel: "START HERE",
    iconClass: "bg-[#0d3243] text-[#22d3ee]",
    tagClass: "bg-[#0d2a3e] text-[#22d3ee] border-[#22d3ee]/30",
    cardClass:
      "border-[#22d3ee] bg-[linear-gradient(180deg,rgba(8,21,38,1)_0%,rgba(8,18,33,1)_100%)] shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_28px_rgba(34,211,238,0.3),0_24px_60px_rgba(0,0,0,0.38)]",
    ctaClass: "text-[#22d3ee]",
    arrowClass: "text-[#22d3ee]",
  },
  {
    title: "Existing User",
    description: "Continue your saved application or workflow.",
    tag: "Continue",
    icon: LogIn,
    actionKey: "existing",
    featured: false,
    ctaLabel: "Open Section",
    iconClass: "bg-[#0f2742] text-[#22d3ee]",
    tagClass: "bg-[#0e2238] text-[#22d3ee] border-[#22d3ee]/20",
    cardClass: "border-white/10 bg-[#0c1728]",
    ctaClass: "text-[#7de8f4]",
    arrowClass: "text-[#22d3ee]",
  },
  {
    title: "CMA Reports",
    description: "View and download your CMA reports.",
    tag: "Reports",
    icon: FileText,
    actionKey: "cma",
    featured: false,
    ctaLabel: "Open Section",
    iconClass: "bg-[#34250c] text-[#f59e0b]",
    tagClass: "bg-[#2c220f] text-[#f6bf57] border-[#f59e0b]/20",
    cardClass: "border-white/10 bg-[#0c1728]",
    ctaClass: "text-[#f6bf57]",
    arrowClass: "text-[#f59e0b]",
  },
  {
    title: "Document",
    description: "Upload, manage and verify documents.",
    tag: "Documents",
    icon: FileText,
    actionKey: "documents",
    featured: false,
    ctaLabel: "Open Section",
    iconClass: "bg-[#0f2742] text-[#22d3ee]",
    tagClass: "bg-[#0e2238] text-[#22d3ee] border-[#22d3ee]/20",
    cardClass: "border-white/10 bg-[#0c1728]",
    ctaClass: "text-[#7de8f4]",
    arrowClass: "text-[#22d3ee]",
  },
];

const loanSchemes = [
  {
    name: "MUDRA",
    description: "For micro and small business growth",
    metricLabel: "Loan Amount",
    metricValue: "Up to ₹10 Lakhs",
    ctaLabel: "View Details",
    icon: Landmark,
    iconClass: "bg-[#0d3341] text-[#22d3ee]",
    accentClass: "text-[#22d3ee]",
    href: "/mudra-loan",
  },
  {
    name: "PMEGP",
    description: "For new business setup and self-employment",
    metricLabel: "Loan Amount",
    metricValue: "Up to ₹25 Lakhs",
    ctaLabel: "View Details",
    icon: Building2,
    iconClass: "bg-[#30220c] text-[#f59e0b]",
    accentClass: "text-[#f59e0b]",
    href: "/pmegp",
  },
  {
    name: "MSME",
    description: "For business expansion and working capital",
    metricLabel: "Loan Amount",
    metricValue: "Up to ₹2 Crore",
    ctaLabel: "View Details",
    icon: Building2,
    iconClass: "bg-[#0d3341] text-[#22d3ee]",
    accentClass: "text-[#22d3ee]",
    href: "/msme-loan",
  },
  {
    name: "Other Schemes",
    description: "Custom schemes for special business categories",
    metricLabel: "Flexible Solutions",
    metricValue: "Explore options",
    ctaLabel: "Explore Options",
    icon: FileText,
    iconClass: "bg-[#30220c] text-[#f59e0b]",
    accentClass: "text-[#f59e0b]",
    href: "/other-schemes",
  },
];

const APPLICATION_DRAFT_PREFIX = "gtab-application-draft:";

interface BrowserDraftSummary {
  updatedAt?: string;
  progressPercentage?: number;
  stepTitle?: string;
  currentStep?: number;
}

const DashboardBackupUI = () => {
  const { user, signOut, loading } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { isCreditAnalyst, loading: creditAnalystLoading } = useCreditAnalystAuth();
  const { isConsultant, loading: consultantLoading } = useConsultantAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | undefined>();
  const [applicationFlow, setApplicationFlow] = useState<"fresh" | "resume">("fresh");
  const [wizardKey, setWizardKey] = useState(0);
  const [draftSummary, setDraftSummary] = useState<BrowserDraftSummary | null>(null);
  const wizardRef = useRef<GTABFormWizardHandle>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!loading && !creditAnalystLoading && isCreditAnalyst) {
      navigate("/credit-analyst");
    }
  }, [creditAnalystLoading, isCreditAnalyst, loading, navigate]);

  useEffect(() => {
    if (!loading && !consultantLoading && isConsultant) {
      navigate("/consultant");
    }
  }, [consultantLoading, isConsultant, loading, navigate]);

  const refreshDraftSummary = () => {
    if (typeof window === "undefined" || !user?.id) {
      setDraftSummary(null);
      return;
    }

    try {
      const rawDraft = window.localStorage.getItem(`${APPLICATION_DRAFT_PREFIX}${user.id}`);
      if (!rawDraft) {
        setDraftSummary(null);
        return;
      }
      const parsed = JSON.parse(rawDraft) as BrowserDraftSummary;
      setDraftSummary({
        currentStep: parsed.currentStep,
        progressPercentage: parsed.progressPercentage,
        stepTitle: parsed.stepTitle,
        updatedAt: parsed.updatedAt,
      });
    } catch {
      setDraftSummary(null);
    }
  };

  useEffect(() => {
    refreshDraftSummary();
  }, [user?.id]);

  const handleNewApplication = () => {
    setEditingAppId(undefined);
    setApplicationFlow("fresh");
    setWizardKey((key) => key + 1);
    setIsModalOpen(true);
  };

  const handleResumeDraft = () => {
    setEditingAppId(undefined);
    setApplicationFlow("resume");
    setWizardKey((key) => key + 1);
    setIsModalOpen(true);
  };

  const handleApplicationModalChange = (open: boolean) => {
    if (open) {
      setIsModalOpen(true);
      return;
    }

    void (async () => {
      await wizardRef.current?.saveDraft();
      setIsModalOpen(false);
      refreshDraftSummary();
    })();
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged out", description: "See you soon!" });
    navigate("/");
  };

  const currentRoute = createPath({
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  });

  const handleQuickAction = (actionKey: string) => {
    if (actionKey === "new") {
      handleNewApplication();
      return;
    }

    if (actionKey === "existing") {
      handleResumeDraft();
      return;
    }

    if (actionKey === "cma") {
      navigate("/dashboard/reports", { state: { from: currentRoute } });
      return;
    }

    if (actionKey === "documents") {
      navigate("/dashboard/documents", { state: { from: currentRoute } });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#22d3ee]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-2.5">
            <a href="/" className="flex items-center gap-3">
              <div className="h-11 w-11 overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(255,255,255,0.08)]">
                <img src="/logo.png" alt="EazyBizy logo" className="h-full w-full object-cover" />
              </div>
              <span className="text-[1.45rem] font-semibold tracking-tight text-white">
                Eazy<span className="text-[#22d3ee]">Bizy</span>
              </span>
            </a>

            <div className="order-2 flex flex-wrap items-center justify-end gap-3 text-sm text-slate-300 md:order-3">
              <span className="hidden text-slate-400 xl:block">{user?.email}</span>

              {isAdmin ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="border-white/10 bg-transparent text-slate-200 hover:border-[#22d3ee]/30 hover:bg-[#0d1d31] hover:text-white"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              ) : null}

              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="inline-flex items-center gap-2 rounded-xl px-2 py-2 font-medium text-slate-200 transition hover:text-white"
              >
                <UserCircle className="h-5 w-5" />
                Profile
              </button>

              <div className="hidden h-6 w-px bg-white/20 md:block" />

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl px-2 py-2 font-medium text-slate-200 transition hover:text-white"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 lg:py-4 xl:px-10">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[1.65rem] border border-[#1c3650] bg-[linear-gradient(180deg,rgba(7,19,34,0.98)_0%,rgba(6,17,30,1)_100%)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.36)] sm:p-5 lg:p-5"
        >
          <div className="pointer-events-none absolute left-16 top-0 h-10 w-40 rounded-full bg-[#22d3ee]/20 blur-2xl" />
          <div className="pointer-events-none absolute left-8 top-10 h-32 w-32 rounded-full bg-[#22d3ee]/8 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#00d8ff]">
                  ACCOUNT OVERVIEW
                </p>
                <h1 className="mt-2.5 max-w-4xl text-[2.15rem] font-semibold leading-[1.04] text-white sm:text-[2.75rem] xl:text-[3rem]">
                  Welcome back to EazyBizy{" "}
                  <span className="inline-block align-top">👋</span>
                </h1>
                <p className="mt-2.5 max-w-3xl text-[0.95rem] leading-6 text-slate-300 xl:text-base">
                  Manage MSME loans, track approval progress, and access your financial workflow
                  from one secure, streamlined dashboard.
                </p>
              </div>

              <motion.button
                type="button"
                onClick={() => navigate("/dashboard", { state: { from: currentRoute } })}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  boxShadow: [
                    "0 0 0 rgba(34,211,238,0.16)",
                    "0 0 28px rgba(34,211,238,0.38)",
                    "0 0 0 rgba(34,211,238,0.16)",
                  ],
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex shrink-0 items-center justify-center gap-3 self-start rounded-full border border-[#22d3ee]/70 bg-[linear-gradient(180deg,#10263d_0%,#0c1a2e_100%)] px-6 py-3 text-sm font-semibold text-white"
              >
                <LayoutDashboard className="h-4 w-4 text-[#22d3ee]" />
                Open Dashboard
                <ArrowRight className="h-4 w-4 text-[#22d3ee]" />
              </motion.button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {trustHighlights.map((item) => {
                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -4 }}
                    className="rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,24,40,0.9)_0%,rgba(9,20,35,0.95)_100%)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-[#22d3ee]/25 hover:shadow-[0_14px_40px_rgba(0,0,0,0.24),0_0_20px_rgba(34,211,238,0.06)] xl:flex xl:items-center xl:gap-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.85rem] border border-[#1d4159] bg-[#0a3042] text-[#22d3ee]">
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <p className="mt-3 text-[0.95rem] font-semibold text-white xl:mt-0">{item.title}</p>
                      <p className="mt-1 text-[0.82rem] leading-5 text-slate-400">{item.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-4"
        >
          <div className="relative overflow-hidden rounded-[1.65rem] border border-[#1f3854] bg-[linear-gradient(180deg,#0b1627_0%,#0a1524_100%)] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.24)] sm:p-5">
            <div className="pointer-events-none absolute left-0 top-0 h-36 w-36 rounded-full bg-[#00d8ff]/8 blur-3xl" />
            <div className="pointer-events-none absolute left-6 top-[9.5rem] h-20 w-20 rounded-full bg-[#22d3ee]/10 blur-2xl" />

            <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="h-9 w-1.5 rounded-full bg-[#00d8ff]" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#00d8ff]">
                      PRIMARY ACTION CENTER
                    </p>
                    <h2 className="mt-0.5 text-[1.85rem] font-semibold leading-tight text-white sm:text-[2rem]">
                      Quick Actions
                    </h2>
                  </div>
                </div>

                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-400">
                  Access your most important actions instantly. The primary action is highlighted
                  for faster focus, cleaner usability, and stronger decision momentum.
                </p>
              </div>

              <div className="inline-flex items-center rounded-full border border-[#22d3ee]/25 bg-[#0c1c2f] px-4 py-2 text-sm font-medium text-slate-200">
                4 Available Actions
              </div>
            </div>

            <div className="relative mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.34fr_1fr_1fr_1fr]">
              {quickActions.map((action) => {
                const hasDraft = action.actionKey === "existing" && draftSummary;
                const displayAction = hasDraft
                  ? {
                    ...action,
                    title: "Resume Draft",
                    description: `Continue from ${draftSummary.stepTitle || "your saved step"} (${draftSummary.progressPercentage || 0}% complete).`,
                    ctaLabel: "Continue Application",
                  }
                  : action;
                const Icon = displayAction.icon;
                const featured = action.featured;

                const content = (
                  <div className={`flex h-full flex-col justify-between ${featured ? "min-h-[174px]" : "min-h-[164px]"}`}>
                    <div>
                      <div className={`flex items-start justify-between ${featured ? "gap-4" : "gap-3"}`}>
                        <div className={featured ? "relative" : ""}>
                          {featured ? (
                            <div className="absolute inset-[-8px] rounded-full bg-[#22d3ee]/10 blur-xl" />
                          ) : null}
                          <div
                            className={`relative flex shrink-0 items-center justify-center ${featured ? "h-14 w-14 rounded-full border border-[#22d3ee]/35 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.15),0_0_24px_rgba(34,211,238,0.18)]" : "h-11 w-11 rounded-[0.95rem]"} ${action.iconClass}`}
                          >
                            <Icon className={featured ? "h-6 w-6" : "h-5 w-5"} />
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${displayAction.tagClass}`}
                          >
                            {displayAction.tag}
                          </span>
                          {featured ? (
                            <span className="inline-flex rounded-full border border-[#f59e0b]/25 bg-[#2c220f] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f6bf57]">
                              Recommended
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-[1rem] font-semibold leading-tight text-white sm:text-[1.08rem]">
                          {displayAction.title}
                        </h3>
                        <p className={`${featured ? "mt-2 leading-6" : "mt-2 leading-6"} max-w-[17rem] text-sm text-slate-400`}>
                          {displayAction.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      {featured ? (
                        <span className="inline-flex items-center gap-3 rounded-full border border-[#22d3ee]/50 bg-[#0d2436] px-4 py-2 text-xs font-semibold text-[#22d3ee] shadow-[0_0_18px_rgba(34,211,238,0.16)] sm:text-sm">
                          {action.ctaLabel}
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      ) : (
                        <>
                          <span className={`text-sm font-medium ${displayAction.ctaClass}`}>
                            {displayAction.ctaLabel}
                          </span>
                          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${displayAction.tag === "Reports" ? "border-[#f59e0b]/30 bg-[#2c220f]/30" : "border-[#22d3ee]/20 bg-[#0d2035]"} transition group-hover:scale-105`}>
                            <ArrowRight className={`h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 ${displayAction.arrowClass}`} />
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );

                return (
                  <motion.button
                    key={action.title}
                    type="button"
                    onClick={() => handleQuickAction(action.actionKey)}
                    whileHover={{ y: -6 }}
                    whileTap={{ scale: 0.99 }}
                    className={`group relative h-full rounded-[1.35rem] border text-left transition hover:border-[#22d3ee]/30 hover:bg-[#101c30] ${featured ? "overflow-hidden px-4 py-4" : "px-4 py-4"} ${action.cardClass}`}
                  >
                    {featured ? (
                      <>
                        <div className="pointer-events-none absolute -left-6 top-8 h-28 w-28 rounded-full bg-[#22d3ee]/18 blur-3xl" />
                        <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-8 rounded-full bg-[#22d3ee]/25 blur-2xl" />
                      </>
                    ) : null}
                    {content}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-12"
        >
          <div className="rounded-[2rem] border border-[#1f3854] bg-[linear-gradient(180deg,#0b1627_0%,#0a1524_100%)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.24)] sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#00d8ff]">
                  LOAN PROGRAMS
                </p>
                <p className="mt-2 text-3xl font-semibold leading-tight text-white">
                  Explore Loan Schemes
                </p>
                <p className="mt-3 text-base leading-7 text-slate-400">
                  Choose the right loan scheme for your business growth.
                </p>
              </div>

              <a
                href="/loan-schemes"
                className="inline-flex items-center gap-3 self-start rounded-full border border-[#22d3ee]/30 bg-[#0c1c2f] px-5 py-3 text-sm font-semibold text-[#22d3ee] transition hover:border-[#22d3ee]/50 hover:bg-[#10233a] hover:text-white"
              >
                View All Schemes
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
              {loanSchemes.map((scheme) => {
                const Icon = scheme.icon;

                return (
                  <motion.button
                    key={scheme.name}
                    type="button"
                    onClick={() => navigate(scheme.href, { state: { from: currentRoute } })}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.99 }}
                    className="group rounded-[1.75rem] border border-[#203652] bg-[#0d1728] p-6 text-left transition hover:border-white/20 hover:bg-[#101c30]"
                  >
                    <div className="flex min-h-[138px] items-start gap-4">
                      <div
                        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] ${scheme.iconClass}`}
                      >
                        <Icon className="h-8 w-8" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-2xl font-semibold text-white">{scheme.name}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-300">{scheme.description}</p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {scheme.metricLabel}
                      </p>
                      <p className={`mt-2 text-[1.6rem] font-semibold ${scheme.accentClass}`}>
                        {scheme.metricValue}
                      </p>
                    </div>

                    <div className={`mt-6 inline-flex items-center gap-3 text-sm font-medium ${scheme.accentClass}`}>
                      {scheme.ctaLabel}
                      <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.section>
      </main>

      <Footer />

      <Dialog open={isModalOpen} onOpenChange={handleApplicationModalChange}>
        <DialogContent
          className="top-2 h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[92vw] translate-y-0 overflow-y-auto rounded-[1rem] bg-white p-3 text-gray-900 sm:top-[50%] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-3rem)] sm:translate-y-[-50%] sm:rounded-[1.25rem] sm:p-6 lg:max-h-[92vh]"
          closeButtonClassName="right-[18px] top-[18px] flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white opacity-100 shadow-[0_10px_22px_rgba(239,68,68,0.24)] transition-all duration-200 hover:scale-105 hover:bg-red-600 hover:text-white active:scale-95 focus:ring-[#00C2D1]"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              EazyBizy Loan Application
            </DialogTitle>
          </DialogHeader>

          <GTABFormWizard
            key={wizardKey}
            ref={wizardRef}
            applicationId={editingAppId}
            draftMode={applicationFlow}
            onComplete={() => {
              setIsModalOpen(false);
              refreshDraftSummary();
              toast({
                title: "Application Submitted!",
                description: "Your EazyBizy application has been submitted successfully.",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardBackupUI;
