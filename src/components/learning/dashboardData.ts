import {
  Award,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Crown,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LucideIcon,
  Settings,
} from "lucide-react";

export type NavKey = "dashboard" | "courses" | "paidCourses" | "settings";

export type NotificationPreferences = {
  courseReminders: boolean;
  marketingEmails: boolean;
  productUpdates: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
};

export type ProfileDraft = {
  businessType: string;
  email: string;
  fullName: string;
  tagline: string;
};

type CourseCard = {
  accent: string;
  badge: string;
  description: string;
  duration: string;
  icon: LucideIcon;
  id: string;
  lessonsLeft: string;
  progress: number;
  title: string;
};

type PaidCourseCard = {
  description: string;
  icon: LucideIcon;
  id: string;
  lessons: string;
  outcome: string;
  title: string;
};

type OverviewCard = {
  icon: LucideIcon;
  iconClass: string;
  note: string;
  progress: number;
  title: string;
  value: string;
};

export const dashboardShell =
  "rounded-[30px] border border-[#e6ebf5] bg-white/92 text-slate-950 shadow-[0_26px_60px_-42px_rgba(15,23,42,0.22)]";

export const innerCard =
  "rounded-[24px] border border-[#e8edf6] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_20px_48px_-40px_rgba(15,23,42,0.22)]";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] px-5 text-white shadow-[0_20px_38px_-26px_rgba(37,99,235,0.58)] transition hover:-translate-y-0.5 hover:brightness-105";

export const businessTypeOptions = [
  "Retail",
  "Manufacturing",
  "Services",
  "Student Entrepreneur",
  "MSME Owner",
  "Consultant",
  "Startup Founder",
];

export const navItems: Array<{ icon: LucideIcon; key: NavKey; label: string }> = [
  { icon: LayoutDashboard, key: "dashboard", label: "Dashboard" },
  { icon: BookOpen, key: "courses", label: "Courses" },
  { icon: Crown, key: "paidCourses", label: "Premium" },
  { icon: Settings, key: "settings", label: "Settings" },
];

export const courseCards: CourseCard[] = [
  {
    accent: "from-[#5b5ff4] via-[#6d28d9] to-[#38bdf8]",
    badge: "Funding Readiness",
    description: "Build a bank-ready foundation for MSME borrowing, documentation, and approvals.",
    duration: "3h 20m",
    icon: BriefcaseBusiness,
    id: "course-funding-readiness",
    lessonsLeft: "4 lessons",
    progress: 72,
    title: "MSME Funding Readiness",
  },
  {
    accent: "from-[#0f766e] via-[#14b8a6] to-[#5eead4]",
    badge: "Finance Basics",
    description: "Understand cash flow, projections, ratios, and the numbers lenders care about.",
    duration: "2h 45m",
    icon: BarChart3,
    id: "course-finance-basics",
    lessonsLeft: "3 lessons",
    progress: 61,
    title: "Business Finance Basics",
  },
  {
    accent: "from-[#1d4ed8] via-[#3b82f6] to-[#93c5fd]",
    badge: "Documentation",
    description: "Organize your core business documents and prepare smoother lender submissions.",
    duration: "2h 10m",
    icon: FileSpreadsheet,
    id: "course-documentation",
    lessonsLeft: "5 lessons",
    progress: 48,
    title: "Loan Documentation Checklist",
  },
  {
    accent: "from-[#7c3aed] via-[#8b5cf6] to-[#c4b5fd]",
    badge: "Growth Strategy",
    description: "Turn loan capital into a structured expansion roadmap with better operational discipline.",
    duration: "4h 00m",
    icon: GraduationCap,
    id: "course-growth-strategy",
    lessonsLeft: "6 lessons",
    progress: 35,
    title: "Growth Planning for MSMEs",
  },
];

