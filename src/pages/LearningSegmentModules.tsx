import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, Star } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

type UserSegmentId = "aspiring" | "established" | "students";
type CourseType = "free" | "premium";
type CourseTag = "Scheme Guide" | "Checklist" | "Tutorial" | "Guide";
type CourseFilter = "all" | "free" | "premium" | "trending";

interface LearningCourse {
  id: string;
  title: string;
  description: string;
  image: string;
  price: number | null;
  originalPrice?: number;
  rating: number;
  reviews: number;
  tag: CourseTag;
  trending?: boolean;
  type: CourseType;
}

const userSegments = [
  { id: "aspiring" as const, title: "Aspiring Entrepreneurs" },
  { id: "established" as const, title: "Established Business Owners" },
  { id: "students" as const, title: "Students & Academia" },
];

const navigationItems = [
  { label: "Learning", href: "/learning/dashboard" },
];

const filterTabs: Array<{ key: CourseFilter; label: string }> = [
  { key: "all", label: "All Courses" },
  { key: "free", label: "Free Courses" },
  { key: "premium", label: "Premium Courses" },
  { key: "trending", label: "Trending" },
];

const coursesPerPage = 4;

const normalizeCourseFilter = (value: string | null): CourseFilter =>
  value === "all" || value === "free" || value === "premium" || value === "trending" ? value : "all";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const courseLibrary: Record<UserSegmentId, LearningCourse[]> = {
  aspiring: [
    {
      id: "asp-1",
      title: "PMEGP Launch Blueprint",
      description: "Learn how to map eligibility, subsidy windows, and first-time borrower readiness.",
      image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.7,
      reviews: 11342,
      tag: "Guide",
      trending: true,
      type: "free",
    },
    {
      id: "asp-2",
      title: "MUDRA Starter Loan Checklist",
      description: "Organize the essential proofs, projections, and forms before you apply.",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.5,
      reviews: 8946,
      tag: "Checklist",
      type: "free",
    },
    {
      id: "asp-3",
      title: "Startup India Credit Readiness Masterclass",
      description: "Turn your idea into a lender-ready business profile with structured validation.",
      image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80",
      price: 499,
      originalPrice: 999,
      rating: 4.8,
      reviews: 15664,
      tag: "Tutorial",
      trending: true,
      type: "premium",
    },
    {
      id: "asp-4",
      title: "Early-Stage Founder Finance Basics",
      description: "Build confidence with budgeting, break-even planning, and lending math.",
      image: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.6,
      reviews: 7741,
      tag: "Scheme Guide",
      type: "free",
    },
    {
      id: "asp-5",
      title: "Collateral-Free Credit Pitch Framework",
      description: "Shape a stronger borrower story for schemes designed for emerging founders.",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
      price: 499,
      originalPrice: 999,
      rating: 4.7,
      reviews: 10218,
      tag: "Guide",
      type: "premium",
    },
    {
      id: "asp-6",
      title: "Subsidy Scheme Comparison for New Ventures",
      description: "Compare central and state-led support programs without getting lost in jargon.",
      image: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.4,
      reviews: 6350,
      tag: "Scheme Guide",
      type: "free",
    },
    {
      id: "asp-7",
      title: "First Application Review Walkthrough",
      description: "See how experienced reviewers scan your business summary, documents, and use case.",
      image: "https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=900&q=80",
      price: 499,
      originalPrice: 999,
      rating: 4.8,
      reviews: 14209,
      tag: "Tutorial",
      trending: true,
      type: "premium",
    },
    {
      id: "asp-8",
      title: "Founder Documentation Room Setup",
      description: "Create a clean digital document room that speeds up underwriting conversations.",
      image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.6,
      reviews: 9255,
      tag: "Checklist",
      type: "free",
    },
  ],
  established: [
    {
      id: "est-1",
      title: "MSME Expansion Loan Playbook",
      description: "Choose the best expansion credit route based on turnover, collateral, and business stage.",
      image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.6,
      reviews: 12928,
      tag: "Scheme Guide",
      trending: true,
      type: "free",
    },
    {
      id: "est-2",
      title: "Working Capital Diagnostics",
      description: "Evaluate cash-cycle gaps and compute the right working capital support for your next phase.",
      image: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.7,
      reviews: 10814,
      tag: "Checklist",
      type: "free",
    },
    {
      id: "est-3",
      title: "CGTMSE Without-Collateral Strategy",
      description: "Structure your case for collateral-free credit and reduce rejection risk with lender-focused framing.",
      image: "https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=900&q=80",
      price: 499,
      originalPrice: 999,
      rating: 4.8,
      reviews: 18420,
      tag: "Tutorial",
      trending: true,
      type: "premium",
    },
    {
      id: "est-4",
      title: "Term Loan Document Audit",
      description: "Run a quick but professional self-audit before you send financials and compliance proofs.",
      image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.5,
      reviews: 9026,
      tag: "Guide",
      type: "free",
    },
    {
      id: "est-5",
      title: "Lender Meeting Preparation Framework",
      description: "Walk into the room with sharper numbers, a better story, and stronger negotiation posture.",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
      price: 499,
      originalPrice: 999,
      rating: 4.7,
      reviews: 15377,
      tag: "Guide",
      type: "premium",
    },
    {
      id: "est-6",
      title: "Cash Flow Monitoring for Growing MSMEs",
      description: "Track inflows, pressure points, and repayment resilience with cleaner weekly discipline.",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.6,
      reviews: 8210,
      tag: "Checklist",
      type: "free",
    },
    {
      id: "est-7",
      title: "Receivables Financing Deep Dive",
      description: "Understand invoice-backed working capital options and when they outperform standard limits.",
      image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=900&q=80",
      price: 499,
      originalPrice: 999,
      rating: 4.8,
      reviews: 14032,
      tag: "Tutorial",
      trending: true,
      type: "premium",
    },
    {
      id: "est-8",
      title: "Expansion Readiness Scorecard",
      description: "Benchmark leadership, process maturity, and financial stability before taking bigger debt.",
      image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.5,
      reviews: 7689,
      tag: "Scheme Guide",
      type: "free",
    },
  ],
  students: [
    {
      id: "stu-1",
      title: "Policy-to-Practice Scheme Overview",
      description: "Understand how real lending schemes move from regulation to borrower impact.",
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.7,
      reviews: 10322,
      tag: "Guide",
      trending: true,
      type: "free",
    },
    {
      id: "stu-2",
      title: "MSME Finance Fundamentals for Researchers",
      description: "Build a strong baseline in borrower behavior, credit products, and approval criteria.",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.6,
      reviews: 8479,
      tag: "Scheme Guide",
      type: "free",
    },
    {
      id: "stu-3",
      title: "Credit Inclusion Case Review Lab",
      description: "Break down real case patterns and evaluate how lending access changes outcomes.",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80",
      price: 499,
      originalPrice: 999,
      rating: 4.8,
      reviews: 12660,
      tag: "Tutorial",
      trending: true,
      type: "premium",
    },
    {
      id: "stu-4",
      title: "Academic Presentation Toolkit for Fintech Topics",
      description: "Translate scheme mechanics and borrower journeys into clear class presentations.",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.4,
      reviews: 6921,
      tag: "Checklist",
      type: "free",
    },
    {
      id: "stu-5",
      title: "Structured Research Guide to MSME Lending",
      description: "Explore data points, frameworks, and source validation for higher-quality finance projects.",
      image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
      price: 499,
      originalPrice: 999,
      rating: 4.7,
      reviews: 11908,
      tag: "Guide",
      type: "premium",
    },
    {
      id: "stu-6",
      title: "Borrower Persona Mapping Basics",
      description: "Learn how different business archetypes experience the same scheme in different ways.",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.5,
      reviews: 7410,
      tag: "Guide",
      type: "free",
    },
    {
      id: "stu-7",
      title: "Fintech Dashboard Storytelling Tutorial",
      description: "Present lending insights with clearer visuals, sharper logic, and stronger narrative flow.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80",
      price: 499,
      originalPrice: 999,
      rating: 4.8,
      reviews: 13387,
      tag: "Tutorial",
      trending: true,
      type: "premium",
    },
    {
      id: "stu-8",
      title: "Field Interview Checklist for Scheme Studies",
      description: "Prepare better interview prompts for founders, bankers, and policy implementers.",
      image: "https://images.unsplash.com/photo-1516321310764-8d1921c04d28?auto=format&fit=crop&w=900&q=80",
      price: null,
      rating: 4.6,
      reviews: 8052,
      tag: "Checklist",
      type: "free",
    },
  ],
};

