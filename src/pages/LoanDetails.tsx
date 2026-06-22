import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  Clock3,
  Download,
  Eye,
  FileText,
  FolderPlus,
  LayoutDashboard,
  Percent,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import GTABFormWizard, { type GTABFormWizardHandle } from "@/components/gtab/GTABFormWizard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MobileLoanManagementDrawer,
  MobileLoanManagementHeader,
} from "@/components/dashboard/MobileLoanManagementChrome";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/dashboard" },
  { id: "applications", label: "Applications", icon: FileText, path: "/dashboard/applications" },
  { id: "documents", label: "Documents", icon: FolderPlus, path: "/dashboard/documents" },
  { id: "loan-details", label: "Loan Details", icon: Percent, path: "/dashboard/loan-details" },
  { id: "status-tracker", label: "Status Tracker", icon: Clock3, path: "/dashboard/status-tracker" },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
];

const EMI_STORAGE_KEY_PREFIX = "eazybizy:emi-paid-count";
const TOTAL_WIZARD_STEPS = 9;

const panelClass =
  "min-w-0 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 ring-1 ring-white/5 shadow-[0_20px_80px_rgba(0,194,209,0.16)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6";

const metricCardClass =
  "min-w-0 rounded-[1.2rem] border border-white/10 bg-[#061b34]/80 p-4 ring-1 ring-white/5";

type LoanTypeRecord = {
  name: string | null;
  interest_rate: number | null;
};

interface SavedApplicationRow {
  id: string;
  user_id: string;
  business_entity_name: string | null;
  loan_scheme: string | null;
  total_project_cost: number | null;
  eligible_loan_amount: number | null;
  amount: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  current_step: number | null;
  tenure_months: number;
  first_name: string | null;
  last_name: string | null;
  loan_types?: LoanTypeRecord | LoanTypeRecord[] | null;
}

const formatCurrency = (amount: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "Not available yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatNumber = (value: number | null | undefined, suffix = "") => {
  if (value == null || Number.isNaN(value)) {
    return "Not available yet";
  }

  return `${value.toLocaleString("en-IN")}${suffix}`;
};

const formatPercent = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) {
    return "Not available yet";
  }

  return `${value.toFixed(2)}%`;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getLoanSchemeName = (scheme: string | null) => {
  const labels: Record<string, string> = {
    mudra: "Mudra Loan",
    pmegp: "PMEGP Loan",
    normal_msme: "MSME Loan",
    other_scheme: "Other Scheme",
  };

  if (!scheme) {
    return "Loan details pending";
  }

  return labels[scheme] || scheme.replace(/_/g, " ");
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    under_review: "In Progress",
    approved: "Approved",
    rejected: "Rejected",
    disbursed: "Disbursed",
    pending: "Pending",
  };

  return labels[status] || status.replace(/_/g, " ");
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "approved":
    case "disbursed":
      return "border-[#00C2D1]/30 bg-[#00C2D1]/10 text-[#7BE7F0]";
    case "rejected":
      return "border-[#D65C76]/30 bg-[#D65C76]/10 text-[#F4A6B7]";
    case "draft":
      return "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#F5D778]";
    case "submitted":
      return "border-blue-400/30 bg-blue-400/10 text-blue-300";
    case "under_review":
      return "border-violet-400/30 bg-violet-400/10 text-violet-300";
    default:
      return "border-white/10 bg-white/5 text-slate-200";
  }
};

const getLoanTypeRecord = (value: SavedApplicationRow["loan_types"]) => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

const calculateEmi = (principal: number, annualRate: number, months: number) => {
  if (principal <= 0 || annualRate <= 0 || months <= 0) {
    return null;
  }

  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, months);
  return Math.round((principal * monthlyRate * factor) / (factor - 1));
};

const addMonths = (value: string | null | undefined, months: number) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setMonth(date.getMonth() + months);
  return date.toISOString();
};

