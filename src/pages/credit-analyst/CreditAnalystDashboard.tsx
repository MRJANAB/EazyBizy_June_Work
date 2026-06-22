import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgePercent,
  BriefcaseBusiness,
  Calculator,
  ChevronRight,
  Download,
  IndianRupee,
  LogOut,
  Shield,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCreditAnalystAuth } from "@/hooks/useCreditAnalystAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedCMAWizard } from "@/components/credit-analyst/AdvancedCMAWizard";

interface LoanApplication {
  id: string;
  userId: string;
  name: string;
  email: string;
  businessName: string;
  businessDurationMonths: number | null;
  loanAmount: number;
  eligibleLoanAmount: number | null;
  creditScore: number;
  riskLevel: "Low" | "Medium" | "High";
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
  hasCmaDraft: boolean;
}

interface LoanApplicationDetails {
  id: string;
  user_id: string;
  amount: number | null;
  tenure_months: number | null;
  status: string | null;
  decision_status: string | null;
  created_at: string;
  submitted_at: string | null;
  credit_score: number | null;
  risk_assessment: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  gender: string | null;
  education: string | null;
  social_category: string | null;
  contact_email: string | null;
  contact_mobile: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  registration_type: string | null;
  business_entity_name: string | null;
  business_type: string | null;
  business_duration_months: number | null;
  type_of_business: string | null;
  industry_type: string | null;
  industry_other: string | null;
  loan_scheme: string | null;
  loan_scheme_other: string | null;
  loan_purpose: string | null;
  business_description: string | null;
  products_services: string | null;
  target_market: string | null;
  expected_monthly_revenue: number | null;
  expected_employment: number | null;
  competitive_advantage: string | null;
  promoter_experience: string | null;
  land_cost: number | null;
  shed_building_cost: number | null;
  plant_machinery: any[] | null;
  computers_cost: number | null;
  furniture_cost: number | null;
  electrification_cost: number | null;
  racks_storage_cost: number | null;
  transportation_cost: number | null;
  machinery_installation_cost: number | null;
  other_initial_expenditure: number | null;
  total_project_cost: number | null;
  margin_money: number | null;
  eligible_loan_amount: number | null;
  monthly_rent: number | null;
  skilled_workers_count: number | null;
  skilled_workers_salary: number | null;
  semi_skilled_workers_count: number | null;
  semi_skilled_workers_salary: number | null;
  wages_count: number | null;
  wages_salary: number | null;
  employee_count: number | null;
  salary_per_employee: number | null;
  total_monthly_salary: number | null;
  raw_material_cost: number | null;
  stationery_cost: number | null;
  electricity_water_cost: number | null;
  repair_maintenance_cost: number | null;
  transport_cost: number | null;
  telephone_internet_cost: number | null;
  marketing_cost: number | null;
  miscellaneous_cost: number | null;
  total_monthly_expenses: number | null;
  working_capital_required: number | null;
  working_capital_period: string | null;
  current_step: number | null;
  loan_types?: { name: string | null; interest_rate: number | null } | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    client_id: string | null;
    collateral_details: string | null;
  } | null;
}

interface AssessmentMetric {
  label: string;
  value: string;
  score: number;
  icon: LucideIcon;
}