export const paidCourseCards: PaidCourseCard[] = [
  {
    description: "Advanced lender psychology, negotiation structure, and credit discussion tactics.",
    icon: Crown,
    id: "premium-credit-negotiation",
    lessons: "12 lessons",
    outcome: "Credit negotiation mastery",
    title: "Advanced Credit Negotiation",
  },
  {
    description: "Premium playbook for fundraising narratives, financial packaging, and investor clarity.",
    icon: Award,
    id: "premium-growth-capital",
    lessons: "10 lessons",
    outcome: "Growth capital readiness",
    title: "Growth Capital Playbook",
  },
  {
    description: "A structured deep dive into business scaling systems, reporting, and cash discipline.",
    icon: BarChart3,
    id: "premium-scale-systems",
    lessons: "14 lessons",
    outcome: "Scale operating system",
    title: "Scale Systems for Founders",
  },
];

export const weeklyLearningHours = [
  { day: "Mon", hours: 1.5 },
  { day: "Tue", hours: 2.1 },
  { day: "Wed", hours: 1.8 },
  { day: "Thu", hours: 2.6 },
  { day: "Fri", hours: 1.9 },
  { day: "Sat", hours: 2.8 },
  { day: "Sun", hours: 1.4 },
];

export const performanceGrowth = [
  { score: 58, week: "W1" },
  { score: 64, week: "W2" },
  { score: 71, week: "W3" },
  { score: 76, week: "W4" },
  { score: 83, week: "W5" },
  { score: 88, week: "W6" },
];

export const getDefaultTagline = (businessType: string) => {
  const normalized = businessType.trim().toLowerCase();
  if (normalized.includes("student")) return "Future-ready business learner";
  if (normalized.includes("retail")) return "Retail growth operator";
  if (normalized.includes("manufact")) return "Manufacturing business builder";
  if (normalized.includes("service")) return "Service business strategist";
  if (normalized.includes("consult")) return "Finance-focused consultant";
  if (normalized.includes("startup")) return "Startup growth founder";
  if (normalized.includes("msme")) return "MSME finance navigator";
  return "Business finance learner";
};

export const initialsFor = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "EB";

export const readStoredPreferences = (storageKey: string): NotificationPreferences => {
  const defaults: NotificationPreferences = {
    courseReminders: true,
    marketingEmails: false,
    productUpdates: true,
    pushNotifications: true,
    weeklyDigest: true,
  };

  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      courseReminders: typeof parsed.courseReminders === "boolean" ? parsed.courseReminders : defaults.courseReminders,
      marketingEmails: typeof parsed.marketingEmails === "boolean" ? parsed.marketingEmails : defaults.marketingEmails,
      productUpdates: typeof parsed.productUpdates === "boolean" ? parsed.productUpdates : defaults.productUpdates,
      pushNotifications: typeof parsed.pushNotifications === "boolean" ? parsed.pushNotifications : defaults.pushNotifications,
      weeklyDigest: typeof parsed.weeklyDigest === "boolean" ? parsed.weeklyDigest : defaults.weeklyDigest,
    };
  } catch {
    return defaults;
  }
};

export const buildOverviewCards = (learningHours: number): OverviewCard[] => [
  {
    icon: BookOpen,
    iconClass: "bg-[#eef2ff] text-[#4f46e5]",
    note: "Active business-learning tracks currently moving forward.",
    progress: 72,
    title: "Courses in Progress",
    value: `${courseCards.filter((course) => course.progress < 100).length}`,
  },
  {
    icon: ClockIcon,
    iconClass: "bg-[#ecfeff] text-[#0891b2]",
    note: "Total weekly study momentum across your current learning schedule.",
    progress: Math.min(96, Math.max(48, learningHours * 8)),
    title: "Learning Hours",
    value: `${learningHours}h`,
  },
  {
    icon: Award,
    iconClass: "bg-[#fff7ed] text-[#ea580c]",
    note: "Certificates and milestones unlocked from completed learning tracks.",
    progress: 66,
    title: "Certificates Earned",
    value: "2",
  },
  {
    icon: Crown,
    iconClass: "bg-[#faf5ff] text-[#7c3aed]",
    note: "Premium path availability for advanced finance and scale programs.",
    progress: 80,
    title: "Premium Readiness",
    value: "High",
  },
];

const ClockIcon = Award;

