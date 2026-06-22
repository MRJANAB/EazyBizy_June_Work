import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Clock3,
  Crown,
  Database,
  Download,
  Flame,
  GraduationCap,
  KeyRound,
  LineChart as LineChartIcon,
  LogOut,
  Mail,
  Medal,
  MonitorCheck,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import ProfilePanel from "@/components/learning/ProfilePanel";
import SmartLearningCalendar, { type LearningCalendarTask } from "@/components/learning/SmartLearningCalendar";
import {
  businessTypeOptions,
  courseCards,
  dashboardShell,
  getDefaultTagline,
  initialsFor,
  innerCard,
  navItems,
  paidCourseCards,
  primaryButton,
  readStoredPreferences,
  performanceGrowth as defaultPerformanceGrowth,
  weeklyLearningHours as defaultWeeklyLearningHours,
  type NavKey,
  type NotificationPreferences,
  type ProfileDraft,
} from "@/components/learning/dashboardData";

type AvatarEditorImage = {
  height: number;
  src: string;
  width: number;
};

const avatarEditorOutputSize = 640;

const learningRouteMap: Record<NavKey, string> = {
  dashboard: "/learning/dashboard",
  courses: "/learning/courses",
  paidCourses: "/learning/paid-courses",
  settings: "/learning/settings",
};

const knownLearningPaths = new Set<string>(["/learning", ...Object.values(learningRouteMap)]);

const resolveLearningNavKey = (pathname: string, hash: string): NavKey => {
  if (hash === "#settings" || pathname.endsWith("/settings")) return "settings";
  if (pathname.endsWith("/paid-courses")) return "paidCourses";
  if (pathname.endsWith("/courses")) return "courses";
  return "dashboard";
};

const getAvatarEditorMetrics = (image: AvatarEditorImage, zoom: number, size = avatarEditorOutputSize) => {
  if (image.width >= image.height) {
    const drawHeight = size * zoom;
    return {
      drawHeight,
      drawWidth: (image.width / image.height) * drawHeight,
    };
  }

  const drawWidth = size * zoom;
  return {
    drawHeight: (image.height / image.width) * drawWidth,
    drawWidth,
  };
};

const getAvatarPreviewBackgroundSize = (image: AvatarEditorImage, zoom: number) => {
  if (image.width >= image.height) {
    return `${(image.width / image.height) * zoom * 100}% ${zoom * 100}%`;
  }

  return `${zoom * 100}% ${(image.height / image.width) * zoom * 100}%`;
};

const getBrowserNotificationPermission = (): NotificationPermission | "unsupported" => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
};

const parseStoredProfileDraft = (rawValue: string | null): ProfileDraft | null => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<ProfileDraft>;
    return {
      businessType: typeof parsed.businessType === "string" ? parsed.businessType : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
      tagline: typeof parsed.tagline === "string" ? parsed.tagline : "",
    };
  } catch {
    return null;
  }
};

const getFallbackName = (metaName: string, email?: string | null) =>
  metaName || email?.split("@")[0]?.replace(/[._-]+/g, " ") || "Learner";

const buildStoredProfileState = ({
  fallbackName,
  storedProfileDraft,
  storedTagline,
  userEmail,
}: {
  fallbackName: string;
  storedProfileDraft: ProfileDraft | null;
  storedTagline: string | null;
  userEmail?: string | null;
}): ProfileDraft => ({
  businessType: storedProfileDraft?.businessType?.trim() || "",
  email: storedProfileDraft?.email?.trim() || userEmail || "",
  fullName: storedProfileDraft?.fullName?.trim() || fallbackName,
  tagline: storedProfileDraft?.tagline?.trim() || storedTagline || "",
});

const preferencesEqual = (left: NotificationPreferences, right: NotificationPreferences) =>
  left.courseReminders === right.courseReminders &&
  left.marketingEmails === right.marketingEmails &&
  left.pushNotifications === right.pushNotifications &&
  left.weeklyDigest === right.weeklyDigest &&
  left.productUpdates === right.productUpdates;

const profileDraftEqual = (left: ProfileDraft, right: ProfileDraft) =>
  left.businessType === right.businessType &&
  left.email === right.email &&
  left.fullName === right.fullName &&
  left.tagline === right.tagline;

type LearningNotificationTone = "info" | "success" | "warning";

type LearningNotificationItem = {
  description: string;
  id: string;
  occurredAt: string;
  title: string;
  tone: LearningNotificationTone;
};

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

const padCalendarValue = (value: number) => value.toString().padStart(2, "0");

const toCalendarDateKey = (date: Date) =>
  `${date.getFullYear()}-${padCalendarValue(date.getMonth() + 1)}-${padCalendarValue(date.getDate())}`;

const dateFromCalendarKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};

const addCalendarDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfCalendarWeek = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
};

const buildCalendarTaskDateTime = (task: LearningCalendarTask) => {
  const taskDate = dateFromCalendarKey(task.date);
  const [hours, minutes] = task.startTime.split(":").map(Number);
  taskDate.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return taskDate;
};

const normalizeLearningText = (value: string) => value.trim().toLowerCase();

const formatHoursValue = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
};

const formatNotificationTime = (timestamp: string) => {
  const occurredAt = new Date(timestamp);
  if (Number.isNaN(occurredAt.getTime())) return "Now";

  const diff = Date.now() - occurredAt.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) {
    const minutes = Math.max(1, Math.round(diff / minute));
    return `${minutes} min ago`;
  }
  if (diff < day) {
    const hours = Math.max(1, Math.round(diff / hour));
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  return dateTimeFormatter.format(occurredAt);
};

const isLearningCalendarTask = (value: unknown): value is LearningCalendarTask => {
  if (!value || typeof value !== "object") return false;

  const task = value as Partial<LearningCalendarTask>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.course === "string" &&
    typeof task.date === "string" &&
    typeof task.startTime === "string" &&
    typeof task.durationMinutes === "number" &&
    typeof task.status === "string"
  );
};

const readStoredCalendarTasks = (storageKey: string): LearningCalendarTask[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLearningCalendarTask) : [];
  } catch {
    return [];
  }
};

const readStoredIds = (storageKey: string) => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
};