const CreditAnalystDashboard = () => {
  const { isCreditAnalyst, loading: authLoading, user } = useCreditAnalystAuth();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [dialogMode, setDialogMode] = useState<"view" | "evaluate">("view");
  const [selectedApplication, setSelectedApplication] = useState<LoanApplicationDetails | null>(null);
  const [applicationDetailsCache, setApplicationDetailsCache] = useState<
    Record<string, LoanApplicationDetails>
  >({});
  const [isCmaWizardOpen, setIsCmaWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("applicant");
  const [decisionLoadingByApp, setDecisionLoadingByApp] = useState<Record<string, boolean>>({});


  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate("/auth");
      return;
    }

    if (!isCreditAnalyst) {
      navigate("/dashboard");
      return;
    }

    fetchApplications();
  }, [authLoading, user, isCreditAnalyst, navigate]);

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged out", description: "See you soon!" });
    navigate("/");
  };

  const normalizeStatus = (status?: string | null) => {
    const value = status?.toLowerCase();
    if (value === "approved") return "Approved";
    if (value === "rejected") return "Rejected";
    return "Pending";
  };

  const normalizeRisk = (riskAssessment: string | null, creditScore: number) => {
    const riskText = riskAssessment?.toLowerCase() || "";
    if (riskText.includes("low")) return "Low";
    if (riskText.includes("medium")) return "Medium";
    if (riskText.includes("high")) return "High";
    if (creditScore >= 750) return "Low";
    if (creditScore >= 650) return "Medium";
    return "High";
  };

  const fetchApplications = async () => {
    setLoading(true);

    try {
      const { data: appsData, error: appsError } = await supabase
        .from("loan_applications")
        .select(
          "id, amount, eligible_loan_amount, credit_score, status, decision_status, created_at, submitted_at, risk_assessment, user_id, business_entity_name, business_duration_months, cma_data",
        )
        .order("created_at", { ascending: false });

      if (appsError) {
        throw appsError;
      }

      if (!appsData || (appsData as any[]).length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const typedAppsData = appsData as any[];

      const userIds = [...new Set(typedAppsData.map((app) => app.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      if (profilesError) {
        throw profilesError;
      }

      const profilesMap = new Map(
        profilesData?.map((profile) => [profile.user_id, profile]) || [],
      );

      const mapped = typedAppsData.map((app) => {
        const profile = profilesMap.get(app.user_id);
        const creditScore = app.credit_score ?? 0;
        return {
          id: app.id,
          userId: app.user_id,
          name: profile?.full_name || "Unknown",
          email: profile?.email || "N/A",
          businessName: app.business_entity_name || profile?.full_name || "Unknown Business",
          businessDurationMonths: app.business_duration_months ?? null,
          loanAmount: Number(app.amount || 0),
          eligibleLoanAmount:
            app.eligible_loan_amount === null || app.eligible_loan_amount === undefined
              ? null
              : Number(app.eligible_loan_amount),
          creditScore,
          riskLevel: normalizeRisk(app.risk_assessment, creditScore),
          status: normalizeStatus(app.decision_status || app.status),
          submittedAt: new Date(app.submitted_at || app.created_at).toLocaleDateString(),
          hasCmaDraft: !!app.cma_data && Object.keys(app.cma_data as any).length > 0
        } satisfies LoanApplication;
      });

      setApplications(mapped);
    } catch (error: any) {
      console.error("Error fetching loans:", error);
      toast({
        variant: "destructive",
        title: "Failed to load applications",
        description: error?.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesFilter = filter === "All" || app.status === filter;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        app.businessName.toLowerCase().includes(term) ||
        app.name.toLowerCase().includes(term) ||
        app.email.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [applications, filter, searchTerm]);

  const formatCurrency = (amount?: number | null) => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const trimTrailingZeros = (value: string) =>
    value.replace(/\.0$/, "").replace(/(\.\d*[1-9])0+$/, "$1");

  const formatCompactCurrency = (amount?: number | null) => {
    if (amount === null || amount === undefined) return "N/A";
    if (amount >= 10000000) {
      return `Rs ${trimTrailingZeros((amount / 10000000).toFixed(amount >= 100000000 ? 0 : 1))}Cr`;
    }
    if (amount >= 100000) {
      return `Rs ${trimTrailingZeros((amount / 100000).toFixed(amount >= 1000000 ? 0 : 1))}L`;
    }
    if (amount >= 1000) {
      return `Rs ${trimTrailingZeros((amount / 1000).toFixed(amount >= 10000 ? 0 : 1))}K`;
    }
    return formatCurrency(amount);
  };

  const formatBusinessAge = (months?: number | null) => {
    if (!months || months <= 0) return "New Business";
    if (months >= 12) {
      const years = months / 12;
      return `${trimTrailingZeros(years.toFixed(years >= 10 ? 0 : 1))}Y Business`;
    }
    return `${months}M Business`;
  };

  const formatBusinessAgeLong = (months?: number | null) => {
    if (!months || months <= 0) return "New business";
    const years = months / 12;
    if (months >= 12) {
      const roundedYears = trimTrailingZeros(years.toFixed(years >= 10 ? 0 : 1));
      return `${roundedYears} year${roundedYears === "1" ? "" : "s"}`;
    }
    return `${months} month${months === 1 ? "" : "s"}`;
  };

  const formatYearsLong = (years?: number | null) => {
    if (!years || years <= 0) return "N/A";
    const roundedYears = trimTrailingZeros(years.toFixed(years >= 10 ? 0 : 1));
    return `${roundedYears} year${roundedYears === "1" ? "" : "s"}`;
  };

  const parseYearsFromText = (value?: string | null) => {
    if (!value) return null;
    const match = value.match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const years = Number(match[1]);
    if (!Number.isFinite(years)) return null;
    return value.toLowerCase().includes("month") ? years / 12 : years;
  };

  const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

  const getAssessmentPresentation = (score: number) => {
    if (score >= 85) {
      return {
        label: "Excellent",
        barClass: "bg-emerald-500",
        textClass: "text-emerald-400",
      };
    }
    if (score >= 70) {
      return {
        label: "Strong",
        barClass: "bg-emerald-400",
        textClass: "text-emerald-400",
      };
    }
    if (score >= 50) {
      return {
        label: "Moderate",
        barClass: "bg-amber-400",
        textClass: "text-amber-300",
      };
    }
    return {
      label: "Needs Review",
      barClass: "bg-rose-400",
      textClass: "text-rose-400",
    };
  };

  const getOverallAssessmentPresentation = (score: number) => {
    if (score >= 75) {
      return {
        label: "Excellent",
        badgeClass: "border border-emerald-400/20 bg-emerald-500/15 text-emerald-300",
      };
    }
    if (score >= 60) {
      return {
        label: "Strong",
        badgeClass: "border border-primary/20 bg-primary/15 text-primary",
      };
    }
    if (score >= 45) {
      return {
        label: "Moderate",
        badgeClass: "border border-amber-400/20 bg-amber-500/15 text-amber-300",
      };
    }
    return {
      label: "Needs Review",
      badgeClass: "border border-rose-400/20 bg-rose-500/15 text-rose-300",
    };
  };

  const getCreditScoreClass = (score?: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 750) return "text-emerald-400";
    if (score >= 650) return "text-amber-400";
    return "text-rose-400";
  };

  const getRiskLevelClass = (riskLevel: LoanApplication["riskLevel"]) => {
    if (riskLevel === "Low") return "text-emerald-500";
    if (riskLevel === "Medium") return "text-orange-500";
    return "text-red-500";
  };

  const getBusinessAgeComfort = (months?: number | null) => {
    if (!months || months < 12) {
      return {
        label: "Very risky",
        textClass: "text-red-500",
        activeIndex: 0,
      };
    }
    if (months < 36) {
      return {
        label: "Risky",
        textClass: "text-orange-500",
        activeIndex: 1,
      };
    }
    if (months < 60) {
      return {
        label: "Moderate",
        textClass: "text-yellow-500",
        activeIndex: 2,
      };
    }
    return {
      label: "Strong",
      textClass: "text-emerald-500",
      activeIndex: 3,
    };
  };

  const formatValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "string") {
      return value.replace(/_/g, " ");
    }
    return value.toString();
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString();
  };

  const buildApplicantName = (app: LoanApplicationDetails) => {
    const nameParts = [app.first_name, app.middle_name, app.last_name].filter(Boolean);
    if (nameParts.length > 0) return nameParts.join(" ");
    return app.profile?.full_name || "Unknown";
  };


  const DetailField = ({
    label,
    value,
  }: {
    label: string;
    value?: string | number | null;
  }) => (
    <div className="group flex flex-col gap-1.5 p-3 rounded-xl transition-colors hover:bg-slate-800/30">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-teal-500 transition-colors">{label}</p>
      <div className="text-sm font-bold text-white tracking-tight leading-relaxed">
        {formatValue(value)}
      </div>
    </div>
  );

  const DetailText = ({
    label,
    value,
  }: {
    label: string;
    value?: string | null;
  }) => (
    <div className="group flex flex-col gap-2 p-3 rounded-xl transition-colors hover:bg-slate-800/30 md:col-span-2">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-teal-500 transition-colors">{label}</p>
      <div className="text-sm font-medium text-slate-300 leading-relaxed bg-slate-950/30 p-4 rounded-xl border border-slate-800/50">
        {formatValue(value)}
      </div>
    </div>
  );

  const handleView = async (app: LoanApplication, mode: "view" | "evaluate" = "view") => {
    setDialogMode(mode);
    setIsViewOpen(true);

    const cachedApplication = applicationDetailsCache[app.id];
    if (cachedApplication) {
      setSelectedApplication(cachedApplication);
      setIsViewLoading(false);
      return;
    }

    setIsViewLoading(true);
    setSelectedApplication(null);

    try {
      const [
        { data: loanData, error: loanError },
        { data: profile, error: profileError },
      ] = await Promise.all([
        supabase
          .from("loan_applications")
          .select("*, loan_types (name, interest_rate)")
          .eq("id", app.id)
          .single(),
        supabase
          .from("profiles")
          .select("full_name, email, phone, client_id, collateral_details")
          .eq("user_id", app.userId)
          .maybeSingle(),
      ]);

      if (loanError) {
        throw loanError;
      }

      if (profileError) {
        throw profileError;
      }

      const detailedApplication = {
        ...(loanData as LoanApplicationDetails),
        profile: profile || null,
      };

      setSelectedApplication(detailedApplication);
      setApplicationDetailsCache((prev) => ({
        ...prev,
        [app.id]: detailedApplication,
      }));
    } catch (error: any) {
      console.error("Error loading application:", error);
      toast({
        variant: "destructive",
        title: "Failed to load application",
        description: error?.message || "Please try again.",
      });
      setIsViewOpen(false);
    } finally {
      setIsViewLoading(false);
    }
  };

  const handleOpenCMA = async (app: LoanApplication) => {
    // Set partial data immediately so the wizard can render and show its own loading state
    setSelectedApplication({
      id: app.id,
      user_id: app.userId,
      first_name: app.name.split(' ')[0] || '',
      last_name: app.name.split(' ').slice(1).join(' ') || '',
      business_entity_name: app.businessName,
      amount: app.loanAmount,
      eligible_loan_amount: app.eligibleLoanAmount,
      credit_score: app.creditScore,
      risk_assessment: app.riskLevel,
      status: app.status,
      created_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      plant_machinery: [],
      tenure_months: 60,
    } as LoanApplicationDetails);

    setIsCmaWizardOpen(true);
    setIsViewLoading(true);

    const cachedApplication = applicationDetailsCache[app.id];
    if (cachedApplication) {
      setSelectedApplication(cachedApplication);
      setIsViewLoading(false);
      return;
    }

    try {
      const [
        { data: loanData, error: loanError },
        { data: profile, error: profileError },
      ] = await Promise.all([
        supabase
          .from("loan_applications")
          .select("*, loan_types (name, interest_rate)")
          .eq("id", app.id)
          .single(),
        supabase
          .from("profiles")
          .select("full_name, email, phone, client_id, collateral_details")
          .eq("user_id", app.userId)
          .maybeSingle(),
      ]);

      if (loanError) throw loanError;

      const detailedApplication = {
        ...(loanData as LoanApplicationDetails),
        profile: profile || null,
      };

      setSelectedApplication(detailedApplication);
      setApplicationDetailsCache((prev) => ({
        ...prev,
        [app.id]: detailedApplication,
      }));
    } catch (error: any) {
      console.error("Error loading application for CMA:", error);
      toast({
        variant: "destructive",
        title: "Failed to initialize CMA",
        description: "Could not fetch application details.",
      });
      setIsCmaWizardOpen(false);
    } finally {
      setIsViewLoading(false);
    }
  };


  const handleApplicationDecision = async (
    applicationId: string,
    decision: "approved" | "rejected" | "documents_required",
  ) => {
    setDecisionLoadingByApp((prev) => ({ ...prev, [applicationId]: true }));

    try {
      const { error } = await supabase
        .from("loan_applications")
        .update({
          decision_status: decision,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        })
        .eq("id", applicationId);

      if (error) {
        throw error;
      }

      setSelectedApplication((prev) => {
        if (!prev || prev.id !== applicationId) return prev;
        return {
          ...prev,
          decision_status: decision,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        };
      });

      setApplicationDetailsCache((prev) => {
        const cached = prev[applicationId];
        if (!cached) return prev;
        return {
          ...prev,
          [applicationId]: {
            ...cached,
            decision_status: decision,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id ?? null,
          },
        };
      });

      toast({
        title:
          decision === "approved"
            ? "Application accepted"
            : decision === "rejected"
              ? "Application rejected"
              : "Changes requested",
        description: "Application decision has been updated.",
      });

      await fetchApplications();
    } catch (error: any) {
      console.error("Error updating application decision:", error);
      toast({
        variant: "destructive",
        title: "Failed to update decision",
        description: error?.message || "Please try again.",
      });
    } finally {
      setDecisionLoadingByApp((prev) => ({ ...prev, [applicationId]: false }));
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    if (!window.confirm("Are you sure you want to delete this application? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("loan_applications")
        .delete()
        .eq("id", applicationId);

      if (error) throw error;

      setApplications(prev => prev.filter(app => app.id !== applicationId));
      toast({
        title: "Application deleted",
        description: "The loan application has been permanently removed.",
      });
    } catch (error: any) {
      console.error("Error deleting application:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error?.message || "Please try again.",
      });
    }
  };

  const viewAssessment = useMemo(() => {
    if (!selectedApplication) return null;

    const requestedAmount = Math.max(selectedApplication.amount ?? 0, 0);
    const projectCoverageBase = Math.max(
      selectedApplication.total_project_cost ?? 0,
      (selectedApplication.eligible_loan_amount ?? 0) + (selectedApplication.margin_money ?? 0),
      requestedAmount,
    );
    const businessYears = Math.max((selectedApplication.business_duration_months ?? 0) / 12, 0);
    const promoterYears = parseYearsFromText(selectedApplication.promoter_experience) ?? Math.max(businessYears + 1, 1);
    const annualTurnover =
      (selectedApplication.expected_monthly_revenue ?? 0) > 0
        ? (selectedApplication.expected_monthly_revenue ?? 0) * 12
        : Math.max(projectCoverageBase * 1.6, requestedAmount * 1.4, 0);
    const annualExpenses =
      (selectedApplication.total_monthly_expenses ?? 0) > 0
        ? (selectedApplication.total_monthly_expenses ?? 0) * 12
        : annualTurnover * 0.72;
    const operatingSurplus = Math.max(annualTurnover - annualExpenses, annualTurnover * 0.12);
    const tenureYears = Math.max((selectedApplication.tenure_months ?? 60) / 12, 1);
    const annualDebtService =
      requestedAmount > 0
        ? Math.max(requestedAmount / tenureYears, requestedAmount * 0.18)
        : projectCoverageBase * 0.18;
    const collateralCoverage =
      requestedAmount > 0
        ? (projectCoverageBase / requestedAmount) * 100 +
        (selectedApplication.profile?.collateral_details ? 20 : 0)
        : 0;
    const dscrRaw = annualDebtService > 0 ? operatingSurplus / annualDebtService : 0;
    const dscr = Math.min(Math.max(dscrRaw || 0, 0.8), 3.0);
    const irrRaw =
      projectCoverageBase > 0 ? ((operatingSurplus / projectCoverageBase) * 100 * 0.45) : 0;
    const irr = Math.min(Math.max(irrRaw || 0, 8), 28);
    const turnoverRatio = requestedAmount > 0 ? annualTurnover / requestedAmount : 0;
    const requestedRatio = projectCoverageBase > 0 && requestedAmount > 0 ? requestedAmount / projectCoverageBase : 1;

    const scoreBusinessAge =
      businessYears >= 10 ? 100 : businessYears >= 5 ? 75 : businessYears >= 2 ? 55 : businessYears > 0 ? 35 : 20;
    const scorePromoter =
      promoterYears >= 15 ? 100 : promoterYears >= 8 ? 85 : promoterYears >= 4 ? 70 : promoterYears > 0 ? 50 : 25;
    const scoreTurnover =
      turnoverRatio >= 6 ? 100 : turnoverRatio >= 3 ? 75 : turnoverRatio >= 1.5 ? 55 : turnoverRatio > 0 ? 35 : 20;
    const scoreRequested =
      requestedRatio <= 0.4 ? 100 : requestedRatio <= 0.55 ? 75 : requestedRatio <= 0.7 ? 50 : requestedRatio <= 0.85 ? 35 : 20;
    const scoreCollateral =
      collateralCoverage >= 180 ? 100 : collateralCoverage >= 150 ? 75 : collateralCoverage >= 120 ? 60 : collateralCoverage >= 100 ? 45 : 25;
    const scoreDscr = dscr >= 2.3 ? 100 : dscr >= 1.8 ? 75 : dscr >= 1.3 ? 50 : dscr > 0 ? 35 : 20;
    const scoreIrr = irr >= 22 ? 100 : irr >= 16 ? 75 : irr >= 12 ? 55 : irr > 0 ? 35 : 20;

    const metrics: AssessmentMetric[] = [
      {
        label: "Age of Business",
        value: formatBusinessAgeLong(selectedApplication.business_duration_months),
        score: scoreBusinessAge,
        icon: BriefcaseBusiness,
      },
      {
        label: "Promoter Experience",
        value: formatYearsLong(promoterYears),
        score: scorePromoter,
        icon: UserRound,
      },
      {
        label: "Turnover",
        value: formatCompactCurrency(annualTurnover),
        score: scoreTurnover,
        icon: TrendingUp,
      },
      {
        label: "Loan Requested",
        value: formatCurrency(selectedApplication.amount),
        score: scoreRequested,
        icon: IndianRupee,
      },
      {
        label: "Collateral Coverage",
        value: requestedAmount > 0 ? `${Math.round(collateralCoverage)}%` : "N/A",
        score: scoreCollateral,
        icon: Shield,
      },
      {
        label: "DSCR",
        value: dscr.toFixed(2),
        score: scoreDscr,
        icon: Calculator,
      },
      {
        label: "IRR",
        value: `${Math.round(irr)}%`,
        score: scoreIrr,
        icon: BadgePercent,
      },
    ];

    const overallScore = Math.round(
      metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length,
    );
    const strengths = metrics
      .filter((metric) => metric.score >= 70)
      .map((metric) => `${metric.label}: ${metric.value}`);
    const concerns = metrics
      .filter((metric) => metric.score < 50)
      .map((metric) => `${metric.label}: ${metric.value}`);

    return {
      metrics,
      overallScore: clamp(overallScore),
      strengths,
      concerns,
      overallPresentation: getOverallAssessmentPresentation(overallScore),
    };
  }, [selectedApplication]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isCreditAnalyst) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans antialiased text-slate-100">
      <header className="border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-900/90 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  Credit Analyst <span className="bg-gradient-to-r from-teal-400 to-teal-500 bg-clip-text text-transparent">Portal</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300 hidden sm:block">
                {user?.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-300 hover:text-white hover:bg-slate-700/50 border border-slate-600/50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 lg:px-8 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Credit Analyst Portal
              </h1>
              <p className="mt-3 text-lg text-slate-400 font-medium">
                Review and assess all loan applications with precision and audit-grade tools.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl px-6 py-3 rounded-2xl border-l-4 border-l-teal-500 shadow-xl">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Total Volume</p>
                <p className="text-xl font-black text-white">₹ {(filteredApplications.reduce((s, a) => s + a.loanAmount, 0) / 100000).toFixed(1)}L</p>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl px-6 py-3 rounded-2xl border-l-4 border-l-emerald-500 shadow-xl">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Avg Score</p>
                <p className="text-xl font-black text-white">
                  {Math.round(filteredApplications.reduce((s, a) => s + (a.creditScore || 0), 0) / (filteredApplications.length || 1))}
                </p>
              </Card>
            </motion.div>
          </div>
          <div className="mb-10 p-2 bg-slate-950/40 border border-slate-800/50 backdrop-blur-2xl rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Input
                placeholder="Search by business, applicant, or email..."
                className="h-14 w-full border-none bg-transparent pl-4 text-lg placeholder:text-slate-600 focus-visible:ring-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2 px-2">
              <select
                className="h-12 rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all cursor-pointer"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <Button
                variant="outline"
                className="h-12 border-slate-800 bg-slate-900 px-6 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                onClick={fetchApplications}
              >
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="rounded-2xl border border-slate-600/50 bg-slate-800/40 px-8 py-16 text-center text-slate-400 shadow-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-4"></div>
            Loading applications...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="rounded-2xl border border-slate-600/50 bg-slate-800/40 px-8 py-16 text-center text-slate-400 shadow-xl">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-slate-500" />
            No applications found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filteredApplications.map((app, idx) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -8 }}
                className="group h-full"
              >
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => handleView(app, "evaluate")}
                  className="relative h-full overflow-hidden border border-slate-800/60 bg-gradient-to-br from-slate-900/90 to-slate-900/60 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-teal-500/40 hover:shadow-2xl hover:shadow-teal-500/5 cursor-pointer rounded-[32px]"
                >
                  <CardContent className="p-8">
                    <div className="flex h-full flex-col gap-8">
                      {/* Header Section */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-4 flex-1">
                          <div className="flex items-center gap-2">
                            <h2 className="truncate text-2xl font-black tracking-tight text-white group-hover:text-teal-400 transition-colors">
                              {app.businessName}
                            </h2>
                            {app.hasCmaDraft && (
                              <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-black text-teal-400 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
                                DRAFT
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <BriefcaseBusiness className="h-3.5 w-3.5 text-teal-500" />
                              {formatBusinessAge(app.businessDurationMonths)}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <IndianRupee className="h-3.5 w-3.5 text-emerald-500" />
                              {formatCompactCurrency(app.loanAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/50 text-slate-500 transition-all duration-500 group-hover:border-teal-500/50 group-hover:text-white group-hover:bg-teal-500">
                          <ChevronRight className="h-6 w-6" />
                        </div>
                      </div>

                      {/* Business Age Risk Indicator */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em]">
                          <span className="text-slate-500">Maturity Analysis</span>
                          <span className={getBusinessAgeComfort(app.businessDurationMonths).textClass}>
                            {getBusinessAgeComfort(app.businessDurationMonths).label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const comfort = getBusinessAgeComfort(app.businessDurationMonths);
                            const segmentClasses = ["bg-rose-500/40", "bg-orange-500/40", "bg-amber-500/40", "bg-emerald-500/40"];
                            return (
                              <div className="flex flex-1 items-center gap-1.5">
                                {segmentClasses.map((segmentClass, index) => (
                                  <span key={index} className={`h-1.5 flex-1 rounded-full ${segmentClass} ${comfort.activeIndex === index ? "opacity-100 ring-2 ring-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]" : "opacity-20"}`} />
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-black text-slate-600 tracking-widest block">Requested</span>
                          <span className="font-bold text-white text-xl tracking-tighter">₹ {app.loanAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-black text-slate-600 tracking-widest block">Eligible</span>
                          <span className={`font-bold text-xl tracking-tighter ${app.eligibleLoanAmount ? "text-teal-400" : "text-slate-500"}`}>
                            {app.eligibleLoanAmount ? `₹ ${app.eligibleLoanAmount.toLocaleString('en-IN')}` : "Pending Calc"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-black text-slate-600 tracking-widest block">Credit Score</span>
                          <span className={`font-bold text-xl ${getCreditScoreClass(app.creditScore)}`}>
                            {app.creditScore || "N/A"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-black text-slate-600 tracking-widest block">Risk Level</span>
                          <span className={`font-bold text-xl ${getRiskLevelClass(app.riskLevel)}`}>
                            {app.riskLevel}
                          </span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-xs font-black text-teal-500 shadow-lg">
                            {app.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="text-[11px] leading-tight">
                            <p className="font-bold text-white line-clamp-1">{app.name}</p>
                            <p className="text-slate-500 font-medium">{app.submittedAt}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-teal-500/20 bg-teal-500/5 text-teal-400 hover:bg-teal-500 hover:text-white h-10 px-5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-500 shadow-lg shadow-teal-500/5"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenCMA(app);
                            }}
                          >
                            <Calculator className="h-4 w-4 mr-2" />
                            CMA
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-600 hover:text-red-400 hover:bg-red-400/10 h-10 w-10 p-0 rounded-2xl transition-colors"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteApplication(app.id);
                            }}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent
          className={
            dialogMode === "view"
              ? "max-h-[92vh] max-w-6xl overflow-y-auto border border-slate-600/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl sm:rounded-2xl"
              : "max-w-5xl max-h-[95vh] overflow-y-auto border border-slate-600/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl sm:rounded-2xl"
          }
        >
          {dialogMode === "view" ? (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Loan Application Details</DialogTitle>
                <DialogDescription>
                  Review the business assessment generated from the submitted application.
                </DialogDescription>
              </DialogHeader>

              {isViewLoading ? (
                <div className="px-8 py-20 text-center text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-4"></div>
                  Loading application details...
                </div>
              ) : !selectedApplication || !viewAssessment ? (
                <div className="px-8 py-20 text-center text-slate-400">
                  No application details available.
                </div>
              ) : (
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                  <div className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-900/95 px-8 py-6 backdrop-blur-xl">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600/50 bg-slate-700/50 text-white hover:bg-slate-600/50 hover:border-teal-500/50"
                      onClick={() => setIsViewOpen(false)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Dashboard
                    </Button>
                  </div>

                  <div className="space-y-8 p-8 sm:p-10">
                    <Card className="rounded-2xl border border-slate-600/50 bg-gradient-to-br from-slate-800/60 to-slate-800/40 shadow-xl backdrop-blur-sm">
                      <CardContent className="p-8 sm:p-10">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h2 className="text-3xl font-bold tracking-tight text-white">
                              {selectedApplication.business_entity_name || buildApplicantName(selectedApplication)}
                            </h2>
                            <p className="mt-3 text-lg text-slate-400">Loan Application Assessment</p>
                            <div className="mt-6 flex flex-wrap gap-3 text-sm">
                              <span className="rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-slate-300">
                                Applicant:{" "}
                                <span className="font-semibold text-white">
                                  {buildApplicantName(selectedApplication)}
                                </span>
                              </span>
                              <span className="rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-slate-300">
                                Submitted:{" "}
                                <span className="font-semibold text-white">
                                  {formatDate(selectedApplication.submitted_at || selectedApplication.created_at)}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div
                            className={`inline-flex items-center rounded-xl px-6 py-3 text-sm font-bold ${viewAssessment.overallPresentation.badgeClass} shadow-lg`}
                          >
                            {viewAssessment.overallPresentation.label} ({viewAssessment.overallScore}%)
                          </div>
                        </div>

                        <div className="mt-10 space-y-8">
                          {viewAssessment.metrics.map((metric) => {
                            const presentation = getAssessmentPresentation(metric.score);
                            const Icon = metric.icon;

                            return (
                              <div
                                key={metric.label}
                                className="grid gap-6 border-t border-slate-600/30 pt-8 first:border-t-0 first:pt-0 md:grid-cols-[80px_minmax(0,240px)_minmax(0,1fr)] md:items-center"
                              >
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-600/50 bg-slate-700/50 shadow-lg">
                                  <Icon className="h-6 w-6 text-teal-400" />
                                </div>

                                <div className="space-y-2">
                                  <p className="text-base text-slate-400 font-medium">{metric.label}</p>
                                  <p className="text-3xl font-bold text-white">{metric.value}</p>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-4 text-sm">
                                    <span className={`font-semibold ${presentation.textClass}`}>
                                      {presentation.label}
                                    </span>
                                    <span className="text-slate-400 font-medium">{metric.score}%</span>
                                  </div>
                                  <div className="h-3 overflow-hidden rounded-full bg-slate-700/50">
                                    <div
                                      className={`h-full rounded-full ${presentation.barClass} shadow-sm`}
                                      style={{ width: `${metric.score}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border border-slate-600/50 bg-gradient-to-br from-slate-800/60 to-slate-800/40 shadow-xl backdrop-blur-sm">
                      <CardContent className="space-y-8 p-8 sm:p-10">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl font-bold text-white">Assessment Summary</h3>
                            <p className="mt-3 text-base text-slate-400">
                              Comprehensive analysis based on submitted business and financial details.
                            </p>
                          </div>
                          <Button
                            onClick={() => setIsCmaWizardOpen(true)}
                            className="bg-teal-600 hover:bg-teal-500 text-white px-6 h-12 rounded-xl font-bold shadow-lg shadow-teal-500/20 transition-all duration-300"
                          >
                            <Calculator className="h-5 w-5 mr-2" />
                            Run Advanced CMA
                          </Button>
                        </div>

                        <div className="grid gap-8 md:grid-cols-2">
                          <div className="space-y-4">
                            <h4 className="text-base font-bold uppercase tracking-wide text-white">
                              Key Strengths
                            </h4>
                            {viewAssessment.strengths.length > 0 ? (
                              <ul className="space-y-3 text-sm text-slate-300">
                                {viewAssessment.strengths.map((strength) => (
                                  <li key={strength} className="flex gap-3">
                                    <span className="mt-1 text-teal-400 text-lg">•</span>
                                    <span className="leading-relaxed">{strength}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-400 italic">No standout strengths detected yet.</p>
                            )}
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-base font-bold uppercase tracking-wide text-white">
                              Areas of Concern
                            </h4>
                            {viewAssessment.concerns.length > 0 ? (
                              <ul className="space-y-3 text-sm text-slate-300">
                                {viewAssessment.concerns.map((concern) => (
                                  <li key={concern} className="flex gap-3">
                                    <span className="mt-1 text-amber-400 text-lg">•</span>
                                    <span className="leading-relaxed">{concern}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-400 italic">No significant concerns identified.</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">Loan Application Details</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Review the complete application submitted by the user.
                </DialogDescription>
              </DialogHeader>

              {isViewLoading ? (
                <div className="py-20 text-center text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-4"></div>
                  Loading application details...
                </div>
              ) : !selectedApplication ? (
                <div className="py-20 text-center text-slate-400">
                  No application details available.
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="sticky top-0 z-20 flex items-center justify-between py-4 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 -mx-6 px-6 mb-6">
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight">Application Dossier</h2>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">ID: {selectedApplication.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <Button
                      onClick={() => setIsCmaWizardOpen(true)}
                      className="bg-teal-600 hover:bg-teal-500 text-white px-6 h-11 rounded-xl font-bold shadow-lg shadow-teal-500/20 transition-all duration-300"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Generate CA-Grade CMA
                    </Button>
                  </div>

                  <div className="flex space-x-2 overflow-x-auto pb-4 mb-4 border-b border-slate-800 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {[
                      { id: "applicant", label: "Applicant & Address" },
                      { id: "business", label: "Business Details" },
                      { id: "loan", label: "Loan Details" },
                      { id: "financials", label: "Financials" },
                      { id: "actions", label: "Evaluation Actions" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${activeTab === tab.id
                            ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]"
                            : "text-slate-500 border border-transparent hover:text-slate-300 hover:bg-slate-800/50"
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === "applicant" && (
                    <div className="space-y-8">
                      <Card className="border border-slate-800 bg-slate-900/50 shadow-2xl rounded-2xl overflow-hidden">

                        <CardHeader className="bg-slate-950/30 border-b border-slate-800 py-4">
                          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-teal-500/80">Applicant Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <DetailField label="Name" value={buildApplicantName(selectedApplication)} />
                          <DetailField label="Client ID" value={selectedApplication.profile?.client_id} />
                          <DetailField
                            label="Email"
                            value={selectedApplication.profile?.email || selectedApplication.contact_email}
                          />
                          <DetailField
                            label="Phone"
                            value={selectedApplication.profile?.phone || selectedApplication.contact_mobile}
                          />
                          <DetailField label="Gender" value={selectedApplication.gender} />
                          <DetailField label="Education" value={selectedApplication.education} />
                          <DetailField label="Social Category" value={selectedApplication.social_category} />
                          <DetailField
                            label="Submitted"
                            value={formatDate(selectedApplication.submitted_at || selectedApplication.created_at)}
                          />
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-800 bg-slate-900/50 shadow-2xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-950/30 border-b border-slate-800 py-4">
                          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-teal-500/80">Address</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <DetailField label="Address Line 1" value={selectedApplication.address_line_1} />
                          <DetailField label="Address Line 2" value={selectedApplication.address_line_2} />
                          <DetailField label="City" value={selectedApplication.city} />
                          <DetailField label="State" value={selectedApplication.state} />
                          <DetailField label="Pincode" value={selectedApplication.pincode} />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {activeTab === "business" && (
                    <Card className="border border-slate-800 bg-slate-900/50 shadow-2xl rounded-2xl overflow-hidden">
                      <CardHeader className="bg-slate-950/30 border-b border-slate-800 py-4">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-teal-500/80">Business Details</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailField label="Business Name" value={selectedApplication.business_entity_name} />
                        <DetailField label="Business Type" value={selectedApplication.business_type} />
                        <DetailField label="Registration Type" value={selectedApplication.registration_type} />
                        <DetailField label="Industry" value={selectedApplication.industry_type} />
                        <DetailField
                          label="Business Duration (months)"
                          value={selectedApplication.business_duration_months}
                        />
                        <DetailField label="Type of Business" value={selectedApplication.type_of_business} />
                        <DetailText label="Business Description" value={selectedApplication.business_description} />
                        <DetailText label="Products/Services" value={selectedApplication.products_services} />
                        <DetailText label="Target Market" value={selectedApplication.target_market} />
                        <DetailText label="Competitive Advantage" value={selectedApplication.competitive_advantage} />
                        <DetailText label="Promoter Experience" value={selectedApplication.promoter_experience} />
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === "loan" && (
                    <Card className="border border-slate-800 bg-slate-900/50 shadow-2xl rounded-2xl overflow-hidden">
                      <CardHeader className="bg-slate-950/30 border-b border-slate-800 py-4">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-teal-500/80">Loan Details</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailField label="Loan Scheme" value={selectedApplication.loan_scheme} />
                        <DetailField label="Loan Purpose" value={selectedApplication.loan_purpose} />
                        <DetailField label="Loan Type" value={selectedApplication.loan_types?.name} />
                        <DetailField label="Amount Requested" value={formatCurrency(selectedApplication.amount)} />
                        <DetailField label="Eligible Loan Amount" value={formatCurrency(selectedApplication.eligible_loan_amount)} />
                        <DetailField
                          label="Tenure (months)"
                          value={selectedApplication.tenure_months}
                        />
                        <DetailField
                          label="Status"
                          value={formatValue(selectedApplication.decision_status || selectedApplication.status)}
                        />
                        <DetailField label="Risk Assessment" value={selectedApplication.risk_assessment} />
                        <DetailField label="Credit Score" value={selectedApplication.credit_score ?? "N/A"} />
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === "financials" && (
                    <div className="space-y-8">
                      <Card className="border border-slate-800 bg-slate-900/50 shadow-2xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-950/30 border-b border-slate-800 py-4">
                          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-teal-500/80">Project Costs</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <DetailField label="Land Cost" value={formatCurrency(selectedApplication.land_cost)} />
                          <DetailField label="Shed/Building" value={formatCurrency(selectedApplication.shed_building_cost)} />
                          <DetailField label="Computers" value={formatCurrency(selectedApplication.computers_cost)} />
                          <DetailField label="Furniture" value={formatCurrency(selectedApplication.furniture_cost)} />
                          <DetailField label="Electrification" value={formatCurrency(selectedApplication.electrification_cost)} />
                          <DetailField label="Racks/Storage" value={formatCurrency(selectedApplication.racks_storage_cost)} />
                          <DetailField label="Transportation" value={formatCurrency(selectedApplication.transportation_cost)} />
                          <DetailField
                            label="Installation"
                            value={formatCurrency(selectedApplication.machinery_installation_cost)}
                          />
                          <DetailField
                            label="Other Expenditure"
                            value={formatCurrency(selectedApplication.other_initial_expenditure)}
                          />
                          <DetailField label="Total Project Cost" value={formatCurrency(selectedApplication.total_project_cost)} />
                          <DetailField label="Margin Money" value={formatCurrency(selectedApplication.margin_money)} />
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-800 bg-slate-900/50 shadow-2xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-950/30 border-b border-slate-800 py-4">
                          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-teal-500/80">Monthly Expenses</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <DetailField label="Monthly Rent" value={formatCurrency(selectedApplication.monthly_rent)} />
                          <DetailField
                            label="Skilled Workers"
                            value={`${selectedApplication.skilled_workers_count ?? 0} @ ${formatCurrency(selectedApplication.skilled_workers_salary)}`}
                          />
                          <DetailField
                            label="Semi Skilled Workers"
                            value={`${selectedApplication.semi_skilled_workers_count ?? 0} @ ${formatCurrency(selectedApplication.semi_skilled_workers_salary)}`}
                          />
                          <DetailField
                            label="Wages"
                            value={`${selectedApplication.wages_count ?? 0} @ ${formatCurrency(selectedApplication.wages_salary)}`}
                          />
                          <DetailField label="Employee Count" value={selectedApplication.employee_count} />
                          <DetailField label="Salary Per Employee" value={formatCurrency(selectedApplication.salary_per_employee)} />
                          <DetailField label="Total Monthly Salary" value={formatCurrency(selectedApplication.total_monthly_salary)} />
                          <DetailField label="Raw Material" value={formatCurrency(selectedApplication.raw_material_cost)} />
                          <DetailField label="Stationery" value={formatCurrency(selectedApplication.stationery_cost)} />
                          <DetailField
                            label="Electricity & Water"
                            value={formatCurrency(selectedApplication.electricity_water_cost)}
                          />
                          <DetailField
                            label="Maintenance"
                            value={formatCurrency(selectedApplication.repair_maintenance_cost)}
                          />
                          <DetailField label="Transport" value={formatCurrency(selectedApplication.transport_cost)} />
                          <DetailField
                            label="Telephone/Internet"
                            value={formatCurrency(selectedApplication.telephone_internet_cost)}
                          />
                          <DetailField label="Marketing" value={formatCurrency(selectedApplication.marketing_cost)} />
                          <DetailField label="Miscellaneous" value={formatCurrency(selectedApplication.miscellaneous_cost)} />
                          <DetailField
                            label="Total Monthly Expenses"
                            value={formatCurrency(selectedApplication.total_monthly_expenses)}
                          />
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-800 bg-slate-900/50 shadow-2xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-950/30 border-b border-slate-800 py-4">
                          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-teal-500/80">Working Capital</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <DetailField
                            label="Required"
                            value={formatCurrency(selectedApplication.working_capital_required)}
                          />
                          <DetailField
                            label="Period"
                            value={selectedApplication.working_capital_period}
                          />
                        </CardContent>
                      </Card>

                      {Array.isArray(selectedApplication.plant_machinery) &&
                        selectedApplication.plant_machinery.length > 0 && (
                          <Card className="border border-slate-800 bg-slate-900/50 shadow-2xl rounded-2xl overflow-hidden">
                            <CardHeader className="bg-slate-950/30 border-b border-slate-800 py-4">
                              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-teal-500/80">Plant & Machinery</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              {selectedApplication.plant_machinery.map((item, index) => (
                                <Card key={item?.id ?? index} className="border border-slate-600/30 bg-slate-700/30">
                                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                                    <DetailField
                                      label={`Machine ${index + 1}`}
                                      value={item?.machine_name || `Machine ${index + 1}`}
                                    />
                                    <DetailField label="Cost" value={formatCurrency(item?.cost)} />
                                    <DetailField label="Supplier" value={item?.supplier_name} />
                                    <DetailField label="Phone" value={item?.supplier_phone} />
                                    <DetailField label="Email" value={item?.supplier_email} />
                                  </CardContent>
                                </Card>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                    </div>
                  )}

                  {activeTab === "actions" && (
                    <div className="space-y-8">
                      <Card className="border border-slate-800 bg-slate-900/50 shadow-2xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-950/30 border-b border-slate-800 py-4">
                          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-teal-500/80">Evaluation Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button
                              className="w-full h-auto min-h-12 px-6 py-3 text-center whitespace-normal leading-snug bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-lg hover:shadow-teal-500/25 transition-all duration-200"
                              disabled={!!decisionLoadingByApp[selectedApplication.id]}
                              onClick={() => handleApplicationDecision(selectedApplication.id, "approved")}
                            >
                              Accept Application
                            </Button>
                            <Button
                              variant="destructive"
                              className="w-full h-auto min-h-12 px-6 py-3 text-center whitespace-normal leading-snug bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg hover:shadow-red-500/25 transition-all duration-200"
                              disabled={!!decisionLoadingByApp[selectedApplication.id]}
                              onClick={() => handleApplicationDecision(selectedApplication.id, "rejected")}
                            >
                              Reject Application
                            </Button>
                            <Button
                              variant="secondary"
                              className="w-full h-auto min-h-12 px-6 py-3 text-center whitespace-normal leading-snug bg-slate-600 hover:bg-slate-700 text-white font-semibold shadow-lg transition-all duration-200"
                              disabled={!!decisionLoadingByApp[selectedApplication.id]}
                              onClick={() =>
                                handleApplicationDecision(selectedApplication.id, "documents_required")
                              }
                            >
                              {decisionLoadingByApp[selectedApplication.id] ? "Updating..." : "Suggest Changes"}
                            </Button>
                            <Button
                              className="w-full h-auto min-h-12 px-6 py-3 text-center whitespace-normal leading-snug bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold shadow-lg hover:shadow-teal-500/25 transition-all duration-300 md:col-span-3"
                              onClick={() => setIsCmaWizardOpen(true)}
                            >
                              <BriefcaseBusiness className="mr-2 h-5 w-5" /> Launch Advanced CMA Wizard
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {selectedApplication && (
        <AdvancedCMAWizard
          isOpen={isCmaWizardOpen}
          onClose={() => setIsCmaWizardOpen(false)}
          applicationId={selectedApplication.id}
        />
      )}
    </div>
  );
};

export default CreditAnalystDashboard;