const getIsoDateKey = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const LoanDetails = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [applications, setApplications] = useState<SavedApplicationRow[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | undefined>();
  const [applicationFlow, setApplicationFlow] = useState<"fresh" | "resume">("fresh");
  const [wizardInstanceKey, setWizardInstanceKey] = useState(0);
  const [loanDetailSearch, setLoanDetailSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [manualPaidEmiCount, setManualPaidEmiCount] = useState(0);
  const [emiConfirmOpen, setEmiConfirmOpen] = useState(false);

  const wizardRef = useRef<GTABFormWizardHandle>(null);

  const currentApplication = applications[0] ?? null;
  const currentLoanType = getLoanTypeRecord(currentApplication?.loan_types);
  const repaymentStartDate = currentApplication?.submitted_at || currentApplication?.created_at || null;
  const currentLoanAmount =
    currentApplication?.eligible_loan_amount
    ?? currentApplication?.amount
    ?? currentApplication?.total_project_cost
    ?? null;
  const currentInterestRate = currentLoanType?.interest_rate ?? null;
  const currentTenure = currentApplication?.tenure_months ?? 0;
  const calculatedEmi =
    currentLoanAmount != null && currentInterestRate != null && currentTenure > 0
      ? calculateEmi(currentLoanAmount, currentInterestRate, currentTenure)
      : null;
  const totalPayable = calculatedEmi != null && currentTenure > 0 ? calculatedEmi * currentTenure : null;
  const currentLoanName = currentLoanType?.name || getLoanSchemeName(currentApplication?.loan_scheme ?? null);
  const currentStatusLabel = currentApplication ? getStatusLabel(currentApplication.status) : "No application yet";
  const currentProgressPercent = currentApplication
    ? Math.round((clamp(currentApplication.current_step ?? 0, 0, TOTAL_WIZARD_STEPS) / TOTAL_WIZARD_STEPS) * 100)
    : 0;
  const emiStorageKey =
    user?.id && currentApplication?.id ? `${EMI_STORAGE_KEY_PREFIX}:${user.id}:${currentApplication.id}` : null;
  const paidEmiCount = currentTenure > 0 ? clamp(manualPaidEmiCount, 0, currentTenure) : 0;
  const repaymentPercent = currentTenure > 0 ? Math.round((paidEmiCount / currentTenure) * 100) : 0;
  const nextDueDate = calculatedEmi != null ? addMonths(repaymentStartDate, paidEmiCount + 1) : null;
  const loanEndDate = currentApplication ? addMonths(repaymentStartDate, currentTenure) : null;
  const totalPaidSoFar = calculatedEmi != null ? calculatedEmi * paidEmiCount : null;
  const outstandingBalance = totalPayable != null && totalPaidSoFar != null
    ? Math.max(totalPayable - totalPaidSoFar, 0)
    : null;
  const overdue =
    nextDueDate != null
    && currentTenure > 0
    && paidEmiCount < currentTenure
    && new Date(nextDueDate).getTime() < Date.now();

  const repaymentRows = useMemo(
    () =>
      applications.map((application) => {
        const amount =
          application.eligible_loan_amount
          ?? application.amount
          ?? application.total_project_cost
          ?? 0;
        const statusLabel = getStatusLabel(application.status);

        return {
          id: application.id,
          paymentDate: formatDate(application.updated_at || application.created_at),
          paymentDateKey: getIsoDateKey(application.updated_at || application.created_at),
          description: application.business_entity_name || getLoanSchemeName(application.loan_scheme),
          amount,
          amountLabel: formatCurrency(amount),
          status: application.status,
          statusLabel,
          amountSearch: String(amount),
        };
      }),
    [applications],
  );

  const filteredRepaymentRows = useMemo(() => {
    const query = loanDetailSearch.trim().toLowerCase();
    if (!query) {
      return repaymentRows;
    }

    return repaymentRows.filter((row) =>
      row.paymentDate.toLowerCase().includes(query)
      || row.paymentDateKey.includes(query)
      || row.description.toLowerCase().includes(query)
      || row.amountLabel.toLowerCase().includes(query)
      || row.amountSearch.includes(query)
      || row.statusLabel.toLowerCase().includes(query),
    );
  }, [loanDetailSearch, repaymentRows]);

  const fetchApplications = useCallback(async (userId: string) => {
    setApplicationsLoading(true);

    const { data, error } = await supabase
      .from("loan_applications")
      .select(`
        id,
        user_id,
        business_entity_name,
        loan_scheme,
        total_project_cost,
        eligible_loan_amount,
        amount,
        status,
        created_at,
        updated_at,
        submitted_at,
        current_step,
        tenure_months,
        first_name,
        last_name,
        loan_types (
          name,
          interest_rate
        )
      `)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching saved applications:", error);
      setApplications([]);
      toast({
        variant: "destructive",
        title: "Could not load applications",
        description: "Your saved applications could not be loaded right now.",
      });
    } else {
      setApplications((data as SavedApplicationRow[]) ?? []);
    }

    setApplicationsLoading(false);
  }, [toast]);

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllRecords = () => {
    const rows = filteredRepaymentRows.length ? filteredRepaymentRows : repaymentRows;
    if (!rows.length) {
      toast({
        title: "No repayment records found",
        description: "There are no user-specific repayment records to export yet.",
      });
      return;
    }

    const csv = ["Payment Date,Description,Amount,Status"]
      .concat(
        rows.map((row) =>
          `"${row.paymentDate}","${row.description}","${row.amountLabel}","${row.statusLabel}"`,
        ),
      )
      .join("\n");

    downloadFile(csv, `loan-repayment-records-${user?.id ?? "user"}.csv`);
  };

  const handleCompleteEmiPayment = () => {
    if (!currentApplication) {
      toast({ title: "No active loan application", description: "Create or resume an application before updating EMI status." });
      return;
    }
    if (calculatedEmi == null || currentTenure <= 0) {
      toast({ title: "EMI details not available yet", description: "We need loan amount, interest rate, and tenure before tracking EMI payments." });
      return;
    }
    if (paidEmiCount >= currentTenure) {
      toast({ title: "Loan already completed", description: "All EMI payments for this loan are already marked as paid." });
      return;
    }
    setEmiConfirmOpen(true);
  };

  const confirmEmiPayment = () => {
    const nextCount = paidEmiCount + 1;
    if (emiStorageKey) {
      window.localStorage.setItem(emiStorageKey, String(nextCount));
    }
    setManualPaidEmiCount(nextCount);
    setEmiConfirmOpen(false);
    toast({ title: "EMI payment updated", description: `EMI ${nextCount} of ${currentTenure} has been recorded for your logged-in account.` });
  };

  const handleNewApplication = () => {
    setEditingAppId(undefined);
    setApplicationFlow("fresh");
    setWizardInstanceKey((k) => k + 1);
    setIsModalOpen(true);
  };

  const handleOpenApplication = (applicationId: string) => {
    setEditingAppId(applicationId);
    setApplicationFlow("resume");
    setWizardInstanceKey((key) => key + 1);
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
      if (user?.id) {
        void fetchApplications(user.id);
      }
    })();
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (user?.id) {
      void fetchApplications(user.id);
    }
  }, [user?.id, fetchApplications]);

  useEffect(() => {
    if (!emiStorageKey) {
      setManualPaidEmiCount(0);
      return;
    }

    const storedValue = Number(window.localStorage.getItem(emiStorageKey) ?? "0");
    setManualPaidEmiCount(Number.isFinite(storedValue) ? storedValue : 0);
  }, [emiStorageKey]);

  useEffect(() => {
    const hashSection = location.hash.replace("#", "");
    if (!hashSection) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(hashSection)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.hash]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061421]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#00C2D1]" />
      </div>
    );
  }

  if (applicationsLoading) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#061421] text-slate-100">
        <aside className="fixed left-0 top-0 z-20 hidden h-full w-72 flex-col border-r border-white/10 bg-[#061b34]/95 p-6 backdrop-blur-xl lg:flex">
          <div className="mb-10">
            <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
            <div className="mt-4 h-6 w-48 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        </aside>
        <main className="min-h-screen w-full px-4 pb-28 pt-6 lg:ml-72 lg:max-w-[calc(100vw-18rem)] lg:px-6">
          <div className="grid gap-6">
            <div className="h-36 rounded-[2rem] bg-white/5 animate-pulse" />
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="h-72 rounded-[2rem] bg-white/5 animate-pulse" />
              <div className="h-72 rounded-[2rem] bg-white/5 animate-pulse" />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="h-96 rounded-[2rem] bg-white/5 animate-pulse" />
              <div className="h-96 rounded-[2rem] bg-white/5 animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const showEmptyLoanState = !applicationsLoading && applications.length === 0;
  const showEmptyRepaymentState = filteredRepaymentRows.length === 0;
  const emiDetailsAvailable =
    currentApplication != null
    && currentLoanAmount != null
    && currentInterestRate != null
    && currentTenure > 0
    && calculatedEmi != null;
  const paymentStatusLabel = paidEmiCount > 0 ? "Active Repayment" : currentStatusLabel;
  const progressCircumference = 2 * Math.PI * 54;
  const progressOffset = progressCircumference - (progressCircumference * repaymentPercent) / 100;
  const handleMobileSupportNavigation = () => {
    navigate("/contact", { state: { from: "loan-details" } });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#061421] text-slate-100">
      <aside className="fixed left-0 top-0 z-20 hidden h-full w-72 flex-col border-r border-white/10 bg-[#061b34]/95 p-6 shadow-[24px_0_80px_rgba(0,0,0,0.16)] backdrop-blur-xl lg:flex">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Loan Management</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Loan Management System</h1>
        </div>

        <nav className="space-y-1 text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
                  active
                    ? "bg-[#00C2D1]/15 text-white shadow-[0_10px_30px_rgba(0,194,209,0.18)]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[1.75rem] border border-white/10 bg-white/5 p-5 text-sm text-slate-200 shadow-sm">
          <p className="font-semibold text-white">Need Help?</p>
          <p className="mt-2 text-xs text-slate-400">Contact our support team for fast assistance.</p>
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[#00C2D1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#00b3c3]"
          >
            Contact Support
          </button>
        </div>
      </aside>

      <MobileLoanManagementDrawer
        open={mobileMenuOpen}
        currentPath={location.pathname}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="min-h-screen w-full max-w-full overflow-y-auto px-2 pb-28 pt-3 sm:px-6 sm:py-5 lg:ml-72 lg:max-w-[calc(100vw-18rem)] lg:px-6">
        <div className="grid min-w-0 gap-4 sm:gap-6">
          <MobileLoanManagementHeader
            menuOpen={mobileMenuOpen}
            onBack={() => navigate("/dashboard")}
            onMenuToggle={() => setMobileMenuOpen((open) => !open)}
            onSupport={handleMobileSupportNavigation}
          />

          <section className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 ring-1 ring-white/10 shadow-[0_25px_100px_rgba(0,194,209,0.18)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(18rem,0.75fr)]">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Loan Details</p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-4xl">User: Your Records & Payments</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Detailed loan insights, repayment history and repayment summary for your current application.
              </p>
            </div>

            <div className="flex min-h-full flex-col gap-3 items-stretch">
              <div className="flex w-full items-center justify-between rounded-[1.5rem] border border-white/10 bg-[#06203a]/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Loan Status</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{currentStatusLabel}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00C2D1]/12 text-[#00C2D1]">
                  <Percent className="h-5 w-5" />
                </div>
              </div>
              <button
                type="button"
                onClick={handleNewApplication}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-gradient-to-r from-[#00C2D1] to-[#0891b2] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(0,194,209,0.3)] transition hover:brightness-110 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                New Application
              </button>
            </div>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <article className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Personal Financial Overview</p>
                  <h3 className="mt-2 text-xl font-semibold leading-tight text-white sm:text-[1.85rem]">
                    {showEmptyLoanState
                      ? "Current Loan: No active application"
                      : `Current Loan: ${formatCurrency(currentLoanAmount)} (${currentLoanName})`}
                  </h3>
                </div>
                <span className="rounded-full border border-[#00C2D1]/20 bg-[#00C2D1]/10 px-4 py-2 text-sm font-semibold text-[#7BE7F0]">
                  Live overview
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Payment Status", value: showEmptyLoanState ? "No active loan" : paymentStatusLabel, icon: Clock3 },
                  { label: "Overall Progress", value: showEmptyLoanState ? "0%" : `${currentProgressPercent}%`, icon: Percent },
                  { label: "Next Due Date", value: emiDetailsAvailable ? formatDate(nextDueDate) : "EMI details not available yet", icon: Bell },
                  { label: "Current Loan Type", value: showEmptyLoanState ? "Not available yet" : currentLoanName, icon: User },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className={metricCardClass}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00C2D1]/10 text-[#00C2D1]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                          <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className={panelClass}>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Loan Details Panel</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Loan Amount", value: currentLoanAmount != null ? formatCurrency(currentLoanAmount) : "Not available yet" },
                  { label: "EMI", value: calculatedEmi != null ? formatCurrency(calculatedEmi) : "EMI details not available yet" },
                  { label: "Interest Rate", value: formatPercent(currentInterestRate) },
                  { label: "Processing Fee", value: "Not available yet" },
                  { label: "Tenure", value: currentTenure > 0 ? `${formatNumber(currentTenure)} Months` : "Not available yet" },
                  { label: "Total Payable", value: totalPayable != null ? formatCurrency(totalPayable) : "EMI details not available yet" },
                ].map((item) => (
                  <div key={item.label} className={metricCardClass}>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                    <p className="mt-3 text-xl font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
            <article id="emi-payment" className={panelClass}>
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">My Repayment History</p>
                  <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Recent payments</h3>
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={handleCompleteEmiPayment}
                    disabled={!emiDetailsAvailable || paidEmiCount >= currentTenure}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      !emiDetailsAvailable || paidEmiCount >= currentTenure
                        ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-400"
                        : "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    EMI Paid
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadAllRecords}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#00C2D1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#00adc4]"
                  >
                    <Download className="h-4 w-4" />
                    Download All Records
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-[#1a4571] bg-[#0a2648]/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Next EMI reminder</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {emiDetailsAvailable
                        ? `Your next EMI of ${formatCurrency(calculatedEmi)} is due on ${formatDate(nextDueDate)}.`
                        : "EMI details not available yet"}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${overdue ? "bg-[#D65C76]/15 text-[#F4A6B7]" : "bg-[#00C2D1]/12 text-[#7BE7F0]"}`}>
                    {overdue ? "Overdue" : "Upcoming"}
                  </span>
                </div>
              </div>

              <div className="mt-5 relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={loanDetailSearch}
                  onChange={(event) => setLoanDetailSearch(event.target.value)}
                  placeholder="Search payments..."
                  className="w-full rounded-2xl border border-transparent bg-[#061421] p-3 pl-11 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#00C2D1]/50 focus:ring-2 focus:ring-[#00C2D1]/20"
                />
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#061b34]/80">
                <div className="max-h-[32rem] overflow-auto">
                  <table className="min-w-[760px] w-full divide-y divide-white/10 text-left text-sm text-slate-300">
                    <thead className="sticky top-0 z-10 bg-[#071c35]/95 backdrop-blur-sm">
                      <tr>
                        {["Payment Date", "Description", "Amount", "Status", "Actions"].map((heading) => (
                          <th key={heading} className="px-4 py-4 text-xs uppercase tracking-[0.25em] text-slate-500">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {showEmptyRepaymentState ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                            No repayment records found
                          </td>
                        </tr>
                      ) : (
                        filteredRepaymentRows.map((row) => (
                          <tr key={row.id} className="transition-colors duration-200 hover:bg-white/5">
                            <td className="px-4 py-4">{row.paymentDate}</td>
                            <td className="px-4 py-4">{row.description}</td>
                            <td className="px-4 py-4">{row.amountLabel}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(row.status)}`}>
                                {row.statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => handleOpenApplication(row.id)}
                                className="inline-flex items-center gap-2 rounded-2xl bg-[#0b2141] px-3 py-2 text-xs font-semibold text-[#00C2D1] transition hover:bg-[#0d2853]"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>

            <article className={panelClass}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold text-white sm:text-2xl">EMI & Repayment Summary</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {emiDetailsAvailable ? "Live repayment view for your current application." : "EMI details not available yet"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className={metricCardClass}>
                  <p className="text-sm text-slate-300">Next EMI Due</p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {emiDetailsAvailable ? formatCurrency(calculatedEmi) : "Not available yet"}
                  </p>
                  <p className="mt-3 text-sm text-[#00C2D1]">
                    {emiDetailsAvailable ? formatDate(nextDueDate) : "EMI details not available yet"}
                  </p>
                </div>

                <div className={metricCardClass}>
                  <p className="text-sm text-slate-300">EMI Paid</p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {emiDetailsAvailable ? `${paidEmiCount} / ${currentTenure}` : "0 / 0"}
                    <span className="ml-2 text-lg font-medium text-slate-300">Months</span>
                  </p>
                  <p className="mt-3 text-sm text-slate-400">{repaymentPercent}% completed</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#00C2D1]" style={{ width: `${repaymentPercent}%` }} />
                  </div>
                </div>

                <div className={metricCardClass}>
                  <p className="text-sm text-slate-300">Outstanding Balance</p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {emiDetailsAvailable && outstandingBalance != null ? formatCurrency(outstandingBalance) : "Not available yet"}
                  </p>
                  <p className="mt-3 text-sm text-slate-400">Remaining balance</p>
                </div>

                <div className={metricCardClass}>
                  <p className="text-sm text-slate-300">Total Paid So Far</p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {emiDetailsAvailable && totalPaidSoFar != null ? formatCurrency(totalPaidSoFar) : "Not available yet"}
                  </p>
                  <p className="mt-3 text-sm text-slate-400">principal + interest</p>
                </div>
              </div>

              <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-[#061b34]/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full ${overdue ? "bg-[#D65C76]/15 text-[#F4A6B7]" : "bg-emerald-400/10 text-emerald-200"}`}>
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Late Payment Status</p>
                      <p className="text-lg font-semibold text-white">
                        {emiDetailsAvailable ? (overdue ? "Overdue" : "No overdue payment") : "EMI details not available yet"}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${overdue ? "bg-[#D65C76]/15 text-[#F4A6B7]" : "bg-emerald-400/10 text-emerald-200"}`}>
                    {overdue ? "Warning" : "Healthy"}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className={`${metricCardClass} flex flex-col items-center justify-center`}>
                  <p className="text-sm text-slate-300">Repayment Progress</p>
                  <div className="relative mt-4 flex h-40 w-40 items-center justify-center">
                    <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                      <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                      <circle
                        cx="70"
                        cy="70"
                        r="54"
                        fill="none"
                        stroke="#00C2D1"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={progressCircumference}
                        strokeDashoffset={progressOffset}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-semibold text-white">{repaymentPercent}%</span>
                      <span className="text-sm text-slate-300">Completed</span>
                    </div>
                  </div>
                </div>

                <div className={metricCardClass}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-sm text-slate-300">
                        <span className="h-3 w-3 rounded-full bg-[#00C2D1]" />
                        Paid ({paidEmiCount} months)
                      </div>
                      <span className="text-sm font-medium text-slate-200">
                        {emiDetailsAvailable && totalPaidSoFar != null ? formatCurrency(totalPaidSoFar) : "Not available yet"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-sm text-slate-300">
                        <span className="h-3 w-3 rounded-full bg-white/20" />
                        Remaining ({Math.max(currentTenure - paidEmiCount, 0)} months)
                      </div>
                      <span className="text-sm font-medium text-slate-200">
                        {emiDetailsAvailable && outstandingBalance != null ? formatCurrency(outstandingBalance) : "Not available yet"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-[#061b34]/80 p-4">
                <p className="text-sm font-semibold text-white">Repayment Timeline</p>
                <div className="mt-6">
                  <div className="relative h-8">
                    <div className="absolute left-3 right-3 top-3 border-t border-dashed border-white/20" />
                    <div className="absolute left-3 top-0 h-6 w-6 rounded-full border-2 border-[#00C2D1] bg-[#00C2D1]" />
                    <div className="absolute left-1/2 top-0 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-[#00C2D1] bg-[#061421]" />
                    <div className="absolute right-3 top-0 h-6 w-6 rounded-full border-2 border-white/40 bg-[#061421]" />
                  </div>
                  <div className="grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Loan Disbursed</p>
                      <p className="mt-2 font-medium text-white">{currentApplication ? formatDate(repaymentStartDate) : "Not available yet"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Next EMI Due</p>
                      <p className="mt-2 font-medium text-white">{emiDetailsAvailable ? formatDate(nextDueDate) : "EMI details not available yet"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Loan Tenure Ends</p>
                      <p className="mt-2 font-medium text-white">{emiDetailsAvailable ? formatDate(loanEndDate) : "EMI details not available yet"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </section>

          {showEmptyLoanState ? (
            <section className="rounded-[1.5rem] border border-[#00C2D1]/15 bg-white/5 p-12 text-center shadow-[0_18px_60px_rgba(0,194,209,0.1)] backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#00C2D1]/20 bg-[#00C2D1]/10">
                <FileText className="h-7 w-7 text-[#00C2D1]" />
              </div>
              <p className="mt-5 text-sm uppercase tracking-[0.28em] text-slate-500">Loan Details</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">No loan application found</h3>
              <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto">
                Your loan dashboard will appear here once an application is saved under your logged-in account.
              </p>
              <button
                type="button"
                onClick={handleNewApplication}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#00C2D1] to-[#0891b2] px-8 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(0,194,209,0.3)] transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Start Your First Application
              </button>
            </section>
          ) : null}
        </div>
      </main>

      {/* ── EMI payment confirm dialog ── */}
      <Dialog open={emiConfirmOpen} onOpenChange={setEmiConfirmOpen}>
        <DialogContent className="max-w-sm rounded-[1.5rem] border border-white/10 bg-[#061b34] text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white">Mark EMI as Paid?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300 mt-1">
            This will record <span className="font-semibold text-white">EMI {paidEmiCount + 1} of {currentTenure}</span> ({formatCurrency(calculatedEmi)}) as paid for this loan.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setEmiConfirmOpen(false)}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmEmiPayment}
              className="flex-1 rounded-2xl border border-emerald-400/20 bg-emerald-400/15 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/25"
            >
              <Check className="inline h-4 w-4 mr-1.5" />
              Confirm Paid
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={handleApplicationModalChange}>
        <DialogContent
          className="top-2 h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl translate-y-0 overflow-y-auto rounded-[1rem] bg-white p-3 text-gray-900 sm:top-[50%] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:translate-y-[-50%] sm:rounded-[1.25rem] sm:p-6 lg:max-h-[90vh]"
          closeButtonClassName="right-[18px] top-[18px] flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white opacity-100 shadow-[0_10px_22px_rgba(239,68,68,0.24)] transition-all duration-200 hover:scale-105 hover:bg-red-600 hover:text-white active:scale-95 focus:ring-[#00C2D1]"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>EazyBizy Loan Application</DialogTitle>
          </DialogHeader>

          <GTABFormWizard
            key={`${wizardInstanceKey}-${editingAppId || "new"}`}
            ref={wizardRef}
            applicationId={editingAppId}
            draftMode={applicationFlow}
            onComplete={() => {
              setIsModalOpen(false);
              if (user?.id) {
                void fetchApplications(user.id);
              }
              toast({
                title: "Application Submitted!",
                description: "Your saved applications have been updated.",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanDetails;