const createCroppedAvatar = async (
  image: AvatarEditorImage,
  zoom: number,
  positionX: number,
  positionY: number,
) => {
  const sourceImage = new Image();
  sourceImage.src = image.src;

  await new Promise<void>((resolve, reject) => {
    sourceImage.onload = () => resolve();
    sourceImage.onerror = () => reject(new Error("Unable to load selected image"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = avatarEditorOutputSize;
  canvas.height = avatarEditorOutputSize;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare image editor");
  }

  const { drawWidth, drawHeight } = getAvatarEditorMetrics(image, zoom);
  const offsetX = -(Math.max(drawWidth - avatarEditorOutputSize, 0) * (positionX / 100));
  const offsetY = -(Math.max(drawHeight - avatarEditorOutputSize, 0) * (positionY / 100));

  context.clearRect(0, 0, avatarEditorOutputSize, avatarEditorOutputSize);
  context.drawImage(sourceImage, offsetX, offsetY, drawWidth, drawHeight);

  return canvas.toDataURL("image/png");
};

const Learning = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const userMeta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user?.app_metadata ?? {}) as Record<string, unknown>;
  const metaName = typeof userMeta.full_name === "string" ? userMeta.full_name.trim() : "";
  const subscriptionStatus =
    typeof userMeta.subscription_status === "string"
      ? userMeta.subscription_status
      : typeof appMeta.subscription_status === "string"
        ? appMeta.subscription_status
        : "";

  const hasPremium =
    ["premium", "active", "subscribed"].includes(subscriptionStatus.toLowerCase()) ||
    userMeta.premium_access === true ||
    appMeta.premium_access === true;
  const storageScope = user?.id ?? "guest";
  const avatarStorageKey = `eazybizy-learning-avatar:${storageScope}`;
  const calendarTasksStorageKey = `eazybizy-learning-calendar:${storageScope}`;
  const notificationReadStorageKey = `eazybizy-learning-notification-read:${storageScope}`;
  const profileDraftStorageKey = `eazybizy-learning-profile:${storageScope}`;
  const preferencesStorageKey = `eazybizy-learning-preferences:${storageScope}`;
  const premiumEmailNotificationsStorageKey = `eazybizy-learning-premium-email:${storageScope}`;
  const taglineStorageKey = `eazybizy-learning-tagline:${storageScope}`;
  const fallbackName = getFallbackName(metaName, user?.email);

  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const coursesRef = useRef<HTMLDivElement | null>(null);
  const premiumRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const notificationsFlashTimerRef = useRef<number | null>(null);
  const notificationSessionTimestampRef = useRef(new Date().toISOString());
  const profileFocusPendingRef = useRef(false);
  const notificationsFocusPendingRef = useRef(false);

  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileHighlighted, setProfileHighlighted] = useState(false);
  const [notificationsHighlighted, setNotificationsHighlighted] = useState(false);
  const [learningCalendarSummary, setLearningCalendarSummary] = useState("Plan today");
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission | "unsupported">(
    () => getBrowserNotificationPermission(),
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(avatarStorageKey) : null,
  );
  const [avatarEditorImage, setAvatarEditorImage] = useState<AvatarEditorImage | null>(null);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarPositionX, setAvatarPositionX] = useState(50);
  const [avatarPositionY, setAvatarPositionY] = useState(50);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [isApplyingAvatar, setIsApplyingAvatar] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => readStoredPreferences(preferencesStorageKey));
  const [premiumEmailNotifications, setPremiumEmailNotifications] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(premiumEmailNotificationsStorageKey) === "true",
  );
  const [calendarTasks, setCalendarTasks] = useState<LearningCalendarTask[]>(() => readStoredCalendarTasks(calendarTasksStorageKey));
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => readStoredIds(notificationReadStorageKey));
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => {
    const storedProfileDraft =
      typeof window !== "undefined"
        ? parseStoredProfileDraft(window.localStorage.getItem(profileDraftStorageKey))
        : null;
    const storedTagline = typeof window !== "undefined" ? window.localStorage.getItem(taglineStorageKey) : null;

    return buildStoredProfileState({
      fallbackName,
      storedProfileDraft,
      storedTagline,
      userEmail: user?.email,
    });
  });
  const [savedProfileDraft, setSavedProfileDraft] = useState<ProfileDraft>(() => {
    const storedProfileDraft =
      typeof window !== "undefined"
        ? parseStoredProfileDraft(window.localStorage.getItem(profileDraftStorageKey))
        : null;
    const storedTagline = typeof window !== "undefined" ? window.localStorage.getItem(taglineStorageKey) : null;

    return buildStoredProfileState({
      fallbackName,
      storedProfileDraft,
      storedTagline,
      userEmail: user?.email,
    });
  });
  const active = useMemo(() => resolveLearningNavKey(location.pathname, location.hash), [location.hash, location.pathname]);
  const deferredQuery = useDeferredValue(query);
  const normalizedPath = location.pathname.endsWith("/") && location.pathname !== "/" ? location.pathname.slice(0, -1) : location.pathname;
  const redirectTarget = useMemo(() => {
    if (!normalizedPath.startsWith("/learning")) return null;
    if (normalizedPath === "/learning") {
      return location.hash === "#settings" ? learningRouteMap.settings : learningRouteMap.dashboard;
    }

    return knownLearningPaths.has(normalizedPath) ? null : learningRouteMap.dashboard;
  }, [location.hash, normalizedPath]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      const storedAvatar = typeof window !== "undefined" ? window.localStorage.getItem(avatarStorageKey) : null;
      const storedProfileDraftRaw = typeof window !== "undefined" ? window.localStorage.getItem(profileDraftStorageKey) : null;
      const storedTagline = typeof window !== "undefined" ? window.localStorage.getItem(taglineStorageKey) : null;
      const storedPremiumEmailNotifications =
        typeof window !== "undefined" && window.localStorage.getItem(premiumEmailNotificationsStorageKey) === "true";
      const storedProfileDraft = parseStoredProfileDraft(storedProfileDraftRaw);
      const storedPreferences = readStoredPreferences(preferencesStorageKey);

      if (!cancelled) {
        setAvatarPreview((current) => (current === storedAvatar ? current : storedAvatar));
        setBrowserNotificationPermission(getBrowserNotificationPermission());
        setPreferences((current) => (preferencesEqual(current, storedPreferences) ? current : storedPreferences));
        setPremiumEmailNotifications((current) => (current === storedPremiumEmailNotifications ? current : storedPremiumEmailNotifications));
      }

      const localProfile = buildStoredProfileState({
        fallbackName,
        storedProfileDraft,
        storedTagline,
        userEmail: user?.email,
      });

      if (!user?.id) {
        if (!cancelled) {
          setProfileDraft((current) => (profileDraftEqual(current, localProfile) ? current : localProfile));
          setSavedProfileDraft((current) => (profileDraftEqual(current, localProfile) ? current : localProfile));
        }
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name,email,business_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const businessType = data?.business_type?.trim() || storedProfileDraft?.businessType?.trim() || "";

      const nextProfile = {
        fullName: data?.full_name?.trim() || storedProfileDraft?.fullName?.trim() || fallbackName,
        email: data?.email || storedProfileDraft?.email?.trim() || user.email || "",
        businessType,
        tagline: storedProfileDraft?.tagline?.trim() || storedTagline || getDefaultTagline(businessType),
      };

      setProfileDraft((current) => (profileDraftEqual(current, nextProfile) ? current : nextProfile));
      setSavedProfileDraft((current) => (profileDraftEqual(current, nextProfile) ? current : nextProfile));
    };

    void loadProfile();

    return () => {
      cancelled = true;
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (notificationsFlashTimerRef.current) window.clearTimeout(notificationsFlashTimerRef.current);
    };
  }, [
    avatarStorageKey,
    calendarTasksStorageKey,
    metaName,
    notificationReadStorageKey,
    preferencesStorageKey,
    premiumEmailNotificationsStorageKey,
    profileDraftStorageKey,
    taglineStorageKey,
    user?.email,
    user?.id,
  ]);

  useEffect(() => {
    setCalendarTasks(readStoredCalendarTasks(calendarTasksStorageKey));
  }, [calendarTasksStorageKey]);

  useEffect(() => {
    setReadNotificationIds(readStoredIds(notificationReadStorageKey));
  }, [notificationReadStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(notificationReadStorageKey, JSON.stringify(readNotificationIds));
  }, [notificationReadStorageKey, readNotificationIds]);

  const displayName = profileDraft.fullName.trim() || metaName || "Learner";
  const firstName = displayName.split(" ")[0] || "Learner";
  const initials = initialsFor(displayName);
  const searchTerm = deferredQuery.trim().toLowerCase();
  const recommendedSegment = profileDraft.businessType.toLowerCase().includes("student")
    ? "students"
    : profileDraft.businessType
      ? "established"
      : "aspiring";
  const weeklyFocusLabel = profileDraft.businessType || "Business finance";
  const hasCalendarData = calendarTasks.length > 0;
  const defaultAverageProgress = Math.round(courseCards.reduce((sum, course) => sum + course.progress, 0) / courseCards.length);
  const defaultLearningHours = Math.round(
    courseCards.reduce((total, course) => total + Math.max(1, course.progress / 18), 0),
  );
  const calendarCourseStats = useMemo(() => {
    const grouped = new Map<string, { completed: number; count: number; totalMinutes: number }>();

    calendarTasks.forEach((task) => {
      const key = normalizeLearningText(task.course || task.title);
      if (!key) return;

      const current = grouped.get(key) ?? { completed: 0, count: 0, totalMinutes: 0 };
      current.count += 1;
      current.totalMinutes += task.durationMinutes;
      if (task.status === "completed") current.completed += 1;
      grouped.set(key, current);
    });

    return grouped;
  }, [calendarTasks]);
  const liveCourseCards = useMemo(
    () =>
      courseCards.map((course) => {
        const stats = calendarCourseStats.get(normalizeLearningText(course.title));
        if (!stats) return course;

        const progress = stats.count ? Math.round((stats.completed / stats.count) * 100) : 0;
        const remainingSessions = Math.max(stats.count - stats.completed, 0);
        return {
          ...course,
          duration: `${formatHoursValue(stats.totalMinutes / 60)}h planned`,
          lessonsLeft: `${remainingSessions} session${remainingSessions === 1 ? "" : "s"} left`,
          progress,
        };
      }),
    [calendarCourseStats],
  );
  const visibleCourses = useMemo(
    () =>
      liveCourseCards.filter((course) =>
        !searchTerm
          ? true
          : `${course.title} ${course.description} ${course.badge}`.toLowerCase().includes(searchTerm),
      ),
    [liveCourseCards, searchTerm],
  );
  const visiblePaidCourses = useMemo(
    () =>
      paidCourseCards.filter((course) =>
        !searchTerm
          ? true
          : `${course.title} ${course.description} ${course.outcome}`.toLowerCase().includes(searchTerm),
      ),
    [searchTerm],
  );
  const nonMissedCalendarTasks = useMemo(
    () => calendarTasks.filter((task) => task.status !== "missed"),
    [calendarTasks],
  );
  const completedCalendarTasks = useMemo(
    () => calendarTasks.filter((task) => task.status === "completed"),
    [calendarTasks],
  );
  const scheduledCalendarTasks = useMemo(
    () => calendarTasks.filter((task) => task.status === "scheduled"),
    [calendarTasks],
  );
  const currentWeekStart = startOfCalendarWeek(new Date());
  const currentWeekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addCalendarDays(currentWeekStart, index)),
    [currentWeekStart],
  );
  const completedDayKeys = useMemo(
    () => new Set(completedCalendarTasks.map((task) => task.date)),
    [completedCalendarTasks],
  );
  const weeklyStreakDays = useMemo(
    () => currentWeekDates.map((date) => dayLabelFormatter.format(date).toUpperCase()),
    [currentWeekDates],
  );
  const weeklyStreakCompletion = useMemo(
    () => currentWeekDates.map((date) => completedDayKeys.has(toCalendarDateKey(date))),
    [completedDayKeys, currentWeekDates],
  );
  const weeklyLearningHours = useMemo(() => {
    if (!hasCalendarData) return defaultWeeklyLearningHours;

    const buckets = currentWeekDates.map((date) => ({
      day: dayLabelFormatter.format(date),
      hours: 0,
    }));
    const weekEnd = addCalendarDays(currentWeekStart, 7);

    nonMissedCalendarTasks.forEach((task) => {
      const taskDate = dateFromCalendarKey(task.date);
      if (taskDate < currentWeekStart || taskDate >= weekEnd) return;

      const bucketIndex = Math.floor((taskDate.getTime() - currentWeekStart.getTime()) / (24 * 60 * 60 * 1000));
      if (bucketIndex < 0 || bucketIndex >= buckets.length) return;

      buckets[bucketIndex].hours += task.durationMinutes / 60;
    });

    return buckets.map((bucket) => ({
      ...bucket,
      hours: Number((Math.round(bucket.hours * 10) / 10).toFixed(1)),
    }));
  }, [currentWeekDates, currentWeekStart, hasCalendarData, nonMissedCalendarTasks]);
  const weeklyTotalValue = weeklyLearningHours.reduce((sum, item) => sum + item.hours, 0);
  const weeklyTotal = formatHoursValue(weeklyTotalValue);
  const learningHoursValue = hasCalendarData
    ? nonMissedCalendarTasks.reduce((sum, task) => sum + task.durationMinutes, 0) / 60
    : defaultLearningHours;
  const learningHours = formatHoursValue(learningHoursValue);
  const activeCourseCount = hasCalendarData
    ? new Set(
        nonMissedCalendarTasks
          .map((task) => task.course.trim() || task.title.trim())
          .filter(Boolean),
      ).size
    : liveCourseCards.filter((course) => course.progress < 100).length;
  const averageProgress = hasCalendarData
    ? Math.round((completedCalendarTasks.length / Math.max(nonMissedCalendarTasks.length, 1)) * 100)
    : defaultAverageProgress;
  const weeklyStreakCount = hasCalendarData
    ? weeklyStreakCompletion.filter(Boolean).length
    : 5;
  const certificatesEarned = hasCalendarData
    ? `${Math.floor(completedCalendarTasks.length / 4)}`
    : "2";
  const consistencyScore = hasCalendarData
    ? Math.min(
        100,
        Math.round(
          ((weeklyStreakCompletion.filter(Boolean).length / 7) * 45) +
          ((completedCalendarTasks.length / Math.max(nonMissedCalendarTasks.length, 1)) * 55),
        ),
      )
    : Math.min(96, Math.max(72, Math.round(Number(weeklyTotal) * 4.4)));
  const performanceGrowth = useMemo(() => {
    if (!hasCalendarData) return defaultPerformanceGrowth;

    return Array.from({ length: 6 }, (_, index) => {
      const weekStart = addCalendarDays(currentWeekStart, (index - 5) * 7);
      const weekEnd = addCalendarDays(weekStart, 7);
      const weekTasks = nonMissedCalendarTasks.filter((task) => {
        const taskDate = dateFromCalendarKey(task.date);
        return taskDate >= weekStart && taskDate < weekEnd;
      });
      const score = weekTasks.length
        ? Math.round((weekTasks.filter((task) => task.status === "completed").length / weekTasks.length) * 100)
        : 0;

      return {
        score,
        week: `W${index + 1}`,
      };
    });
  }, [currentWeekStart, hasCalendarData, nonMissedCalendarTasks]);
  const overviewCards = useMemo(
    () => [
      {
        icon: BookOpen,
        iconClass: "bg-[#eef2ff] text-[#4f46e5]",
        note: "Active business-learning tracks currently moving forward.",
        progress: hasCalendarData ? Math.min(100, Math.max(18, activeCourseCount * 22)) : 72,
        title: "Courses in Progress",
        value: `${activeCourseCount}`,
      },
      {
        icon: Clock3,
        iconClass: "bg-[#ecfeff] text-[#0891b2]",
        note: "Total weekly study momentum across your current learning schedule.",
        progress: hasCalendarData ? Math.min(96, Math.max(24, Math.round(learningHoursValue * 8))) : Math.min(96, Math.max(48, learningHoursValue * 8)),
        title: "Learning Hours",
        value: `${learningHours}h`,
      },
      {
        icon: Award,
        iconClass: "bg-[#fff7ed] text-[#ea580c]",
        note: "Certificates and milestones unlocked from completed learning tracks.",
        progress: hasCalendarData ? Math.min(100, Math.max(12, Number(certificatesEarned) * 25)) : 66,
        title: "Certificates Earned",
        value: certificatesEarned,
      },
      {
        icon: Crown,
        iconClass: "bg-[#faf5ff] text-[#7c3aed]",
        note: "Premium path availability for advanced finance and scale programs.",
        progress: hasPremium ? 92 : 58,
        title: "Premium Readiness",
        value: hasPremium ? "High" : "Starter",
      },
    ],
    [activeCourseCount, certificatesEarned, hasCalendarData, hasPremium, learningHours, learningHoursValue],
  );
  const progressCourses = visibleCourses.filter((course) => course.progress < 100);
  const spotlightCourse = visibleCourses[0] ?? liveCourseCards[0];
  const secondaryCourse = visibleCourses[1] ?? liveCourseCards[1] ?? liveCourseCards[0];
  const progressCount = hasCalendarData ? activeCourseCount : progressCourses.length;
  const savedCourseOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...liveCourseCards.map((course) => course.title),
          ...paidCourseCards.map((course) => course.title),
          ...calendarTasks.map((task) => task.course.trim()).filter(Boolean),
        ]),
      ),
    [calendarTasks, liveCourseCards],
  );
  const premiumCoursesRoute = `/learning/segments/${recommendedSegment}`;
  const settingsShell =
    "relative text-white";
  const settingsCard =
    "rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,34,0.96)_0%,rgba(7,14,28,0.98)_100%)] p-5 text-white shadow-[0_24px_58px_-40px_rgba(0,0,0,0.82)] sm:p-6";
  const settingsFieldClass =
    "h-[58px] rounded-[12px] !border-white/10 !bg-[#081120] px-4 pt-5 text-[0.96rem] font-semibold !text-white !placeholder:text-slate-400 focus-visible:!ring-2 focus-visible:!ring-[#60a5fa] focus-visible:!ring-offset-0 read-only:!text-white disabled:cursor-default disabled:opacity-100 autofill:shadow-[inset_0_0_0px_1000px_#081120] autofill:[-webkit-text-fill-color:#ffffff]";
  const settingsPrimaryButton =
    "h-11 rounded-[16px] border border-[#3b82f6]/30 bg-[linear-gradient(135deg,#15308a_0%,#1d4ed8_55%,#3b82f6_100%)] px-5 font-semibold text-white shadow-[0_20px_38px_-26px_rgba(37,99,235,0.72)] transition hover:-translate-y-0.5 hover:brightness-105";
  const avatarEditorBackgroundSize = avatarEditorImage
    ? getAvatarPreviewBackgroundSize(avatarEditorImage, avatarZoom)
    : "100% 100%";
  const browserNotificationsEnabled = browserNotificationPermission === "granted" && preferences.pushNotifications;
  const browserNotificationsSupported = browserNotificationPermission !== "unsupported";
  const premiumEmailAddress = profileDraft.email.trim() || user?.email || "your saved email";
  const learningNotifications = useMemo(() => {
    const now = Date.now();
    const items: LearningNotificationItem[] = [];

    const upcomingTasks = [...scheduledCalendarTasks]
      .filter((task) => buildCalendarTaskDateTime(task).getTime() >= now)
      .sort((left, right) => buildCalendarTaskDateTime(left).getTime() - buildCalendarTaskDateTime(right).getTime());
    const recentCompletions = [...completedCalendarTasks]
      .filter((task) => task.completedAt)
      .sort(
        (left, right) =>
          new Date(right.completedAt ?? right.updatedAt).getTime() -
          new Date(left.completedAt ?? left.updatedAt).getTime(),
      );
    const missedTasks = [...calendarTasks]
      .filter((task) => task.status === "missed" && task.missedAt)
      .sort(
        (left, right) =>
          new Date(right.missedAt ?? right.updatedAt).getTime() -
          new Date(left.missedAt ?? left.updatedAt).getTime(),
      );

    recentCompletions.slice(0, 2).forEach((task) => {
      items.push({
        description: `${task.course} moved forward after you completed this learning block.`,
        id: `completed:${task.id}:${task.completedAt ?? task.updatedAt}`,
        occurredAt: task.completedAt ?? task.updatedAt,
        title: `${task.title} completed`,
        tone: "success",
      });
    });

    upcomingTasks.slice(0, 2).forEach((task) => {
      items.push({
        description: `${task.course} is scheduled for ${dateTimeFormatter.format(buildCalendarTaskDateTime(task))}.`,
        id: `scheduled:${task.id}:${task.updatedAt}`,
        occurredAt: task.updatedAt,
        title: `${task.title} scheduled`,
        tone: "info",
      });
    });

    missedTasks.slice(0, 2).forEach((task) => {
      items.push({
        description: "Reschedule this learning block to protect your weekly momentum.",
        id: `missed:${task.id}:${task.missedAt ?? task.updatedAt}`,
        occurredAt: task.missedAt ?? task.updatedAt,
        title: `${task.title} missed`,
        tone: "warning",
      });
    });

    if (!browserNotificationsEnabled) {
      items.push({
        description:
          browserNotificationPermission === "denied"
            ? "Your browser is blocking reminders right now. Re-enable them from browser settings anytime."
            : "Turn on browser reminders so the bell can stay updated with live study alerts.",
        id: `system:browser-reminders:${browserNotificationPermission}`,
        occurredAt: notificationSessionTimestampRef.current,
        title: browserNotificationPermission === "denied" ? "Browser reminders blocked" : "Enable learning reminders",
        tone: "warning",
      });
    }

    if (!items.length) {
      items.push({
        description: "Add your first live learning session in the calendar and the dashboard will update instantly.",
        id: "system:calendar-ready",
        occurredAt: notificationSessionTimestampRef.current,
        title: "Your learning dashboard is ready",
        tone: "info",
      });
    }

    return items
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
      .slice(0, 6);
  }, [
    browserNotificationPermission,
    browserNotificationsEnabled,
    calendarTasks,
    completedCalendarTasks,
    scheduledCalendarTasks,
  ]);
  const unreadNotificationCount = learningNotifications.filter(
    (item) => !readNotificationIds.includes(item.id),
  ).length;
  const notificationAttentionCount = unreadNotificationCount;

  useEffect(() => {
    setReadNotificationIds((current) =>
      current.filter((id) => learningNotifications.some((item) => item.id === id)),
    );
  }, [learningNotifications]);

  useEffect(() => {
    if (!hasCalendarData) {
      setLearningCalendarSummary("Plan today");
      return;
    }

    const nextTask = [...scheduledCalendarTasks].sort(
      (left, right) => buildCalendarTaskDateTime(left).getTime() - buildCalendarTaskDateTime(right).getTime(),
    )[0];

    setLearningCalendarSummary(
      nextTask
        ? `${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(dateFromCalendarKey(nextTask.date))} at ${nextTask.startTime}`
        : "Plan today",
    );
  }, [hasCalendarData, scheduledCalendarTasks]);
  const learningSearchPlaceholder =
    active === "paidCourses"
      ? "Search premium programs, email alerts, or upgrade help..."
      : active === "settings"
        ? "Search profile, reminders, or privacy help..."
        : "Search courses, reminders, or learning help...";
  const learningSearchGuide = useMemo(() => {
    const rawQuery = query.trim();
    const term = rawQuery.toLowerCase();
    if (!term) return null;

    const matchesKeywords = (keywords: string[]) =>
      keywords.some((keyword) => term.includes(keyword) || keyword.includes(term));
    const matchesContent = (content: string) => {
      const normalized = content.toLowerCase();
      return normalized.includes(term) || term.split(/\s+/).every((part) => normalized.includes(part));
    };

    const matchedCourse = liveCourseCards.find((course) =>
      matchesContent(`${course.title} ${course.description} ${course.badge}`),
    );
    const matchedPremiumCourse = paidCourseCards.find((course) =>
      matchesContent(`${course.title} ${course.description} ${course.outcome}`),
    );

    if (matchesKeywords(["notification", "notifications", "reminder", "reminders", "alert", "alerts", "calendar", "schedule"])) {
      return {
        badge: "Reminder guide",
        note:
          browserNotificationPermission === "denied"
            ? "Browser access is blocked right now."
            : browserNotificationsEnabled
              ? "Your browser reminders are already active."
              : "Enable browser reminders from Settings.",
        title: browserNotificationsEnabled ? "Your learning reminders are ready" : "Turn on reminders in one place",
        message: browserNotificationsEnabled
          ? "Use the Smart Learning Calendar to add sessions. EazyBizy will notify you at the reminder times you set."
          : "Open Settings > Notifications & Alerts, enable browser reminders, then add a calendar session to start getting nudges.",
      };
    }

    if (matchesKeywords(["premium", "upgrade", "subscription", "email", "emails"])) {
      return {
        badge: hasPremium ? "Premium guide" : "Upgrade guide",
        note: hasPremium
          ? `Future premium email alerts are saved for ${premiumEmailAddress}.`
          : "Starter users can unlock premium programs and reserve future email alerts.",
        title: hasPremium ? "Premium learning is available here" : "Premium unlocks advanced learning help",
        message: hasPremium
          ? "Open Premium Programs for advanced finance and scale courses, or use Settings to manage your future email-alert preference."
          : "Use the Premium section to unlock advanced business courses. Once premium is active, email-alert preferences can be saved for future rollout.",
      };
    }

    if (matchesKeywords(["profile", "photo", "avatar", "business", "tagline", "account", "settings"])) {
      return {
        badge: "Profile guide",
        note: "Profile changes are saved from Settings & Profile.",
        title: "Profile and account details live in Settings",
        message: "Open Settings & Profile to update your photo, business type, learner tagline, and account details from one place.",
      };
    }

    if (matchesKeywords(["password", "security", "logout", "session", "login"])) {
      return {
        badge: "Security guide",
        note: "Account Security is in the right-side settings panel.",
        title: "Security actions are grouped together",
        message: "Open Settings > Account Security to change your password, review your current session, or log out safely.",
      };
    }

    if (matchesKeywords(["progress", "certificate", "streak", "hours", "dashboard"])) {
      return {
        badge: "Dashboard guide",
        note: `${learningHours}h tracked this cycle.`,
        title: "Your dashboard shows learning momentum",
        message: "Use the dashboard cards to track streaks, hours, certificates, and overall progress across your active learning tracks.",
      };
    }

    if (active === "paidCourses" && matchedPremiumCourse) {
      return {
        badge: "Premium program",
        note: `${matchedPremiumCourse.lessons} • ${matchedPremiumCourse.outcome}`,
        title: matchedPremiumCourse.title,
        message: hasPremium
          ? matchedPremiumCourse.description
          : `${matchedPremiumCourse.description} Upgrade to Premium to unlock this guided program.`,
      };
    }

    if (matchedCourse) {
      return {
        badge: "Course guide",
        note: `${matchedCourse.lessonsLeft} • ${matchedCourse.duration}`,
        title: matchedCourse.title,
        message: `${matchedCourse.description} Open Courses to continue this module and follow the next recommended lesson path.`,
      };
    }

    if (matchedPremiumCourse) {
      return {
        badge: "Premium guide",
        note: `${matchedPremiumCourse.lessons} • ${matchedPremiumCourse.outcome}`,
        title: matchedPremiumCourse.title,
        message: hasPremium
          ? `${matchedPremiumCourse.description} Open Premium Programs to continue it.`
          : `${matchedPremiumCourse.description} Upgrade to Premium to unlock it.`,
      };
    }

    return {
      badge: "Search help",
      note: "Try keywords like funding, reminders, premium, profile, or password.",
      title: `No direct guide for "${rawQuery}" yet`,
      message: "Search works best with course topics, learning actions, or settings terms. Try a shorter phrase and EazyBizy will guide you faster.",
    };
  }, [
    active,
    browserNotificationPermission,
    browserNotificationsEnabled,
    hasPremium,
    learningHours,
    premiumEmailAddress,
    liveCourseCards,
    query,
  ]);
  const renderLearningSearchControl = ({
    inputClassName,
    iconClassName,
    tone,
    wrapperClassName,
  }: {
    iconClassName: string;
    inputClassName: string;
    tone: "dark" | "light";
    wrapperClassName?: string;
  }) => (
    <div className={cn("w-full", wrapperClassName)}>
      <div className="relative">
        <Search className={cn("absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2", iconClassName)} />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={learningSearchPlaceholder}
          className={inputClassName}
        />
      </div>
      {learningSearchGuide ? (
        <div
          className={cn(
            "mt-3 rounded-[18px] border px-4 py-3 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.28)]",
            tone === "dark"
              ? "border-white/10 bg-white/10 text-white backdrop-blur-xl"
              : "border-[#dfe6f5] bg-white text-slate-950",
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                tone === "dark" ? "bg-white/10 text-blue-100" : "bg-[#eef3ff] text-[#3151be]",
              )}
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className={cn("text-[10px] font-semibold uppercase tracking-[0.22em]", tone === "dark" ? "text-blue-100" : "text-[#5b5ff4]")}>
                {learningSearchGuide.badge}
              </p>
              <p className={cn("mt-1 text-sm font-semibold", tone === "dark" ? "text-white" : "text-slate-950")}>
                {learningSearchGuide.title}
              </p>
              <p className={cn("mt-1 text-xs leading-5", tone === "dark" ? "text-slate-200" : "text-slate-600")}>
                {learningSearchGuide.message}
              </p>
              <p className={cn("mt-2 text-[11px] leading-5", tone === "dark" ? "text-slate-300" : "text-slate-500")}>
                {learningSearchGuide.note}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds((current) =>
      current.includes(notificationId) ? current : [...current, notificationId],
    );
  };

  const markAllNotificationsRead = () => {
    setReadNotificationIds((current) =>
      Array.from(new Set([...current, ...learningNotifications.map((item) => item.id)])),
    );
  };

  const renderNotificationsBell = ({
    badgeClassName,
    buttonClassName,
    iconClassName,
  }: {
    badgeClassName: string;
    buttonClassName: string;
    iconClassName: string;
  }) => {
    const unreadLabel =
      unreadNotificationCount === 1 ? "1 unread update" : `${unreadNotificationCount} unread updates`;
    const toneClasses: Record<LearningNotificationTone, string> = {
      info: "bg-[#22d3ee]",
      success: "bg-emerald-400",
      warning: "bg-amber-400",
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={buttonClassName} aria-label="Notifications">
            <Bell className={iconClassName} />
            {notificationAttentionCount > 0 ? (
              <span className={badgeClassName}>
                {Math.min(notificationAttentionCount, 9)}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={12}
          className="w-[min(92vw,360px)] overflow-hidden rounded-[28px] border border-[#17426f] bg-[linear-gradient(180deg,#06152b_0%,#0b2141_100%)] p-0 text-white shadow-[0_28px_70px_-28px_rgba(2,6,23,0.88)]"
        >
          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[1.45rem] font-semibold tracking-tight text-white">Notifications</p>
                <p className="mt-1 text-sm text-slate-300">{unreadLabel}</p>
              </div>
              <button
                type="button"
                onClick={markAllNotificationsRead}
                disabled={unreadNotificationCount === 0}
                className="rounded-full border border-[#19558d] px-4 py-2 text-sm font-semibold text-[#7dd3fc] transition hover:bg-[#0e2e56] disabled:cursor-default disabled:border-white/10 disabled:text-slate-500"
              >
                Mark all as read
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {learningNotifications.map((item) => {
              const unread = !readNotificationIds.includes(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => markNotificationRead(item.id)}
                  className="flex w-full items-start gap-3 border-b border-white/6 px-5 py-4 text-left transition hover:bg-white/5"
                >
                  <span className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", toneClasses[item.tone], !unread && "opacity-35")} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={cn("text-[1.05rem] font-semibold", unread ? "text-white" : "text-slate-200")}>
                        {item.title}
                      </span>
                      <span className="whitespace-nowrap pt-0.5 text-xs text-slate-400">
                        {formatNotificationTime(item.occurredAt)}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-300">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-5 py-4">
            <button
              type="button"
              onClick={openNotificationsPanel}
              className="w-full rounded-[16px] border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Open notification settings
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const headerUtilityButtonClassName =
    "relative flex h-12 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] text-white shadow-[0_18px_32px_-24px_rgba(0,0,0,0.52)] transition duration-300 hover:-translate-y-0.5 hover:border-blue-200/28 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))]";
  const renderHeaderUtilityPanel = ({
    searchInputClassName,
    searchWrapperClassName,
  }: {
    searchInputClassName: string;
    searchWrapperClassName?: string;
  }) => (
    <div className="w-full rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,12,24,0.92)_0%,rgba(10,18,34,0.86)_100%)] p-3.5 shadow-[0_28px_60px_-38px_rgba(0,0,0,0.78)] sm:backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-100/88">Quick Search</p>
          <p className="mt-1 text-xs text-slate-400">Access courses, reminders, and profile tools from the top right.</p>
        </div>
        <div className="hidden rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-200 lg:inline-flex">
          Quick access
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {renderLearningSearchControl({
          iconClassName: "text-slate-500",
          inputClassName: searchInputClassName,
          tone: "dark",
          wrapperClassName: cn("min-w-0 flex-1", searchWrapperClassName),
        })}
        <div className="flex flex-col gap-3 px-1 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex w-full items-center gap-3 sm:w-auto">
            {renderNotificationsBell({
              badgeClassName:
                "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#facc15] px-1 text-[10px] font-bold text-slate-950 shadow-[0_0_18px_rgba(250,204,21,0.55)]",
              buttonClassName: cn(headerUtilityButtonClassName, "w-12 shrink-0"),
              iconClassName: "h-4.5 w-4.5",
            })}

            <button
              type="button"
              onClick={openProfilePanel}
              className={cn(headerUtilityButtonClassName, "min-w-0 flex-1 justify-start gap-3 px-4 sm:min-w-[138px] sm:flex-none")}
            >
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={avatarPreview ?? undefined} alt={displayName} className="object-cover" />
                <AvatarFallback className="rounded-full bg-[#0f172a] text-[10px] font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">Profile</span>
            </button>
          </div>

          {active === "dashboard" ? (
            <button
              type="button"
              onClick={handleLogout}
              className={cn(headerUtilityButtonClassName, "w-full justify-center gap-2 px-4 sm:w-auto")}
            >
              <LogOut className="h-4.5 w-4.5" />
              <span className="font-medium">Logout</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const handleNavSelect = (key: NavKey) => {
    if (key === "paidCourses") {
      if (!hasPremium) {
        setMobileNavOpen(false);
        setUpgradeOpen(true);
        return;
      }

      navigate(premiumCoursesRoute);
      return;
    }

    navigate(learningRouteMap[key]);
  };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncPermission = () => setBrowserNotificationPermission(getBrowserNotificationPermission());
    syncPermission();
    window.addEventListener("focus", syncPermission);
    document.addEventListener("visibilitychange", syncPermission);

    return () => {
      window.removeEventListener("focus", syncPermission);
      document.removeEventListener("visibilitychange", syncPermission);
    };
  }, []);

  const flashProfilePanel = () => {
    setProfileHighlighted(true);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setProfileHighlighted(false), 1500);
  };

  const flashNotificationsPanel = () => {
    setNotificationsHighlighted(true);
    if (notificationsFlashTimerRef.current) window.clearTimeout(notificationsFlashTimerRef.current);
    notificationsFlashTimerRef.current = window.setTimeout(() => setNotificationsHighlighted(false), 1500);
  };

  const focusProfilePanel = () => {
    profileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    flashProfilePanel();
  };

  const focusNotificationsPanel = () => {
    notificationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    flashNotificationsPanel();
  };

  const openProfilePanel = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1280) {
      if (active === "settings") {
        focusProfilePanel();
        return;
      }

      profileFocusPendingRef.current = true;
      navigate(learningRouteMap.settings);
      return;
    }

    setMobileProfileOpen(true);
  };

  const openNotificationsPanel = () => {
    setMobileNavOpen(false);

    if (active === "settings") {
      focusNotificationsPanel();
      return;
    }

    notificationsFocusPendingRef.current = true;
    navigate(learningRouteMap.settings);
  };

  const handleProfileFieldChange = (field: keyof ProfileDraft, value: string) => {
    setProfileDraft((current) => ({ ...current, [field]: value }));
  };

  const handleStartProfileEditing = () => {
    setIsEditingProfile(true);
  };
  const ensureProfileEditing = () => {
    if (!isEditingProfile) {
      setIsEditingProfile(true);
    }
  };

  const handleCancelProfileEditing = () => {
    setProfileDraft(savedProfileDraft);
    setIsEditingProfile(false);
  };

  useEffect(() => {
    if (!profileFocusPendingRef.current || active !== "settings") return;

    const frameId = window.requestAnimationFrame(() => {
      focusProfilePanel();
      profileFocusPendingRef.current = false;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [active]);

  useEffect(() => {
    if (!notificationsFocusPendingRef.current || active !== "settings") return;

    const frameId = window.requestAnimationFrame(() => {
      focusNotificationsPanel();
      notificationsFocusPendingRef.current = false;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [active]);

  const persistPreferences = (nextPreferences: NotificationPreferences) => {
    setPreferences(nextPreferences);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(preferencesStorageKey, JSON.stringify(nextPreferences));
    }
  };

  const persistPremiumEmailNotifications = (enabled: boolean) => {
    setPremiumEmailNotifications(enabled);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(premiumEmailNotificationsStorageKey, String(enabled));
    }
  };

  const persistAvatar = (nextAvatar: string | null) => {
    setAvatarPreview(nextAvatar);

    if (typeof window === "undefined") return;

    if (nextAvatar) {
      window.localStorage.setItem(avatarStorageKey, nextAvatar);
      return;
    }

    window.localStorage.removeItem(avatarStorageKey);
  };

  const resetAvatarEditor = () => {
    setAvatarEditorImage(null);
    setAvatarEditorOpen(false);
    setAvatarPositionX(50);
    setAvatarPositionY(50);
    setAvatarZoom(1);
  };

  const openAvatarEditor = (src: string) => {
    const image = new Image();
    image.onload = () => {
      setAvatarEditorImage({
        height: image.naturalHeight,
        src,
        width: image.naturalWidth,
      });
      setAvatarPositionX(50);
      setAvatarPositionY(50);
      setAvatarZoom(1);
      setAvatarEditorOpen(true);
    };
    image.onerror = () => {
      toast({
        variant: "destructive",
        title: "Image unavailable",
        description: "Please choose a different image and try again.",
      });
    };
    image.src = src;
  };

  const handleAvatarUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAdjustAvatar = () => {
    if (!avatarPreview) {
      fileInputRef.current?.click();
      return;
    }

    openAvatarEditor(avatarPreview);
  };

  const handleResetAvatarEditor = () => {
    setAvatarPositionX(50);
    setAvatarPositionY(50);
    setAvatarZoom(1);
  };

  const handleRemoveAvatar = () => {
    persistAvatar(null);
    toast({
      title: "Profile picture removed",
      description: "Upload a new photo anytime from your learning dashboard.",
    });
  };

  const handleAvatarSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Unsupported file",
        description: "Please upload a JPG, PNG, or WebP profile image.",
      });
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        toast({
          variant: "destructive",
          title: "Image unavailable",
          description: "Please choose a different image and try again.",
        });
        return;
      }

      openAvatarEditor(result);
    };
    reader.readAsDataURL(file);
    input.value = "";
  };

  const handleApplyAvatar = async () => {
    if (!avatarEditorImage) return;

    setIsApplyingAvatar(true);

    try {
      const nextAvatar = await createCroppedAvatar(avatarEditorImage, avatarZoom, avatarPositionX, avatarPositionY);
      persistAvatar(nextAvatar);
      resetAvatarEditor();
      toast({
        title: "Profile picture updated",
        description: "Your photo has been cropped and aligned for the learning dashboard.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to apply changes",
        description: "Please try a different image or adjust the crop again.",
      });
    } finally {
      setIsApplyingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileDraft.fullName.trim() || !profileDraft.email.trim()) {
      toast({
        variant: "destructive",
        title: "Profile details missing",
        description: "Please add both your name and email before saving.",
      });
      return;
    }

    const nextProfile = {
      businessType: profileDraft.businessType.trim(),
      email: profileDraft.email.trim(),
      fullName: profileDraft.fullName.trim(),
      tagline: profileDraft.tagline.trim() || getDefaultTagline(profileDraft.businessType),
    };

    setIsSavingProfile(true);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(profileDraftStorageKey, JSON.stringify(nextProfile));
      window.localStorage.setItem(taglineStorageKey, nextProfile.tagline);
    }

    if (!user?.id) {
      setProfileDraft(nextProfile);
      setSavedProfileDraft(nextProfile);
      setIsSavingProfile(false);
      setIsEditingProfile(false);
      toast({
        title: "Profile saved locally",
        description: "Your learning profile is now updated on this device.",
      });
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        business_type: nextProfile.businessType || null,
        email: nextProfile.email,
        full_name: nextProfile.fullName,
        user_id: user.id,
      },
      { onConflict: "user_id" },
    );

    setIsSavingProfile(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Unable to save profile",
        description: "Please try again in a moment.",
      });
      return;
    }

    setProfileDraft(nextProfile);
    setSavedProfileDraft(nextProfile);
    setIsEditingProfile(false);
    toast({
      title: "Profile updated",
      description: "Your EazyBizy learning profile now reflects your latest details.",
    });
  };

  const handleContinueLearning = () => navigate(`/learning/segments/${recommendedSegment}`);

  const handlePremiumClick = () => {
    if (!hasPremium) {
      setUpgradeOpen(true);
      return;
    }

    navigate(`/learning/segments/${recommendedSegment}`);
  };

  const handleChangePassword = () => navigate("/forgot-password");

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleDownloadData = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const exportData = {
      browserNotificationsEnabled,
      exportedAt: new Date().toISOString(),
      learningCalendarSummary,
      premiumAccess: hasPremium,
      premiumEmailNotifications,
      preferences,
      profile: profileDraft,
      weeklyFocusLabel,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "eazybizy-learning-data.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Data export ready",
      description: "Your learning profile and account data have been downloaded.",
    });
  };

  const handleManageData = () => {
    toast({
      title: "Data controls",
      description: "Your saved profile, access, and account data are managed from this settings page.",
    });
  };

  const handleActiveSessions = () => {
    toast({
      title: "Current session active",
      description: "You are signed in on this device. Use logout to end this session.",
    });
  };

  const handleCalendarBrowserNotificationsChange = (enabled: boolean) => {
    setBrowserNotificationPermission(getBrowserNotificationPermission());
    persistPreferences({
      ...preferences,
      courseReminders: enabled,
      pushNotifications: enabled,
    });
  };

  const handleEnableBrowserNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setBrowserNotificationPermission("unsupported");
      toast({
        title: "Notifications unavailable",
        description: "This browser does not support learning reminders.",
      });
      return;
    }

    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();

    setBrowserNotificationPermission(permission);

    if (permission === "granted") {
      persistPreferences({
        ...preferences,
        courseReminders: true,
        pushNotifications: true,
      });
      toast({
        title: "Browser reminders enabled",
        description: "You will now receive learning reminders for scheduled sessions.",
      });
      return;
    }

    persistPreferences({
      ...preferences,
      pushNotifications: false,
    });
    toast({
      title: permission === "denied" ? "Browser reminders blocked" : "Browser reminders not enabled",
      description:
        permission === "denied"
          ? "Your browser is blocking notifications. You can re-enable them from browser settings later."
          : "You can still use your learning planner without browser notifications.",
    });
  };

  const handlePauseBrowserNotifications = () => {
    persistPreferences({
      ...preferences,
      courseReminders: false,
      pushNotifications: false,
    });
    toast({
      title: "Browser reminders paused",
      description: "Learning reminders are paused here. You can turn them back on anytime.",
    });
  };

  const handleTogglePremiumEmailNotifications = () => {
    if (!hasPremium) {
      setUpgradeOpen(true);
      return;
    }

    const nextValue = !premiumEmailNotifications;
    persistPremiumEmailNotifications(nextValue);
    toast({
      title: nextValue ? "Premium email preference saved" : "Premium email preference turned off",
      description: nextValue
        ? `We saved ${premiumEmailAddress} for premium email notifications once that feature goes live.`
        : "Future premium email notifications have been turned off for this account.",
    });
  };

  const profilePanelCard = (
    <div
      ref={profileRef}
      className={cn("sm:col-span-2 2xl:col-span-1", profileHighlighted && "rounded-[36px] ring-2 ring-[#cdd7ff]")}
    >
      <ProfilePanel
        profile={profileDraft}
        avatarPreview={avatarPreview}
        initials={initials}
        isEditing={isEditingProfile}
        isSaving={isSavingProfile}
        onCancelEditing={handleCancelProfileEditing}
        onAdjustPhoto={handleAdjustAvatar}
        onFieldChange={handleProfileFieldChange}
        onSave={handleSaveProfile}
        onStartEditing={handleStartProfileEditing}
        onUploadClick={handleAvatarUploadClick}
        onRemovePhoto={handleRemoveAvatar}
      />
    </div>
  );

  const momentumCard = (
    <div className={cn(dashboardShell, "p-5")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Momentum</p>
          <h3 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">Next best action</h3>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#1d4ed8] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.18)]">
          <LineChartIcon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]">
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Conversion signal</p>
            <p className="mt-3 text-[1.12rem] font-semibold text-slate-950">{hasPremium ? "Premium learner retained" : "Premium intent is high"}</p>
          </div>
          <div>
            <p className="text-sm leading-7 text-slate-700">Continue your funding readiness and finance track</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Certificate target</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">Finish 2 more modules to unlock your next badge</p>
          </div>
        </div>
      </div>
    </div>
  );

  const calendarCard = (
    <SmartLearningCalendar
      allowBrowserNotifications={browserNotificationsEnabled}
      focusLabel={weeklyFocusLabel}
      onBrowserNotificationsChange={handleCalendarBrowserNotificationsChange}
      onSummaryChange={setLearningCalendarSummary}
      onTasksChange={setCalendarTasks}
      savedCourses={savedCourseOptions}
      storageScope={storageScope}
      userId={user?.id}
    />
  );

  const resolvedProfileTagline = profileDraft.tagline.trim() || getDefaultTagline(profileDraft.businessType);
  const nextBillingDate = hasPremium ? "May 23, 2026" : "Not scheduled";
  const privacyRows = [
    {
      action: handleDownloadData,
      icon: Download,
      note: "Export your learning profile, premium access, and stored account data.",
      title: "Download My Data",
    },
    {
      action: handleManageData,
      icon: Database,
      note: "Review how your profile and account data are stored.",
      title: "Manage Data",
    },
  ];

  const settingsSection = (
    <section ref={settingsRef} className={settingsShell}>
      <div className="space-y-5">
        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,34,0.96)_0%,rgba(7,14,28,0.98)_100%)] p-5 shadow-[0_24px_58px_-40px_rgba(0,0,0,0.82)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-100 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.2)]">
                <Sparkles className="h-3.5 w-3.5" />
                Learner Settings
              </div>
              <h2 className="mt-4 text-[2rem] font-semibold leading-[1.02] tracking-tight text-white sm:text-[2.45rem] lg:text-[3rem]">
                Settings & Profile
              </h2>
              <p className="mt-3 text-[1rem] leading-7 text-slate-300">
                Manage your profile, premium access, browser reminders, and account security in one simpler place.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:ml-auto lg:max-w-[620px] lg:items-end">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start lg:justify-end">
                {renderLearningSearchControl({
                  iconClassName: "text-slate-300",
                  inputClassName:
                    "h-12 rounded-full border-white/10 bg-white/6 pl-12 font-medium text-white shadow-[0_16px_34px_-30px_rgba(0,0,0,0.45)] placeholder:text-slate-400 focus-visible:ring-[#60a5fa]",
                  tone: "dark",
                  wrapperClassName: "min-w-0 flex-1 lg:max-w-[380px]",
                })}
                {renderNotificationsBell({
                  badgeClassName:
                    "absolute -right-0.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1d4ed8] px-1 text-[10px] font-bold text-white shadow-[0_0_16px_rgba(37,99,235,0.28)]",
                  buttonClassName:
                    "relative flex h-12 w-12 shrink-0 self-start items-center justify-center rounded-full border border-white/10 bg-white/6 text-white shadow-[0_16px_34px_-30px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:bg-white/10 sm:self-auto",
                  iconClassName: "h-5 w-5",
                })}
                <button
                  type="button"
                  onClick={openProfilePanel}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/6 px-4 text-white shadow-[0_16px_34px_-30px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto"
                >
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage src={avatarPreview ?? undefined} alt={displayName} className="object-cover" />
                    <AvatarFallback className="rounded-full bg-[#1d4ed8] text-[10px] font-semibold text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="font-semibold">Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div ref={profileRef} className={cn(settingsCard, profileHighlighted && "ring-2 ring-[#8b5cf6]/35")}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-white">Profile Settings</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">Update your personal information and profile picture.</p>
            </div>
            {isEditingProfile ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={handleCancelProfileEditing} className="h-11 rounded-[16px] border-white/10 bg-white/6 px-5 text-white hover:bg-white/10">
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveProfile} disabled={isSavingProfile} className={settingsPrimaryButton}>
                  {isSavingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={handleStartProfileEditing} className={settingsPrimaryButton}>
                <Settings className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[150px_minmax(0,1fr)] lg:items-start">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={handleAdjustAvatar}
                className="group relative flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[10px] border-white/10 bg-[#1d4ed8] text-2xl font-bold text-white shadow-[0_20px_42px_-30px_rgba(37,99,235,0.5)]"
                aria-label="Update profile photo"
              >
                {avatarPreview ? <img src={avatarPreview} alt={displayName} className="h-full w-full object-cover" /> : initials}
                <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-4 border-[#081120] bg-[#07111f] text-white">
                  <Camera className="h-4 w-4" />
                </span>
              </button>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-100">
                <Sparkles className="h-3.5 w-3.5" />
                Photo ready
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="relative">
                <span className="pointer-events-none absolute left-4 top-3 text-xs font-medium text-slate-300">Full Name</span>
                <Input
                  value={profileDraft.fullName}
                  onChange={(event) => handleProfileFieldChange("fullName", event.target.value)}
                  onFocus={ensureProfileEditing}
                  onPointerDown={ensureProfileEditing}
                  readOnly={!isEditingProfile}
                  className={settingsFieldClass}
                />
              </label>
              <label className="relative">
                <span className="pointer-events-none absolute left-4 top-3 text-xs font-medium text-slate-300">Email Address</span>
                <Input
                  value={profileDraft.email}
                  onChange={(event) => handleProfileFieldChange("email", event.target.value)}
                  onFocus={ensureProfileEditing}
                  onPointerDown={ensureProfileEditing}
                  readOnly={!isEditingProfile}
                  className={settingsFieldClass}
                />
              </label>
              <label className="relative">
                <span className="pointer-events-none absolute left-4 top-3 z-10 text-xs font-medium text-slate-300">Business Type</span>
                <select
                  value={profileDraft.businessType}
                  onChange={(event) => {
                    ensureProfileEditing();
                    handleProfileFieldChange("businessType", event.target.value);
                  }}
                  onFocus={ensureProfileEditing}
                  onPointerDown={ensureProfileEditing}
                  className="h-[58px] w-full rounded-[12px] border border-white/10 bg-[#081120] px-4 pt-5 text-[0.96rem] font-semibold text-white outline-none transition focus:border-[#60a5fa] disabled:cursor-default disabled:opacity-100 [color-scheme:dark]"
                >
                  <option value="">Set your business identity</option>
                  {profileDraft.businessType && !businessTypeOptions.includes(profileDraft.businessType) ? (
                    <option value={profileDraft.businessType}>{profileDraft.businessType}</option>
                  ) : null}
                  {businessTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="relative">
                <span className="pointer-events-none absolute left-4 top-3 text-xs font-medium text-slate-300">Role / Tagline</span>
                <Input
                  value={profileDraft.tagline}
                  onChange={(event) => handleProfileFieldChange("tagline", event.target.value)}
                  onFocus={ensureProfileEditing}
                  onPointerDown={ensureProfileEditing}
                  placeholder={resolvedProfileTagline}
                  readOnly={!isEditingProfile}
                  className={settingsFieldClass}
                />
              </label>
            </div>
          </div>
        </div>

        <div className={settingsCard}>
          <h3 className="text-xl font-semibold tracking-tight text-white">Premium Access</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Manage your subscription, courses, and premium features.</p>
          <div className="mt-5 grid gap-4 rounded-[16px] border border-white/10 bg-white/5 p-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#1d4ed8_0%,#4338ca_100%)] text-white shadow-[0_16px_28px_-18px_rgba(37,99,235,0.6)]">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Your Plan</p>
                <p className="mt-1 text-base font-semibold text-blue-100">{hasPremium ? "Premium Learner" : "Starter Learner"}</p>
              </div>
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-medium text-slate-400">Status</p>
              <p className={cn("mt-1 text-base font-semibold", hasPremium ? "text-emerald-300" : "text-slate-200")}>{hasPremium ? "Active" : "Not Active"}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-medium text-slate-400">Next Billing</p>
              <p className="mt-1 text-base font-semibold text-white">{nextBillingDate}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => (hasPremium ? handlePremiumClick() : setUpgradeOpen(true))} className="h-11 rounded-[12px] border-[#3b82f6]/30 bg-[linear-gradient(135deg,#15308a_0%,#1d4ed8_55%,#3b82f6_100%)] px-5 font-semibold text-white hover:brightness-105 whitespace-nowrap">
              <Crown className="h-4 w-4" />
              Manage Subscription
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={notificationsRef}
          className={cn(settingsCard, notificationsHighlighted && "ring-2 ring-[#2563eb]/30")}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-white">Notifications & Alerts</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Turn on browser reminders now, and premium email notifications can be used later when that feature launches.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-blue-100">
              <Bell className="h-3.5 w-3.5" />
              {browserNotificationsEnabled ? "Browser reminders active" : "Notifications need setup"}
            </div>
          </div>

          <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
            <div className="flex h-full flex-col rounded-[16px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.16)_0%,rgba(99,102,241,0.16)_100%)] text-blue-100">
                    <Bell className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Browser learning reminders</p>
                    <p className="mt-2 text-xs leading-5 text-slate-300">
                      Get notifications for your scheduled learning sessions directly in your browser.
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    browserNotificationsEnabled
                      ? "bg-emerald-500/15 text-emerald-200"
                      : browserNotificationPermission === "denied"
                        ? "bg-rose-500/15 text-rose-200"
                        : browserNotificationsSupported
                          ? "bg-amber-500/15 text-amber-200"
                          : "bg-white/10 text-slate-300",
                  )}
                >
                  {browserNotificationsEnabled
                    ? "Enabled"
                    : browserNotificationPermission === "denied"
                      ? "Blocked"
                      : browserNotificationsSupported
                        ? "Off"
                        : "Unsupported"}
                </span>
              </div>
              <div className="mt-auto pt-4">
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-4">
                  <p className="text-xs leading-5 text-slate-300">
                    {browserNotificationPermission === "denied"
                      ? "Notifications are blocked by your browser right now."
                      : browserNotificationsEnabled
                        ? "Your learning calendar can send live session reminders."
                        : "Enable this once and your learning calendar reminders will start working."}
                  </p>
                  <Button
                    type="button"
                    variant={browserNotificationsEnabled ? "outline" : "default"}
                    onClick={browserNotificationsEnabled ? handlePauseBrowserNotifications : handleEnableBrowserNotifications}
                    className={cn(
                      "sm:justify-self-end",
                      browserNotificationsEnabled
                        ? "h-10 rounded-[12px] border-white/10 bg-white/6 px-4 text-white hover:bg-white/10"
                        : "h-10 rounded-[12px] border border-[#3b82f6]/30 bg-[linear-gradient(135deg,#15308a_0%,#1d4ed8_55%,#3b82f6_100%)] px-4 text-white hover:brightness-105",
                    )}
                  >
                    {browserNotificationsEnabled ? "Pause reminders" : "Enable reminders"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex h-full flex-col rounded-[16px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(99,102,241,0.16)_0%,rgba(168,85,247,0.14)_100%)] text-[#c4b5fd]">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Premium email notifications</p>
                    <p className="mt-2 text-xs leading-5 text-slate-300">
                      Premium learners can save their email preference now, and EazyBizy can use it when email alerts go live later.
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    hasPremium
                      ? premiumEmailNotifications
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-violet-500/15 text-violet-200"
                      : "bg-white/10 text-slate-300",
                  )}
                >
                  {hasPremium ? (premiumEmailNotifications ? "Saved" : "Coming soon") : "Premium"}
                </span>
              </div>
              <div className="mt-auto pt-4">
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-4">
                  <p className="text-xs leading-5 text-slate-300">
                    {hasPremium
                      ? `Future premium email alerts will use ${premiumEmailAddress}.`
                      : "Upgrade to Premium to reserve your email-notification preference for future rollout."}
                  </p>
                  <Button
                    type="button"
                    variant={hasPremium && premiumEmailNotifications ? "outline" : "default"}
                    onClick={handleTogglePremiumEmailNotifications}
                    className={cn(
                      "sm:justify-self-end",
                      hasPremium && premiumEmailNotifications
                        ? "h-10 rounded-[12px] border-white/10 bg-white/6 px-4 text-white hover:bg-white/10"
                        : hasPremium
                          ? "h-10 rounded-[12px] border border-[#3b82f6]/30 bg-[linear-gradient(135deg,#15308a_0%,#1d4ed8_55%,#3b82f6_100%)] px-4 text-white hover:brightness-105"
                          : "h-10 rounded-[12px] border border-[#3b82f6]/30 bg-[linear-gradient(135deg,#15308a_0%,#1d4ed8_55%,#3b82f6_100%)] px-4 text-white hover:brightness-105",
                    )}
                  >
                    {hasPremium
                      ? premiumEmailNotifications
                        ? "Turn off future emails"
                        : "Save future email alerts"
                      : "Unlock Premium"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={settingsCard}>
          <h3 className="text-xl font-semibold tracking-tight text-white">Privacy & Data</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Control your data and privacy settings.</p>
          <div className="mt-5 grid auto-rows-fr items-stretch gap-4 md:grid-cols-2">
            {privacyRows.map(({ action, icon: Icon, note, title }) => (
              <button
                key={title}
                type="button"
                onClick={action}
                className="flex h-full items-center justify-between gap-4 rounded-[14px] border border-white/10 bg-white/6 p-4 text-left transition hover:bg-white/10"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0 text-blue-100" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{title}</span>
                    <span className="mt-1 block truncate text-xs text-slate-300">{note}</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const settingsRightPanel = (
    <div className="grid gap-5 xl:auto-rows-fr">
      <div className="h-full rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,34,0.96)_0%,rgba(7,14,28,0.98)_100%)] p-5 text-white shadow-[0_24px_58px_-40px_rgba(0,0,0,0.82)]">
        <h3 className="text-xl font-semibold tracking-tight text-white">Profile Preview</h3>
        <p className="mt-2 max-w-[18rem] text-sm leading-6 text-slate-300">
          This is how your profile appears across EazyBizy.
        </p>

        <div className="mt-5 rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,15,28,0.98)_0%,rgba(7,14,28,0.98)_100%)] p-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-[72px] w-[72px] rounded-[24px] border border-white/10 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.35)]">
                <AvatarImage src={avatarPreview ?? undefined} alt={displayName} className="object-cover" />
                <AvatarFallback className="rounded-[24px] bg-[linear-gradient(135deg,#1f2937_0%,#0f172a_100%)] text-xl font-semibold text-white">{initials}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#081120] bg-[#111827] text-slate-200">
                <Camera className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                <Sparkles className="h-3 w-3" />
                Business Learning Path
              </div>
              <h4 className="mt-3 text-xl font-semibold leading-tight text-white">{displayName}</h4>
              <p className="mt-1 text-sm font-medium text-slate-300">{resolvedProfileTagline}</p>
            </div>
          </div>

          <div className="mt-5 h-px bg-white/10" />

          <div className="mt-5 space-y-4">
              {[
                { icon: Mail, label: "Email", value: profileDraft.email || user?.email || "Not added" },
                { icon: BriefcaseBusiness, label: "Business Type", value: profileDraft.businessType || "Set your business identity" },
                { icon: User, label: "Role / Tagline", value: resolvedProfileTagline },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-slate-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-slate-400">{label}</span>
                    <span className="mt-0.5 block break-words text-sm font-medium leading-5 text-white">{value}</span>
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-5 flex w-full items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/6 px-4 py-4 text-left transition hover:bg-white/10"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/6 text-slate-200">
                  <LogOut className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">Logout</span>
                  <span className="mt-1 block text-xs text-slate-300">Sign out from your account</span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          </div>
        </div>

      <div className="h-full rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,34,0.96)_0%,rgba(7,14,28,0.98)_100%)] p-5 text-white shadow-[0_24px_58px_-40px_rgba(0,0,0,0.82)]">
        <h3 className="text-xl font-semibold tracking-tight text-white">Account Security</h3>
        <p className="mt-2 max-w-[18rem] text-sm leading-6 text-slate-300">
          Keep your account secure and manage access.
        </p>
        <div className="mt-5 space-y-3">
          {[
            { action: handleChangePassword, icon: KeyRound, label: "Change Password", note: "Update your password regularly" },
            { action: handleActiveSessions, icon: MonitorCheck, label: "Active Sessions", note: "Manage your logged-in devices" },
            { action: handleLogout, icon: LogOut, label: "Logout", note: "Sign out from your account" },
          ].map(({ action, icon: Icon, label, note }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-white/6 px-4 py-3 text-left transition hover:bg-white/10"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-blue-100" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{label}</span>
                  <span className="mt-1 block truncate text-xs text-slate-300">{note}</span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const pageHeaderMeta: Record<NavKey, { badge: string; description: string; pills: string[]; title: string }> = {
    dashboard: {
      badge: "Premium Learning Dashboard",
      description: "Track your momentum, review your activity, and keep your business learning moving with a cleaner premium dashboard.",
      pills: ["Focused learning path", `${progressCount} active tracks`, `${weeklyTotal}h learning this week`],
      title: `Hello ${firstName} \u{1F44B}`,
    },
    courses: {
      badge: "Course Library",
      description: "Review your active learning tracks, search the library faster, and continue the modules that are shaping your next business move.",
      pills: [`${visibleCourses.length} course matches`, `${progressCount} in progress`, spotlightCourse.badge],
      title: "Courses That Move You Forward",
    },
    paidCourses: {
      badge: "Premium Programs",
      description: "Explore your premium business finance and growth tracks in a dedicated page with sharper positioning and clearer upgrade paths.",
      pills: [hasPremium ? "Premium active" : "Locked premium library", `${visiblePaidCourses.length} premium programs`, `${learningHours}h learning momentum`],
      title: hasPremium ? "Your Premium Library" : "Unlock Premium Growth Programs",
    },
    settings: {
      badge: "Learner Control Center",
      description: "Manage your profile, browser reminders, premium email preferences, privacy, and account security from one cleaner settings page.",
      pills: [
        hasPremium ? "Premium active" : "Starter access",
        browserNotificationsEnabled ? "Browser reminders on" : "Browser reminders off",
        `Next schedule: ${learningCalendarSummary}`,
      ],
      title: "Settings & Profile Control",
    },
  };

  const activeHeaderMeta = pageHeaderMeta[active];

  const pageHeroSection = (
    <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,31,0.94),rgba(15,23,42,0.98))] p-4 shadow-[0_28px_70px_-42px_rgba(0,0,0,0.62)] sm:p-6 lg:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.12),transparent_30%)]" />
      <div className="relative">
        <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,430px)] xl:grid-rows-[auto_auto] xl:items-start">
          <div className="min-w-0 xl:col-start-1 xl:row-start-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-100 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.45)]">
              <Sparkles className="h-3.5 w-3.5" />
              {activeHeaderMeta.badge}
            </div>
          </div>

          <div className="order-3 w-full xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:order-none xl:justify-self-end">
            {renderHeaderUtilityPanel({
              searchInputClassName:
                "h-12 rounded-[18px] border-white/0 bg-white px-4 pl-12 text-[0.95rem] font-medium text-slate-950 placeholder:text-slate-500 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.42)] focus-visible:ring-[#7dd3fc] focus-visible:ring-offset-0",
              searchWrapperClassName: "sm:min-w-[248px]",
            })}
          </div>

          <div className="order-2 min-w-0 xl:col-start-1 xl:row-start-2 xl:order-none">
            <h2 className="mt-5 text-[1.9rem] font-semibold leading-[1.04] tracking-tight text-white sm:text-[2.35rem] xl:text-[2.9rem] 2xl:text-[3rem]">
              {activeHeaderMeta.title}
            </h2>
            <p className="mt-3 max-w-2xl text-[1rem] leading-7 text-slate-300">{activeHeaderMeta.description}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5 sm:gap-3">
          {activeHeaderMeta.pills.map((item) => (
            <div key={item} className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-medium text-slate-200 shadow-[0_10px_24px_-22px_rgba(0,0,0,0.42)] sm:px-5 sm:py-2.5 sm:text-sm">
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const dashboardGlassCard =
    "group rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,36,52,0.94)_0%,rgba(17,24,39,0.98)_100%)] shadow-[0_24px_54px_-42px_rgba(0,0,0,0.72)] sm:backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-300/20 hover:bg-[linear-gradient(180deg,rgba(31,41,59,0.94)_0%,rgba(17,24,39,0.97)_100%)]";
  const dashboardMetricCards = [
    {
      icon: BookOpen,
      label: "Active Courses",
      note: "In progress",
      value: `${progressCount}`,
    },
    {
      icon: Target,
      label: "Progress %",
      note: "Across tracks",
      value: `${averageProgress}%`,
    },
    {
      icon: Flame,
      label: "Weekly Streak",
      note: "Consistent days",
      value: `${weeklyStreakCount} day${weeklyStreakCount === 1 ? "" : "s"}`,
    },
    {
      icon: Clock3,
      label: "Learning Hours",
      note: "Tracked time",
      value: `${learningHours}h`,
    },
  ];
  const dashboardBottomStats = [
    {
      icon: Medal,
      label: "Certificates Earned",
      value: certificatesEarned,
    },
    {
      icon: Clock3,
      label: "Learning Hours",
      value: `${learningHours}h`,
    },
    {
      icon: ShieldCheck,
      label: "Consistency Score",
      value: `${consistencyScore}%`,
    },
  ];
  const donutStyle = {
    background: `conic-gradient(#38bdf8 0 ${averageProgress * 3.6}deg, rgba(255,255,255,0.08) ${averageProgress * 3.6}deg 360deg)`,
  };
  const weeklyPreviewMaxHours = Math.max(...weeklyLearningHours.slice(0, 6).map((item) => item.hours), 1);

  const renderMetricCard = ({
    icon: Icon,
    label,
    note,
    value,
  }: typeof dashboardMetricCards[number]) => {
    if (label === "Weekly Streak") {
      return (
        <article className="relative h-full min-h-[214px] overflow-hidden rounded-[24px] border border-[rgba(251,146,60,0.14)] bg-[linear-gradient(180deg,rgba(10,16,32,0.98)_0%,rgba(14,23,45,0.98)_52%,rgba(8,15,31,1)_100%)] p-4 text-white shadow-[0_22px_54px_-40px_rgba(0,0,0,0.92),0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.12),transparent_34%)]" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[23px] border border-white/6" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="pt-0.5">
                <p className="bg-[linear-gradient(135deg,#f59e0b_0%,#fbbf24_55%,#fde68a_100%)] bg-clip-text text-[9px] font-bold uppercase leading-[1.38] tracking-[0.3em] text-transparent">
                  WEEKLY
                  <br />
                  STREAK
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[rgba(251,146,60,0.28)] bg-[linear-gradient(180deg,rgba(40,49,79,0.9)_0%,rgba(21,29,54,0.96)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_0_22px_rgba(249,115,22,0.24)]">
                <Flame className="h-7 w-7 text-[#ffb326] drop-shadow-[0_0_12px_rgba(249,115,22,0.72)]" />
              </div>
            </div>

            <div className="mt-4">
              <p className="whitespace-nowrap text-[2.25rem] font-semibold leading-none tracking-tight text-white sm:text-[2.7rem]">
                {value}
              </p>
              <p className="mt-2 max-w-[12.5rem] text-[0.84rem] leading-5 text-slate-300">
                Keep it up! You&apos;re building great habits.
              </p>
            </div>

            <div className="mt-auto pt-3.5">
              <div className="flex items-center gap-0.5">
                {weeklyStreakDays.map((day, index) => {
                  const isComplete = weeklyStreakCompletion[index];
                  const nextIsComplete = weeklyStreakCompletion[index + 1];

                  return (
                    <Fragment key={day}>
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
                          isComplete
                            ? "border-[#ffb347] bg-[linear-gradient(135deg,#f59e0b_0%,#fb923c_55%,#facc15_100%)] shadow-[0_0_16px_rgba(249,115,22,0.36)]"
                            : "border-slate-500/70 bg-[rgba(30,41,59,0.7)] text-slate-400",
                        )}
                      >
                        {isComplete ? (
                          <svg viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-current stroke-[2.6]">
                            <path d="M3.5 8.2 6.6 11l5.9-6.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        )}
                      </span>
                      {index < weeklyStreakDays.length - 1 ? (
                        <span className="h-[2px] flex-1 rounded-full bg-[rgba(71,85,105,0.72)]">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              nextIsComplete
                                ? "bg-[linear-gradient(90deg,#f59e0b_0%,#fb923c_45%,#facc15_100%)] shadow-[0_0_10px_rgba(249,115,22,0.34)]"
                                : "bg-transparent",
                            )}
                          />
                        </span>
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-1">
                {weeklyStreakDays.map((day, index) => (
                  <span
                    key={day}
                    className={cn(
                      "text-center text-[8px] font-semibold uppercase tracking-[0.08em]",
                      weeklyStreakCompletion[index] ? "text-[#fbbf24]" : "text-slate-500",
                    )}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>
      );
    }

    return (
      <article className={cn(dashboardGlassCard, "flex h-full min-h-[214px] flex-col p-5")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-white">{value}</p>
            <p className="mt-3 text-sm text-slate-400">{note}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(30,64,175,0.34),rgba(29,78,216,0.22))] text-blue-100">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </article>
    );
  };

  const dashboardRedesignSection = (
    <section ref={dashboardRef} className="space-y-5">
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(17,24,39,0.96)_100%)] p-4 text-white shadow-[0_30px_80px_-54px_rgba(0,0,0,0.78)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.08),transparent_34%)]" />
        <div className="relative flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,430px)] xl:grid-rows-[auto_auto] xl:items-start">
          <div className="flex flex-wrap items-center gap-3 xl:col-start-1 xl:row-start-1">
            <Button
              asChild
              variant="ghost"
              className="h-10 rounded-full border border-white/12 bg-white/8 px-4 text-sm font-semibold text-slate-100 hover:bg-white/12 hover:text-white"
            >
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Back to EazyBizy
              </Link>
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-100">
              <Sparkles className="h-3.5 w-3.5" />
              Premium Learning Dashboard
            </div>
          </div>

          <div className="order-3 w-full xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:order-none xl:justify-self-end">
            {renderHeaderUtilityPanel({
              searchInputClassName:
                "h-12 rounded-[18px] border-white/0 bg-white px-4 pl-12 text-[0.95rem] font-medium text-slate-950 placeholder:text-slate-500 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.42)] focus-visible:ring-[#7dd3fc] focus-visible:ring-offset-0",
              searchWrapperClassName: "sm:min-w-[248px]",
            })}
          </div>

          <div className="order-2 xl:col-start-1 xl:row-start-2 xl:order-none">
            <h2 className="mt-4 text-[1.9rem] font-semibold leading-[1.04] tracking-tight sm:text-[2.3rem] lg:text-[2.65rem]">
              Hello {firstName} {"\u{1F44B}"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Stay focused on your fintech learning plan, track your progress, and keep every module moving forward.
            </p>
          </div>
        </div>
      </div>

      <div className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetricCards.map((metric) => (
          <div key={metric.label} className="h-full">{renderMetricCard(metric)}</div>
        ))}
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[1fr_1.1fr]">
        <div className={cn(dashboardGlassCard, "h-full p-5 sm:p-6")}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Learning Progress</p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">Overall module completion</h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-blue-100">
              {averageProgress}%
            </div>
          </div>

          <div className="mt-7 grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center xl:grid-cols-1 2xl:grid-cols-[180px_minmax(0,1fr)]">
            <div className="mx-auto flex h-[148px] w-[148px] items-center justify-center rounded-full p-4 shadow-[0_0_50px_rgba(37,99,235,0.18)] sm:h-[172px] sm:w-[172px]" style={donutStyle}>
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-white/10 bg-[#0b1220]">
                <span className="text-[2.25rem] font-semibold leading-none text-white">{averageProgress}%</span>
                <span className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Complete</span>
              </div>
            </div>
            <div className="space-y-4">
              {liveCourseCards.slice(0, 4).map((course) => (
                <div key={course.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-200">{course.title}</span>
                    <span className="font-semibold text-white">{course.progress}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/8">
                    <div className={`h-full rounded-full bg-gradient-to-r ${course.accent}`} style={{ width: `${course.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={cn(dashboardGlassCard, "h-full p-5 sm:p-6")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Weekly Learning Hours</p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">Focused learning rhythm</h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-blue-100">
              {weeklyTotal}h this week
            </div>
          </div>
          <div className="mt-6 h-[240px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyLearningHours}>
                <defs>
                  <linearGradient id="darkWeeklyHoursBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="55%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(148,163,184,0.7)", fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: "rgba(59,130,246,0.12)" }}
                  contentStyle={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(11,18,32,0.96)", color: "#fff" }}
                  formatter={(value: number) => [`${value}h`, "Learning time"]}
                />
                <Bar dataKey="hours" fill="url(#darkWeeklyHoursBar)" isAnimationActive={false} radius={[14, 14, 5, 5]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-3">
        {dashboardBottomStats.map(({ icon: Icon, label, value }) => (
          <div key={label} className={cn(dashboardGlassCard, "flex min-h-[128px] items-center justify-between gap-4 p-5")}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
              <p className="mt-3 text-[2rem] font-semibold leading-none text-white">{value}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-blue-100">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#172554_48%,#1d4ed8_100%)] p-6 text-white shadow-[0_30px_70px_-44px_rgba(37,99,235,0.46)] sm:p-7">
        <div className="pointer-events-none absolute -right-8 bottom-0 h-40 w-40 rounded-full border border-white/16 bg-white/10" />
        <div className="pointer-events-none absolute right-16 top-5 h-24 w-24 rounded-[32px] border border-white/12 bg-white/10 rotate-12" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/72">Momentum banner</p>
            <h3 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-[2rem]">Stay consistent, stay ahead!</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78">
              Keep your weekly rhythm strong with focused modules, smart reminders, and practical fintech learning goals.
            </p>
            <Button
              type="button"
              onClick={handleContinueLearning}
              className="mt-5 h-12 rounded-2xl border border-white/16 bg-white px-6 font-semibold text-[#111827] shadow-[0_18px_34px_-24px_rgba(15,23,42,0.5)] hover:bg-white/92"
            >
              Continue Learning
            </Button>
          </div>
          <div className="hidden lg:block">
            <div className="relative mx-auto h-40 w-40 rounded-[36px] border border-white/16 bg-white/12 p-4 backdrop-blur-md">
              <div className="absolute -left-4 top-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#1d4ed8] shadow-[0_20px_34px_-22px_rgba(0,0,0,0.52)]">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div className="absolute right-4 top-4 h-12 w-12 rounded-full bg-white/18" />
              <div className="absolute bottom-5 left-7 right-7 h-3 rounded-full bg-white/28" />
              <div className="absolute bottom-10 left-10 right-10 h-3 rounded-full bg-white/18" />
              <div className="absolute bottom-16 left-14 right-14 h-3 rounded-full bg-white/12" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const dashboardSummarySection = (
    <section ref={dashboardRef} className={cn(dashboardShell, "rounded-[34px] p-5 sm:p-6", active === "dashboard" && "ring-2 ring-[#cdd7ff]")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Dashboard Snapshot</p>
          <h3 className="mt-3 text-[1.7rem] font-semibold tracking-tight text-slate-950 sm:text-[2rem] lg:text-[2.3rem]">Your learning performance at a glance</h3>
        </div>
        <div className="inline-flex rounded-full border border-[#dce4ff] bg-[#f5f8ff] px-4 py-2 text-sm font-medium text-[#3151be]">
          Refreshed for {weeklyFocusLabel}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-[1.02fr_0.92fr_0.96fr]">
        <div className="rounded-[28px] bg-[linear-gradient(145deg,#2d2d31_0%,#1c1c22_100%)] p-6 text-white shadow-[0_30px_60px_-40px_rgba(0,0,0,0.8)]">
          <p className="text-[0.92rem] font-medium text-white/92">Courses in progress</p>
          <h3 className="mt-5 text-[2rem] font-semibold tracking-tight">{progressCount ? `${progressCount} active course${progressCount > 1 ? "s" : ""}` : "No active courses yet"}</h3>
          <p className="mt-3 text-sm leading-7 text-white/62">{progressCount ? "Continue where you left off and keep your learning momentum high." : "Browse your learning library and start building your next milestone."}</p>
          <Button type="button" onClick={handleContinueLearning} className="mt-6 h-12 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#42508d_0%,#2d3c76_100%)] px-6 text-white hover:brightness-110">
            Browse courses
          </Button>
        </div>

        <div className="rounded-[28px] border border-[#eef0f7] bg-white/90 p-6 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.32)]">
          <p className="text-[0.92rem] font-medium text-slate-700">{overviewCards[0]?.title ?? "Courses in progress"}</p>
          <p className="mt-3 text-[2.5rem] font-semibold leading-none tracking-tight text-[#15192c] sm:text-[3rem]">{overviewCards[0]?.value ?? progressCount}</p>
          <p className="mt-4 text-sm leading-8 text-slate-600">{overviewCards[0]?.note ?? "Steady momentum across your active business tracks"}</p>
          <div className="mt-6 h-2 rounded-full bg-[#d9dbe8]">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#7c3aed_0%,#5b6bff_52%,#5eead4_100%)]" style={{ width: `${overviewCards[0]?.progress ?? 72}%` }} />
          </div>
        </div>

        <div className="rounded-[28px] border border-[#eef0f7] bg-white/90 p-6 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.32)]">
          <p className="text-[0.92rem] font-medium text-slate-700">Weekly focus</p>
          <p className="mt-3 text-[1.7rem] font-semibold tracking-tight text-[#15192c]">{weeklyFocusLabel}</p>
          <div className="mt-6">
            <div className="grid grid-cols-6 items-end gap-2 sm:gap-3">
              {weeklyLearningHours.slice(0, 6).map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-[10px] bg-[linear-gradient(180deg,#7c3aed_0%,#5d8cff_100%)] shadow-[0_14px_24px_-18px_rgba(109,40,217,0.8)]"
                    style={{ height: `${38 + (item.hours / weeklyPreviewMaxHours) * 72}px` }}
                  />
                  <span className="text-xs font-medium text-slate-500">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const dashboardInsightsSection = (
    <section className={cn(dashboardShell, "rounded-[34px] p-5 sm:p-6")}>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {overviewCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title}>
                <div className={cn(innerCard, "h-full p-5")}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{card.title}</p>
                      <p className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950">{card.value}</p>
                    </div>
                    <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", card.iconClass)}>
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{card.note}</p>
                  <div className="mt-5 h-2 rounded-full bg-slate-200/80">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#1539b6_0%,#6d28d9_55%,#38bdf8_100%)]" style={{ width: `${card.progress}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={cn(innerCard, "p-5 sm:p-6")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Weekly Hours</p>
              <h3 className="mt-3 text-[1.85rem] font-semibold tracking-tight text-slate-950">Consistent learning rhythm</h3>
            </div>
            <div className="rounded-full bg-[#eef3ff] px-3 py-1.5 text-sm font-medium text-[#3151be]">{weeklyTotal}h total</div>
          </div>

          <div className="mt-6 h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyLearningHours}>
                <defs>
                  <linearGradient id="weeklyHoursBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(148,163,184,0.26)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: "rgba(59,130,246,0.08)" }}
                  contentStyle={{ borderRadius: 18, border: "1px solid rgba(226,232,240,0.95)", backgroundColor: "rgba(255,255,255,0.98)", color: "#0f172a" }}
                  formatter={(value: number) => [`${value}h`, "Learning time"]}
                />
                <Bar dataKey="hours" fill="url(#weeklyHoursBar)" isAnimationActive={false} radius={[12, 12, 4, 4]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );

  const coursesSpotlightSection = (
    <section ref={coursesRef} className={cn("rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(34,35,46,0.97),rgba(22,23,33,0.99))] p-5 text-white shadow-[0_30px_70px_-34px_rgba(0,0,0,0.78)] sm:p-6", active === "courses" && "ring-2 ring-white/16")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/58">Course Spotlight</p>
          <h3 className="mt-4 text-[1.15rem] font-medium tracking-[0.02em] text-white/92">Continue learning with your current tracks</h3>
        </div>
        <div className="hidden rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/72 lg:inline-flex">
          {visibleCourses.length} active cards
        </div>
      </div>

      <div className="mt-6 grid items-stretch gap-0 xl:grid-cols-2 xl:auto-rows-fr">
        {[spotlightCourse, secondaryCourse].map((course, index) => {
          const Icon = course.icon;
          const accentBar = index === 0
            ? "bg-[linear-gradient(90deg,#8b5cf6_0%,#7c3aed_55%,#a78bfa_100%)]"
            : "bg-[linear-gradient(90deg,#5eead4_0%,#2dd4bf_52%,#34d399_100%)]";
          const buttonClass = index === 0
            ? "bg-[linear-gradient(180deg,#2f3155_0%,#23253f_100%)] text-white hover:brightness-110"
            : "bg-[linear-gradient(180deg,#246b66_0%,#1d5b57_100%)] text-white hover:brightness-110";

          return (
            <div key={course.id} className={cn("flex h-full flex-col px-0 py-0 xl:px-6 2xl:px-8", index === 0 ? "xl:border-r xl:border-white/10 xl:pr-6 2xl:pr-8" : "pt-8 xl:pt-0 xl:pl-6 2xl:pl-8")}>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white">
                  <Icon className={cn("h-6 w-6", index === 0 ? "text-[#6d28d9]" : "text-[#0f766e]")} />
                </div>
                <div>
                  <h4 className="text-[1.6rem] font-semibold leading-tight tracking-tight text-white sm:text-[2rem]">{course.title}</h4>
                  <p className="mt-2 text-[1.05rem] text-white/62">{course.duration} &middot; {course.progress}% complete</p>
                </div>
              </div>

              <div className="mt-6 flex flex-1 flex-col">
                <div className="h-2 rounded-full bg-white/10">
                  <div className={cn("h-full rounded-full", accentBar)} style={{ width: `${course.progress}%` }} />
                </div>

                <div className="mt-5 flex items-center justify-between text-[0.95rem] text-white/70">
                  <span>Progress</span>
                  <span className="text-[2rem] font-semibold leading-none text-white">{course.progress}%</span>
                </div>

                <Button type="button" onClick={handleContinueLearning} className={cn("mt-auto h-12 w-full rounded-2xl border border-white/10 px-6 text-[1.05rem]", buttonClass)}>
                  Continue learning
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  const courseOverviewMetrics = [
    {
      actionClass: "border-[#1f4d58] text-[#67e8d3] hover:text-white",
      cardClass: "border-[#245e67] bg-[linear-gradient(180deg,rgba(8,26,38,0.98)_0%,rgba(5,19,30,0.98)_100%)]",
      icon: BookOpen,
      iconClass: "border border-white/10 bg-white/8 text-[#67e8d3]",
      label: "Active Courses",
      value: `${progressCount}`,
    },
    {
      actionClass: "border-[#303b72] text-[#ab9cff] hover:text-white",
      cardClass: "border-[#4453a3] bg-[linear-gradient(180deg,rgba(18,24,54,0.98)_0%,rgba(11,17,40,0.98)_100%)]",
      icon: GraduationCap,
      iconClass: "border border-white/10 bg-white/8 text-[#ab9cff]",
      label: "Weekly Streak",
      value: `${weeklyStreakCount}d`,
    },
    {
      actionClass: "border-[#5f4224] text-[#ffbe64] hover:text-white",
      cardClass: "border-[#8d6738] bg-[linear-gradient(180deg,rgba(41,23,7,0.98)_0%,rgba(25,15,7,0.98)_100%)]",
      icon: Target,
      iconClass: "border border-white/10 bg-white/8 text-[#ffbe64]",
      label: "Progress",
      value: `${averageProgress}%`,
    },
    {
      actionClass: "border-[#204968] text-[#79cbff] hover:text-white",
      cardClass: "border-[#2d6a96] bg-[linear-gradient(180deg,rgba(7,24,43,0.98)_0%,rgba(6,19,33,0.98)_100%)]",
      icon: Medal,
      iconClass: "border border-white/10 bg-white/8 text-[#79cbff]",
      label: "Certificates",
      value: certificatesEarned,
    },
  ];

  const courseLibrarySection = (
    <section ref={coursesRef} className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#091121_0%,#0c1730_56%,#081120_100%)] p-4 text-white shadow-[0_30px_80px_-48px_rgba(0,0,0,0.82)] sm:p-5 lg:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.14),transparent_34%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:auto,auto,48px_48px,48px_48px]" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="inline-flex rounded-full border border-white/10 bg-white/8 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-100 shadow-[0_12px_28px_-24px_rgba(37,99,235,0.38)]">
            EazyBizy Course Library
          </p>
          <h2 className="mt-4 text-[1.75rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.1rem] lg:text-[2.45rem]">
            Continue your fintech learning path
          </h2>
          <p className="mt-3 max-w-2xl text-[0.98rem] leading-7 text-slate-300">
            Four focused EazyBizy courses to sharpen strategy, finance, funding readiness, and customer growth.
          </p>
        </div>
        <div className="w-full rounded-[18px] border border-white/10 bg-white/8 p-4 shadow-[0_18px_38px_-30px_rgba(0,0,0,0.72)] backdrop-blur-xl xl:max-w-[340px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-100">Search flow</p>
          <p className="mt-2 text-sm font-semibold text-white">Use the top-right search to filter this library</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            Search once from the top-right and EazyBizy will filter courses here while also showing a quick guide message.
          </p>
        </div>
      </div>

      <div className="relative mt-7">
        <h3 className="text-[1.55rem] font-semibold tracking-tight text-white">Course Overview</h3>
        <div className="mt-4 grid auto-rows-fr items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
          {courseOverviewMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article key={metric.label} className={cn("group relative flex h-full flex-col overflow-hidden rounded-[18px] border shadow-[0_18px_44px_-34px_rgba(15,23,42,0.24)] transition duration-300 hover:-translate-y-1", metric.cardClass)}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-12 opacity-20 [background-image:repeating-radial-gradient(circle_at_8px_8px,rgba(255,255,255,0.55)_0_1px,transparent_1px_18px)]" />
                <div className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full border border-white/12 opacity-60" />
                <div className="pointer-events-none absolute -bottom-5 right-4 h-16 w-16 rounded-full border border-white/12 opacity-60" />

                <div className="relative flex items-center gap-4 px-5 py-5">
                  <span className={cn("flex h-12 w-12 items-center justify-center rounded-[14px] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)]", metric.iconClass)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[1.55rem] font-semibold leading-none tracking-tight text-white">{metric.value}</p>
                    <p className="mt-2 text-sm font-medium text-slate-300">{metric.label}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinueLearning}
                  className={cn("relative mt-auto flex w-full items-center justify-between border-t px-5 py-3 text-sm font-semibold transition group-hover:bg-white/8", metric.actionClass)}
                >
                  <span>See Details</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <div className="relative mt-6 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.82)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[1.35rem] font-semibold tracking-tight text-white">Recent Enrolled Course ({liveCourseCards.length})</h3>
            <p className="mt-1 text-sm text-slate-300">Pick up your EazyBizy learning modules where you left off.</p>
          </div>
          <button type="button" onClick={handleContinueLearning} className="inline-flex items-center justify-center rounded-[12px] border border-[#3b82f6]/30 bg-[linear-gradient(135deg,#1d4ed8_0%,#315cf7_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(37,99,235,0.7)] transition hover:-translate-y-0.5 hover:brightness-110">
            View All
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {visibleCourses.length > 0 ? (
            visibleCourses.slice(0, 4).map((course) => {
              const Icon = course.icon;
              return (
                <article key={course.id} className="group flex min-h-[328px] flex-col rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,34,0.96)_0%,rgba(7,14,28,0.98)_100%)] p-5 shadow-[0_24px_58px_-40px_rgba(0,0,0,0.82)] transition duration-300 hover:-translate-y-1 hover:border-[#3b82f6]/28 hover:shadow-[0_30px_70px_-42px_rgba(37,99,235,0.34)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.16)_0%,rgba(99,102,241,0.16)_100%)] text-[#9db7ff] shadow-[0_16px_30px_-24px_rgba(59,130,246,0.48)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">{course.badge}</p>
                        <p className="mt-1 text-xs font-medium text-slate-400">EazyBizy Learning</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-[#3151be]/40 bg-[#122447] px-3 py-1.5 text-sm font-semibold text-[#c6d4ff]">
                      {course.progress}%
                    </span>
                  </div>

                  <h3 className="mt-5 text-[1.45rem] font-semibold leading-tight tracking-tight text-white">{course.title}</h3>
                  <p className="mt-3 text-[0.96rem] leading-7 text-slate-300">{course.description}</p>

                  <div className="mt-auto pt-5">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-300">
                      <span>Progress</span>
                      <span>{course.progress}% complete</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full bg-gradient-to-r ${course.accent} shadow-[0_10px_18px_-12px_rgba(91,95,244,0.82)]`} style={{ width: `${course.progress}%` }} />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-200">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                        <Clock3 className="h-3.5 w-3.5 text-[#9db7ff]" />
                        {course.duration}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-[#9db7ff]" />
                        {course.lessonsLeft} left
                      </span>
                    </div>

                    <Button type="button" onClick={handleContinueLearning} className="mt-5 h-12 w-full rounded-[16px] border border-[#3b82f6]/30 bg-[linear-gradient(135deg,#15308a_0%,#1d4ed8_55%,#3b82f6_100%)] font-semibold text-white shadow-[0_20px_38px_-26px_rgba(37,99,235,0.72)] transition hover:-translate-y-0.5 hover:brightness-105">
                      Continue Learning
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,34,0.96)_0%,rgba(7,14,28,0.98)_100%)] p-8 text-center shadow-[0_24px_58px_-40px_rgba(0,0,0,0.82)] lg:col-span-2">
              <p className="text-[1.15rem] font-semibold text-white">No course matches your current search.</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">Try a broader keyword to bring your current course cards back into view.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const premiumHighlightsSection = (
    <section ref={premiumRef} className="grid items-stretch gap-5 xl:grid-cols-[1.06fr_0.94fr] 2xl:grid-cols-[1.08fr_0.92fr]">
      <div className="flex h-full flex-col rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(37,38,50,0.96),rgba(24,25,34,0.98))] p-5 text-white shadow-[0_30px_70px_-34px_rgba(0,0,0,0.78)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/58">Premium Learning Programs</p>
            <div className="mt-6 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white">
                <Award className="h-6 w-6 text-[#3f4fe0]" />
              </div>
              <div>
                <h3 className="text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-[2.1rem]">{hasPremium ? visiblePaidCourses[0]?.title ?? paidCourseCards[0]?.title ?? "Premium programs" : "Premium programs waiting to unlock"}</h3>
                <p className="mt-2 text-[1.05rem] text-white/62">{hasPremium ? "Premium access is active. Open your advanced learning programs now." : "Your premium page is ready with advanced finance, negotiation, and scale systems."}</p>
              </div>
            </div>
          </div>
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/82">{weeklyTotal} total</div>
        </div>
        <div className="mt-auto pt-6">
          <div className="rounded-[20px] border border-white/10 bg-white/4 px-5 py-5">
          <Button type="button" onClick={handlePremiumClick} className="h-12 rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] px-7 text-white hover:brightness-105">
            {hasPremium ? "Open premium courses" : "Browse premium tracks"}
          </Button>
          </div>
        </div>
      </div>

      <div className="flex h-full flex-col rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(35,35,50,0.98),rgba(27,27,39,0.98))] p-5 text-white shadow-[0_30px_70px_-34px_rgba(0,0,0,0.78)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">Premium Learning Hours</p>
            <div className="mt-5 flex items-center gap-3">
              <span className="text-[2.4rem] font-semibold leading-none tracking-tight sm:text-[3rem]">{learningHours}h</span>
              <span className="rounded-full bg-white/12 px-3 py-1 text-lg font-medium text-white/82">+35%</span>
            </div>
          </div>
        </div>
        <div className="mt-6 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceGrowth}>
              <defs>
                <linearGradient id="performanceLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(19,23,36,0.96)", color: "#fff" }} formatter={(value: number) => [`${value}%`, "Performance"]} />
              <Line type="monotone" dataKey="score" isAnimationActive={false} stroke="url(#performanceLine)" strokeWidth={4} dot={{ fill: "#d8b4fe", stroke: "#312e81", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );

  const premiumProgramsSection = (
    <section className={cn(dashboardShell, "rounded-[34px] p-5 sm:p-6")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Premium Catalog</p>
          <h3 className="mt-3 text-[1.95rem] font-semibold tracking-tight text-slate-950 sm:text-[2.3rem]">Curated advanced programs for finance, growth, and scale</h3>
          <p className="mt-3 max-w-2xl text-[0.98rem] leading-7 text-slate-600">This page uses the same search box, so your premium catalog updates instantly without changing the underlying unlock flow.</p>
        </div>
        <Button type="button" onClick={() => (hasPremium ? handlePremiumClick() : setUpgradeOpen(true))} className={primaryButton}>
          {hasPremium ? "Open premium path" : "Unlock premium"}
        </Button>
      </div>

      <div className="mt-6 grid auto-rows-fr items-stretch gap-4 xl:grid-cols-2">
        {visiblePaidCourses.length > 0 ? (
          visiblePaidCourses.map((course) => {
            const Icon = course.icon;
            return (
              <div key={course.id} className="h-full">
                <div className="h-full overflow-hidden rounded-[30px] border border-[#dbe4ff] bg-[linear-gradient(145deg,#0f172a_0%,#172554_52%,#1d4ed8_100%)] p-5 text-white shadow-[0_28px_60px_-36px_rgba(15,23,42,0.52)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white text-[#2844bf]">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
                            {course.lessons}
                          </span>
                          {!hasPremium ? (
                            <span className="rounded-full border border-white/18 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
                              Locked
                            </span>
                          ) : null}
                        </div>
                        <h4 className="mt-3 text-[1.45rem] font-semibold tracking-tight text-white">{course.title}</h4>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90">{course.outcome}</span>
                  </div>

                  <p className="mt-4 text-[0.98rem] leading-7 text-white/78">{course.description}</p>

                  <div className="mt-5 rounded-[22px] border border-white/12 bg-white/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/68">Program Outcome</p>
                    <p className="mt-2 text-[1rem] font-medium text-white">{course.outcome}</p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => (hasPremium ? handlePremiumClick() : setUpgradeOpen(true))}
                    className="mt-6 h-11 w-full rounded-2xl border border-white/18 bg-white px-5 text-[#1d3fae] shadow-[0_18px_34px_-26px_rgba(15,23,42,0.48)] hover:bg-[#f8fbff]"
                  >
                    {hasPremium ? "Open Program" : "Unlock Program"}
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className={cn(innerCard, "xl:col-span-2 p-6 text-center")}>
            <p className="text-[1.15rem] font-semibold text-slate-950">No premium program matches your current search.</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">Adjust the search phrase to reveal your finance, negotiation, and scale tracks again.</p>
          </div>
        )}
      </div>
    </section>
  );

  const premiumPromoCard = (
    <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(30,64,175,0.46)_0%,rgba(49,46,129,0.5)_45%,rgba(15,23,42,0.98)_100%)] p-5 text-white shadow-[0_28px_70px_-34px_rgba(37,99,235,0.52)] sm:backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,219,254,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(129,140,248,0.22),transparent_40%)]" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/90">
          <Crown className="h-3.5 w-3.5" />
          Premium
        </div>
        <h3 className="mt-5 text-[1.45rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.62rem]">
          {hasPremium ? "Your premium path is ready" : "Unlock premium business learning"}
        </h3>
        <p className="mt-3 text-sm leading-7 text-white/72">
          {hasPremium
            ? "Open your advanced finance, growth, and negotiation programs with one tap."
            : "Access high-conviction business finance programs, founder playbooks, and premium course experiences."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {[hasPremium ? "Premium active" : "Locked badge", `${paidCourseCards.length} programs`, `${learningHours}h tracked`].map((item) => (
            <span key={item} className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/78">
              {item}
            </span>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => (hasPremium ? handlePremiumClick() : setUpgradeOpen(true))}
          className="mt-6 h-12 w-full rounded-2xl border border-white/15 bg-white px-5 font-semibold text-[#0f172a] shadow-[0_20px_36px_-24px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5 hover:bg-white/95 active:scale-[0.99]"
        >
          {hasPremium ? "Open Premium" : "Go Premium"}
        </Button>
      </div>
    </section>
  );

  const profileSummaryCard = (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94)_0%,rgba(17,24,39,0.97)_100%)] p-5 text-white shadow-[0_24px_56px_-42px_rgba(0,0,0,0.84)] sm:backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.08),transparent_34%)]" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 rounded-2xl border border-white/10">
            <AvatarImage src={avatarPreview ?? undefined} alt={displayName} className="object-cover" />
            <AvatarFallback className="rounded-2xl bg-[linear-gradient(135deg,#1539b6_0%,#1d4ed8_100%)] text-sm font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[1rem] font-semibold text-white">{displayName}</p>
            <p className="mt-1 truncate text-sm text-slate-300">{resolvedProfileTagline}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Business Type</p>
            <p className="mt-2 text-sm font-medium text-white">{profileDraft.businessType || "Business Learning Path"}</p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Next Learning Slot</p>
            <p className="mt-2 text-sm font-medium text-white">{learningCalendarSummary}</p>
          </div>
        </div>

        <Button
          type="button"
          onClick={openProfilePanel}
          className="mt-5 h-11 w-full rounded-2xl border border-white/10 bg-white/8 text-white transition hover:-translate-y-0.5 hover:bg-white/12 active:scale-[0.99]"
        >
          Open Profile
        </Button>
      </div>
    </section>
  );

  const sidebarPremiumCard = (
    <button
      type="button"
      onClick={() => (hasPremium ? handlePremiumClick() : setUpgradeOpen(true))}
      className="relative w-full max-w-[320px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(29,78,216,0.32)_0%,rgba(67,56,202,0.32)_44%,rgba(15,23,42,0.98)_100%)] p-[18px] text-left text-white shadow-[0_24px_56px_-38px_rgba(37,99,235,0.44)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_64px_-38px_rgba(37,99,235,0.52)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,219,254,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(129,140,248,0.18),transparent_36%)]" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/88">
          <Crown className="h-3.5 w-3.5" />
          Premium
        </div>
        <h3 className="mt-4 text-[1.02rem] font-semibold leading-[1.18] tracking-tight text-white">
          {hasPremium ? "Open your premium business programs" : "Unlock paid business growth programs"}
        </h3>
        <p className="mt-2.5 text-[13px] leading-6 text-white/70">
          {hasPremium
            ? "Continue advanced finance, growth, and negotiation tracks."
            : "Premium courses turn insight into practical business momentum."}
        </p>
      </div>
    </button>
  );

  const sharedIntroCard = active === "settings" ? null : (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,28,0.98)_0%,rgba(15,23,42,0.95)_100%)] p-5 text-white shadow-[0_32px_80px_-48px_rgba(0,0,0,0.88)] sm:backdrop-blur-2xl sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(129,140,248,0.18),transparent_34%)]" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-100">
          <Sparkles className="h-3.5 w-3.5" />
          {activeHeaderMeta.badge}
        </div>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-[1.95rem] font-semibold leading-[1.02] tracking-tight text-white sm:text-[2.45rem] lg:text-[3rem]">
              {activeHeaderMeta.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
              {activeHeaderMeta.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeHeaderMeta.pills.map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-medium text-slate-200 shadow-[0_16px_28px_-22px_rgba(0,0,0,0.45)] sm:text-sm">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const renderLearningCourseCard = (course: typeof courseCards[number]) => {
    const Icon = course.icon;

    return (
      <button
        key={course.id}
        type="button"
        onClick={handleContinueLearning}
        className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(17,24,39,0.94)_100%)] p-5 text-left text-white shadow-[0_24px_60px_-40px_rgba(0,0,0,0.88)] transition duration-300 hover:-translate-y-1.5 hover:border-blue-300/20 hover:shadow-[0_30px_80px_-42px_rgba(37,99,235,0.34)] active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.22),rgba(99,102,241,0.2))] text-blue-100 shadow-[0_18px_34px_-28px_rgba(37,99,235,0.44)]">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/80">{course.badge}</p>
              <p className="mt-1 text-xs text-slate-400">EazyBizy Learning</p>
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/90">
            {course.progress}%
          </span>
        </div>

        <h3 className="mt-5 text-[1.4rem] font-semibold leading-tight tracking-tight text-white">
          {course.title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {course.description}
        </p>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Completion</span>
            <span>{course.progress}% complete</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full bg-gradient-to-r ${course.accent}`} style={{ width: `${course.progress}%` }} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-200">
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5">{course.duration}</span>
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5">{course.lessonsLeft}</span>
        </div>

        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-100 transition group-hover:translate-x-1">
          Continue learning
          <ArrowRight className="h-4 w-4" />
        </span>
      </button>
    );
  };

  const renderPremiumProgramCard = (course: typeof paidCourseCards[number]) => {
    const Icon = course.icon;

    return (
      <button
        key={course.id}
        type="button"
        onClick={() => (hasPremium ? handlePremiumClick() : setUpgradeOpen(true))}
        className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.94)_0%,rgba(30,41,59,0.96)_52%,rgba(29,78,216,0.22)_100%)] p-5 text-left text-white shadow-[0_26px_64px_-40px_rgba(0,0,0,0.88)] transition duration-300 hover:-translate-y-1.5 hover:border-indigo-300/24 hover:shadow-[0_30px_84px_-42px_rgba(99,102,241,0.36)] active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white text-[#3151be] shadow-[0_18px_32px_-24px_rgba(255,255,255,0.28)]">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/82">
                  {course.lessons}
                </span>
                {!hasPremium ? (
                  <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/82">
                    Locked
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 text-[1.35rem] font-semibold leading-tight tracking-tight text-white">
                {course.title}
              </h3>
            </div>
          </div>
          <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/88">
            {course.outcome}
          </span>
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-300">
          {course.description}
        </p>

        <div className="mt-5 rounded-[22px] border border-white/10 bg-white/8 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/62">Outcome</p>
          <p className="mt-2 text-sm font-medium text-white">{course.outcome}</p>
        </div>

        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-100 transition group-hover:translate-x-1">
          {hasPremium ? "Open Program" : "Unlock Program"}
          <ArrowRight className="h-4 w-4" />
        </span>
      </button>
    );
  };

  const dashboardContent = (
    <div className="space-y-6">
      {dashboardRedesignSection}
      <div className="xl:hidden">{sidebarPremiumCard}</div>
      <div className="xl:hidden">{calendarCard}</div>
    </div>
  );

  const coursesContent = (
    <div className="space-y-6">
      {pageHeroSection}
      {coursesSpotlightSection}
      {courseLibrarySection}
    </div>
  );

  const premiumInsightCards = [
    { label: "Programs", value: `${paidCourseCards.length}`, note: "Advanced premium tracks" },
    { label: "Outcome", value: hasPremium ? "Unlocked" : "Locked", note: "Access status" },
    { label: "Momentum", value: `${learningHours}h`, note: "Learning time tracked" },
  ];

  const premiumContent = (
    <div className="space-y-6">
      {pageHeroSection}
      {premiumHighlightsSection}
      {premiumProgramsSection}
    </div>
  );

  const settingsContent = (
    <div className="space-y-6">
      {settingsSection}
      <div className="xl:hidden">{settingsRightPanel}</div>
    </div>
  );

  const desktopAsideContent = active === "settings" ? (
    settingsRightPanel
  ) : active === "dashboard" ? (
    <div className="space-y-6">
      {calendarCard}
    </div>
  ) : (
    <div className="space-y-6">
      {active === "paidCourses" ? null : premiumPromoCard}
      {profileSummaryCard}
    </div>
  );

  const activeContent =
    active === "dashboard"
      ? dashboardContent
      : active === "courses"
        ? coursesContent
        : active === "paidCourses"
          ? premiumContent
          : settingsContent;
  const useFullWidthCoursesLayout = active === "courses";

  if (redirectTarget) {
    return <Navigate to={redirectTarget} replace />;
  }

  return (
    <div
      className="relative min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#020617_0%,#081120_48%,#020617_100%)] text-white"
      style={{ fontFamily: "Inter, 'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#020617_0%,#081120_48%,#020617_100%)]" />
        <div className="absolute left-[4%] top-[4%] hidden h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.22),transparent_66%)] blur-3xl sm:block" />
        <div className="absolute right-[8%] top-[10%] hidden h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.18),transparent_66%)] blur-3xl sm:block" />
        <div className="absolute bottom-[8%] left-[30%] hidden h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.14),transparent_70%)] blur-3xl sm:block" />
        <div className="absolute inset-0 opacity-[0.24] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelection} />
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[rgba(2,6,23,0.94)] sm:bg-[rgba(2,6,23,0.78)] sm:backdrop-blur-2xl xl:hidden">
        <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white transition hover:bg-white/12 active:scale-[0.97]"
              aria-label="Open learning menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[16px] bg-white shadow-[0_18px_34px_-22px_rgba(148,163,184,0.75)] ring-1 ring-slate-200/90">
                <img src="/logo.png" alt="EazyBizy logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.34em] text-slate-400">Learning</p>
                <p className="text-lg font-semibold tracking-tight text-white">EazyBizy</p>
              </div>
            </Link>
          </div>

          <button
            type="button"
            onClick={openProfilePanel}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white transition hover:bg-white/12"
            aria-label="Open profile"
          >
            <Avatar className="h-8 w-8 rounded-xl">
              <AvatarImage src={avatarPreview ?? undefined} alt={displayName} className="object-cover" />
              <AvatarFallback className="rounded-xl bg-[linear-gradient(135deg,#1539b6_0%,#1d4ed8_100%)] text-[10px] font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>

      <div className={cn("fixed inset-0 z-50 xl:hidden", mobileNavOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          className={cn("absolute inset-0 bg-slate-950/72 backdrop-blur-sm transition-opacity duration-300", mobileNavOpen ? "opacity-100" : "opacity-0")}
          aria-label="Close navigation overlay"
        />
        <div
          className={cn(
            "absolute left-0 top-0 flex h-full w-[86vw] max-w-[320px] flex-col border-r border-white/10 bg-[linear-gradient(180deg,#050914_0%,#0b1527_55%,#020617_100%)] px-5 py-5 shadow-[0_36px_90px_-42px_rgba(0,0,0,0.92)] transition-transform duration-300",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-3" onClick={() => setMobileNavOpen(false)}>
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[16px] bg-white shadow-[0_18px_34px_-22px_rgba(148,163,184,0.75)] ring-1 ring-slate-200/90">
                <img src="/logo.png" alt="EazyBizy logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.34em] text-slate-400">Learning</p>
                <p className="text-lg font-semibold tracking-tight text-white">EazyBizy</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white"
              aria-label="Close learning menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/6 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 rounded-2xl border border-white/10">
                <AvatarImage src={avatarPreview ?? undefined} alt={displayName} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-[linear-gradient(135deg,#1539b6_0%,#1d4ed8_100%)] text-sm font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-400">{profileDraft.businessType || "Business learner"}</p>
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              const locked = item.key === "paidCourses" && !hasPremium;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavSelect(item.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[20px] border px-4 py-3.5 text-left transition-all duration-300",
                    isActive
                      ? "border-[#5b7cff]/40 bg-[linear-gradient(135deg,rgba(37,99,235,0.42)_0%,rgba(79,70,229,0.34)_55%,rgba(15,23,42,0.98)_100%)] text-white shadow-[0_24px_42px_-28px_rgba(59,130,246,0.88)]"
                      : "border-white/10 bg-white/6 text-slate-200 hover:bg-white/10",
                  )}
                >
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border", isActive ? "border-white/12 bg-white/10" : "border-white/10 bg-[rgba(15,23,42,0.8)]")}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{item.label}</span>
                    {locked ? (
                      <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/82">
                        Locked
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                setMobileProfileOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-[#12213f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#17305e]"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>

          <div className="mt-auto pt-6">{premiumPromoCard}</div>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1720px] px-4 pb-8 pt-24 sm:px-5 lg:px-6 xl:pt-6">
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden xl:flex xl:flex-col">
            <div className="sticky top-6 flex h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,#050914_0%,#0b1527_55%,#020617_100%)] px-5 py-5 shadow-[0_36px_90px_-46px_rgba(0,0,0,0.92)]">
              <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_28%),radial-gradient(circle_at_100%_38%,rgba(96,165,250,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%)]" />
              <div className="relative flex min-h-full flex-col">
                <Link to="/" className="flex items-center gap-3 rounded-[26px] border border-white/10 bg-white/6 px-4 py-4">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px] bg-white shadow-[0_20px_42px_-24px_rgba(148,163,184,0.78)] ring-1 ring-slate-200/90">
                    <img src="/logo.png" alt="EazyBizy logo" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.42em] text-slate-400">Learning Platform</p>
                    <h1 className="mt-1 text-[1.7rem] font-bold leading-none tracking-[-0.035em] text-white">EazyBizy</h1>
                  </div>
                </Link>

                <nav className="mt-6 space-y-3">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = active === item.key;
                    const locked = item.key === "paidCourses" && !hasPremium;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleNavSelect(item.key)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-[20px] border px-4 py-3.5 text-left transition-all duration-300",
                          isActive
                            ? "border-[#4d74ff]/45 bg-[linear-gradient(135deg,rgba(46,97,255,0.42)_0%,rgba(39,76,203,0.38)_52%,rgba(12,24,52,0.98)_100%)] text-white shadow-[0_24px_42px_-28px_rgba(59,130,246,0.88),inset_0_1px_0_rgba(255,255,255,0.18)]"
                            : "border-white/10 bg-white/6 text-slate-200 hover:border-[#4f77ff]/20 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border transition-all duration-300", isActive ? "border-white/12 bg-white/10" : "border-white/10 bg-[rgba(15,23,42,0.8)] group-hover:bg-[rgba(37,99,235,0.2)]")}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
                          <span className="truncate text-[0.95rem] font-medium tracking-[-0.01em]">{item.label}</span>
                          {locked ? (
                            <span className="shrink-0 rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-white/82">
                              Locked
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-auto pt-6">{sidebarPremiumCard}</div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            <div
              className={cn(
                "grid items-start gap-6",
                useFullWidthCoursesLayout
                  ? "xl:grid-cols-1"
                  : active === "settings"
                    ? "xl:grid-cols-[minmax(0,1fr)_360px]"
                    : "xl:grid-cols-[minmax(0,1fr)_340px]",
              )}
            >
              <main className="min-w-0 space-y-6">{activeContent}</main>
              <aside className={cn("hidden xl:min-w-0", useFullWidthCoursesLayout ? "xl:hidden" : "xl:block")}>
                <div className="sticky top-6 space-y-6">{desktopAsideContent}</div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={mobileProfileOpen} onOpenChange={setMobileProfileOpen}>
        <DialogContent className="w-[calc(100vw-0.75rem)] max-w-[680px] border-none bg-transparent p-0 shadow-none sm:w-full">
          <ProfilePanel profile={profileDraft} avatarPreview={avatarPreview} initials={initials} isEditing={isEditingProfile} isSaving={isSavingProfile} onCancelEditing={handleCancelProfileEditing} onAdjustPhoto={handleAdjustAvatar} onFieldChange={handleProfileFieldChange} onSave={handleSaveProfile} onStartEditing={handleStartProfileEditing} onUploadClick={handleAvatarUploadClick} onRemovePhoto={handleRemoveAvatar} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={avatarEditorOpen}
        onOpenChange={(open) => {
          if (!open && isApplyingAvatar) return;
          if (!open) {
            resetAvatarEditor();
            return;
          }
          setAvatarEditorOpen(open);
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[860px] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-[28px] border border-[#dce2ff] bg-white p-0 text-slate-900 shadow-[0_34px_80px_-42px_rgba(37,99,235,0.38)] sm:w-full sm:rounded-[34px]">
          <div className="overflow-hidden rounded-[28px] sm:rounded-[34px]">
            <div className="bg-[linear-gradient(145deg,#10204f_0%,#1d4ed8_38%,#6d28d9_100%)] px-5 py-6 text-white sm:px-7 sm:py-8">
              <DialogHeader>
                <DialogTitle className="text-[1.9rem] font-semibold tracking-tight sm:text-3xl">Crop and align your profile picture</DialogTitle>
                <DialogDescription className="mt-3 max-w-2xl text-sm leading-7 text-white/82">
                  Fine-tune the framing before saving so your avatar looks centered and polished across the learning dashboard.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_290px]">
              <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-4 sm:p-5">
                <div className="mx-auto max-w-[360px]">
                  <div className="relative aspect-square overflow-hidden rounded-[34px] border-4 border-white bg-slate-100 shadow-[0_24px_56px_-34px_rgba(37,99,235,0.4)]">
                    {avatarEditorImage ? (
                      <>
                        <div
                          className="absolute inset-0 bg-no-repeat transition-all duration-200"
                          style={{
                            backgroundImage: `url(${avatarEditorImage.src})`,
                            backgroundPosition: `${avatarPositionX}% ${avatarPositionY}%`,
                            backgroundSize: avatarEditorBackgroundSize,
                          }}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:33.333%_33.333%]" />
                        <div className="pointer-events-none absolute inset-[12%] rounded-[28px] border border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.2)]" />
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
                        Upload a photo to start adjusting it.
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    <span>Live Preview</span>
                    <span>{Math.round(avatarZoom * 100)}% zoom</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5 rounded-[28px] border border-slate-200/80 bg-[#fbfcff] p-4 sm:p-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Adjustments</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use the controls below to zoom in and align the image until your face sits comfortably in the frame.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Zoom</span>
                    <span>{avatarZoom.toFixed(2)}x</span>
                  </div>
                  <Slider
                    value={[avatarZoom]}
                    min={1}
                    max={2.5}
                    step={0.01}
                    onValueChange={(value) => setAvatarZoom(value[0] ?? 1)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Horizontal</span>
                    <span>{avatarPositionX}%</span>
                  </div>
                  <Slider
                    value={[avatarPositionX]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => setAvatarPositionX(value[0] ?? 50)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Vertical</span>
                    <span>{avatarPositionY}%</span>
                  </div>
                  <Slider
                    value={[avatarPositionY]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => setAvatarPositionY(value[0] ?? 50)}
                  />
                </div>

                <div className="rounded-[22px] border border-[#dce5ff] bg-white p-4 text-sm leading-6 text-slate-600">
                  Tip: keep the eyes slightly above the middle of the frame for a cleaner avatar crop.
                </div>

                <div className="grid gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetAvatarEditor}
                    className="h-11 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    Reset Alignment
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetAvatarEditor}
                    className="h-11 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    disabled={isApplyingAvatar}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApplyAvatar}
                    className={cn(primaryButton, "h-11 w-full")}
                    disabled={!avatarEditorImage || isApplyingAvatar}
                  >
                    {isApplyingAvatar ? "Applying..." : "Apply Crop"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[720px] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-[28px] border border-[#dce2ff] bg-white p-0 text-slate-900 shadow-[0_34px_80px_-42px_rgba(37,99,235,0.38)] sm:w-full sm:rounded-[34px]">
          <div className="overflow-hidden rounded-[28px] sm:rounded-[34px]">
            <div className="bg-[linear-gradient(145deg,#10204f_0%,#1d4ed8_38%,#6d28d9_100%)] px-5 py-6 text-white sm:px-7 sm:py-8">
              <DialogHeader>
                <DialogTitle className="text-[1.9rem] font-semibold tracking-tight sm:text-3xl">Unlock EazyBizy Premium</DialogTitle>
                <DialogDescription className="mt-3 max-w-xl text-sm leading-7 text-white/82">Subscribe to EazyBizy Premium to unlock advanced business courses.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-7">
              <div className="grid gap-3">
                {["Advanced business finance and strategy programs", "High-conversion premium card experiences with full access", "Deeper founder playbooks, negotiation labs, and scale systems"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-[22px] border border-slate-200/80 bg-[#f8faff] px-4 py-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#3151be]"><Award className="h-4 w-4" /></span>
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={() => navigate("/contact")} className={cn(primaryButton, "flex-1")}>Subscribe Now</Button>
                <Button type="button" variant="outline" onClick={() => setUpgradeOpen(false)} className="h-11 flex-1 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Maybe Later</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Learning;