const LearningSegmentModules = () => {
  const { segmentId } = useParams<{ segmentId: string }>();
  const [searchParams] = useSearchParams();

  const currentSegment: UserSegmentId =
    segmentId === "aspiring" || segmentId === "established" || segmentId === "students"
      ? segmentId
      : "established";

  const requestedFilter = normalizeCourseFilter(searchParams.get("filter"));
  const [activeFilter, setActiveFilter] = useState<CourseFilter>(requestedFilter);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setActiveFilter(requestedFilter);
  }, [requestedFilter]);

  const selectedSegmentLabel =
    userSegments.find((segment) => segment.id === currentSegment)?.title ?? "Established Business Owners";
  const allCourses = courseLibrary[currentSegment];

  const filteredCourses = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return allCourses.filter((course) => {
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "free" && course.type === "free") ||
        (activeFilter === "premium" && course.type === "premium") ||
        (activeFilter === "trending" && course.trending);

      if (!query) return matchesFilter;

      const searchableText = `${course.title} ${course.description} ${course.tag}`.toLowerCase();
      return matchesFilter && searchableText.includes(query);
    });
  }, [activeFilter, allCourses, searchText]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchText, currentSegment]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / coursesPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const visibleCourses = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * coursesPerPage;
    return filteredCourses.slice(startIndex, startIndex + coursesPerPage);
  }, [filteredCourses, safeCurrentPage]);

  const hasPreviousPage = safeCurrentPage > 1;
  const hasNextPage = safeCurrentPage < totalPages;

  return (
    <div
      className="min-h-screen bg-[#f5f3fb] text-slate-900"
      style={{ fontFamily: "Inter, 'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#cfc2ff] opacity-40 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#e7ddff] opacity-80 blur-3xl" />
        <div className="absolute bottom-12 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#efe9ff] opacity-80 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-[#ebe5fb] bg-[rgba(250,248,255,0.9)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:gap-6 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_14px_30px_-18px_rgba(108,76,241,0.24)] ring-1 ring-[#ece5ff]">
              <img src="/logo.png" alt="EazyBizy logo" className="h-full w-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[0.82rem] font-semibold uppercase tracking-[0.24em] text-[#7c67d9]">Fintech Learning</p>
              <p className="text-lg font-semibold tracking-tight text-slate-950">EazyBizy</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 xl:flex">
            {navigationItems.map((item) => {
              const isActive = item.label === "Learning";
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-[#ede7ff] text-[#6c4cf1] shadow-[0_8px_20px_rgba(108,76,241,0.12)]"
                      : "text-slate-600 hover:bg-white hover:text-slate-950",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
            <Link
              to="/auth"
              className="rounded-full border border-[#7c60f3] bg-white px-3 py-2 text-xs font-semibold text-[#6c4cf1] shadow-[0_10px_24px_rgba(108,76,241,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(108,76,241,0.16)] sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-[linear-gradient(135deg,#6c4cf1_0%,#8d74ff_100%)] px-3 py-2 text-xs font-semibold text-white shadow-[0_14px_28px_rgba(108,76,241,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(108,76,241,0.34)] sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-[1380px] px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8 lg:pt-16">
          <div className="rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,245,255,0.94)_100%)] p-5 shadow-[0_28px_80px_-52px_rgba(35,24,86,0.42)] sm:p-8 lg:p-10">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-4 inline-flex items-center rounded-full border border-[#e4dcff] bg-[#f3efff] px-4 py-2 text-sm font-semibold text-[#6c4cf1]">
                    Curated for {selectedSegmentLabel}
                  </div>
                  <h1 className="text-[2.15rem] font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.8rem]">
                    Your Learning Courses
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                    Explore courses from experienced, real-world experts.
                  </p>
                </div>

                <Link
                  to="/learning/courses"
                  className="inline-flex w-full items-center justify-center rounded-full border border-[#ebe5fb] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:text-slate-950 sm:w-auto"
                >
                  Back to Learning Hub
                </Link>
              </div>

              <div className="flex flex-col gap-5 rounded-[24px] border border-[#efe9ff] bg-white/90 p-5 shadow-[0_18px_48px_-36px_rgba(38,22,94,0.34)] lg:flex-row lg:items-center lg:justify-between">
                <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex min-w-max gap-3 py-0.5">
                  {filterTabs.map((tab) => {
                    const isActive = activeFilter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveFilter(tab.key)}
                        className={cn(
                          "rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200",
                          isActive
                            ? "bg-[linear-gradient(135deg,#6c4cf1_0%,#8d74ff_100%)] text-white shadow-[0_12px_26px_rgba(108,76,241,0.28)]"
                            : "border border-[#ece6ff] bg-[#faf8ff] text-slate-600 hover:border-[#d9ceff] hover:bg-white hover:text-slate-950",
                        )}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                  </div>
                </div>

                <div className="relative w-full lg:max-w-[320px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search courses..."
                    className="h-12 w-full rounded-full border border-[#ece6ff] bg-[#fcfbff] pl-11 pr-4 text-sm text-slate-700 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.18)] outline-none transition placeholder:text-slate-400 focus:border-[#bba9ff] focus:bg-white focus:ring-4 focus:ring-[#ede7ff]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a79d8]">Course Library</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Showing {visibleCourses.length} of {filteredCourses.length} courses
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#ece6ff] bg-[#faf8ff] px-4 py-2 text-sm text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#6c4cf1]" />
                  Premium fintech learning for modern founders
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 auto-rows-max">
                {visibleCourses.map((course, index) => {
                  const isPremium = course.type === "premium";

                  return (
                    <motion.article
                      key={course.id}
                      initial={{ opacity: 0, y: 22 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.06 }}
                      whileHover={{ y: -8 }}
                      className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#efe9ff] bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] transition-shadow duration-300 hover:shadow-[0_30px_72px_-36px_rgba(108,76,241,0.24)]" layout
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={course.image}
                          alt={course.title}
                          className="h-52 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_30%,rgba(15,23,42,0.18)_100%)]" />
                        <span
                          className={cn(
                            "absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold",
                            isPremium
                              ? "bg-[linear-gradient(135deg,#6c4cf1_0%,#8d74ff_100%)] text-white"
                              : "bg-[rgba(255,255,255,0.94)] text-slate-600 shadow-[0_10px_20px_rgba(15,23,42,0.10)]",
                          )}
                        >
                          {isPremium ? "Premium" : "Free"}
                        </span>
                        <span className="absolute right-4 top-4 rounded-full bg-[rgba(255,255,255,0.94)] px-3 py-1 text-xs font-semibold text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.10)]">
                          {course.tag}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <h2 className="line-clamp-2 min-h-[3.5rem] text-[1.35rem] font-bold leading-7 text-slate-950 sm:text-xl">
                          {course.title}
                        </h2>
                        <p className="mt-2 text-sm font-medium text-slate-500">By EazyBizy Experts</p>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{course.description}</p>

                        <div className="mt-auto pt-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Star className="h-4 w-4 fill-[#f6b73c] text-[#f6b73c]" />
                            <span>{course.rating.toFixed(1)}</span>
                            <span className="text-slate-400">({course.reviews.toLocaleString("en-IN")})</span>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-slate-950">
                                {course.price === null ? "Free" : formatCurrency(course.price)}
                              </span>
                              {course.price !== null && course.originalPrice ? (
                                <span className="text-xs font-medium text-slate-400 line-through">
                                  {formatCurrency(course.originalPrice)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={cn(
                            "mt-6 flex h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold transition-all duration-200",
                            isPremium
                              ? "bg-[linear-gradient(135deg,#6c4cf1_0%,#8d74ff_100%)] text-white shadow-[0_14px_28px_rgba(108,76,241,0.28)] hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(108,76,241,0.34)]"
                              : "border border-[#7c60f3] bg-white text-[#6c4cf1] hover:-translate-y-0.5 hover:bg-[#f7f3ff]",
                          )}
                        >
                          {isPremium ? "Unlock Now" : "Start Learning"}
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </div>

              {filteredCourses.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#ddd3ff] bg-[#faf8ff] px-6 py-10 text-center">
                  <p className="text-lg font-semibold text-slate-800">No courses matched your search.</p>
                  <p className="mt-2 text-sm text-slate-500">Try a different filter or search term to explore more learning tracks.</p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => hasPreviousPage && setCurrentPage((page) => page - 1)}
                  disabled={!hasPreviousPage}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ebe5fb] bg-white text-slate-500 shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition enabled:hover:-translate-y-0.5 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1;
                  const isActive = page === safeCurrentPage;

                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200",
                        isActive
                          ? "bg-[linear-gradient(135deg,#6c4cf1_0%,#8d74ff_100%)] text-white shadow-[0_14px_28px_rgba(108,76,241,0.26)]"
                          : "border border-[#ebe5fb] bg-white text-slate-600 shadow-[0_10px_22px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:text-slate-950",
                      )}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => hasNextPage && setCurrentPage((page) => page + 1)}
                  disabled={!hasNextPage}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ebe5fb] bg-white text-slate-500 shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition enabled:hover:-translate-y-0.5 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LearningSegmentModules;