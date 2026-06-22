import { useEffect } from "react";
import {
  ArrowLeft,
  Clock3,
  FileText,
  FolderPlus,
  Headphones,
  LogOut,
  Menu,
  Percent,
  Settings,
  User,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const mobileDrawerItems = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: FileText },
  { id: "applications", label: "Applications", path: "/dashboard/applications", icon: FileText },
  { id: "documents", label: "Documents", path: "/dashboard/documents", icon: FolderPlus },
  { id: "loan-details", label: "Loan Details", path: "/dashboard/loan-details", icon: Percent },
  { id: "status-tracker", label: "Status Tracker", path: "/dashboard/status-tracker", icon: Clock3 },
  { id: "settings", label: "Settings", path: "/settings", icon: Settings },
];

type MobileLoanManagementHeaderProps = {
  label?: string;
  title?: string;
  menuOpen: boolean;
  onBack: () => void;
  onMenuToggle: () => void;
  onSupport: () => void;
};

type MobileLoanManagementDrawerProps = {
  open: boolean;
  currentPath: string;
  onClose: () => void;
  onLogout?: () => void;
};

export const MobileLoanManagementHeader = ({
  label = "LOAN MANAGEMENT",
  title = "Loan Management System",
  menuOpen,
  onBack,
  onMenuToggle,
  onSupport,
}: MobileLoanManagementHeaderProps) => (
  <section className="rounded-[2rem] border border-[#00C2D1]/20 bg-[linear-gradient(180deg,rgba(8,27,49,0.98),rgba(7,23,43,0.96))] px-4 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.22)] ring-1 ring-[#00C2D1]/10 lg:hidden">
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#00C2D1]/45 bg-[#0b2445] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#10305a]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <button
        type="button"
        onClick={onSupport}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[linear-gradient(90deg,#2ad6e8,#47d68d)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(42,214,232,0.24)] transition hover:brightness-105"
      >
        <Headphones className="h-4 w-4" />
        Support
      </button>
    </div>

    <div className="mt-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.36em] text-slate-400">{label}</p>
        <h1 className="mt-3 break-words text-[2rem] font-semibold leading-tight text-white sm:text-[2.2rem]">{title}</h1>
      </div>

      <button
        type="button"
        onClick={onMenuToggle}
        aria-expanded={menuOpen}
        aria-label="Open loan management menu"
        className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.45rem] border transition ${
          menuOpen
            ? "border-[#00C2D1]/45 bg-[#0d3154] text-white"
            : "border-[#2f4f75] bg-[#102847] text-white hover:border-[#00C2D1]/35 hover:bg-[#123153]"
        }`}
      >
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  </section>
);

export const MobileLoanManagementDrawer = ({
  open,
  currentPath,
  onClose,
  onLogout,
}: MobileLoanManagementDrawerProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#020814]/72 backdrop-blur-sm transition duration-300 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-sm flex-col border-r border-[#00C2D1]/30 bg-[linear-gradient(180deg,rgba(7,21,41,0.98),rgba(8,27,49,0.98))] shadow-[24px_0_80px_rgba(0,0,0,0.4)] transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        <div className="flex items-start justify-between border-b border-[#00C2D1]/20 px-5 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-white shadow-[0_10px_30px_rgba(255,255,255,0.12)]">
              <img src="/logo.png" alt="EazyBizy logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Loan Dashboard</p>
              <h2 className="mt-1 text-xl font-semibold text-white">EazyBizy</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#00C2D1]/25 bg-[#0b2141] text-slate-100 transition hover:border-[#00C2D1] hover:bg-[#0d2853]"
            aria-label="Close mobile menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-3">
            {mobileDrawerItems.map((item) => {
              const Icon = item.icon;
              const active = currentPath === item.path;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(item.path);
                  }}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-4 rounded-[1.45rem] border px-4 py-4 text-left transition ${
                    active
                      ? "border-[#00C2D1]/40 bg-[linear-gradient(90deg,rgba(0,194,209,0.16),rgba(11,33,65,0.96))] text-white shadow-[0_14px_34px_rgba(0,194,209,0.16)]"
                      : "border-white/8 bg-[#0a1f3a]/88 text-slate-200 hover:border-[#00C2D1]/25 hover:bg-[#0d2853]"
                  }`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#00C2D1]/15 bg-[#061421]">
                    <Icon className="h-5 w-5 text-[#7BE7F0]" />
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[#00C2D1]/20 px-4 pb-6 pt-5">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/profile");
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[1.35rem] border border-[#D4AF37]/35 bg-[linear-gradient(180deg,rgba(212,175,55,0.22),rgba(164,122,8,0.2))] px-4 py-3.5 text-sm font-semibold text-[#F6DC7A] transition hover:bg-[linear-gradient(180deg,rgba(212,175,55,0.28),rgba(164,122,8,0.24))]"
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[1.35rem] border border-[#D4AF37]/35 bg-[linear-gradient(180deg,rgba(212,175,55,0.18),rgba(212,175,55,0.08))] px-4 py-3.5 text-sm font-semibold text-[#F6DC7A] transition hover:bg-[linear-gradient(180deg,rgba(212,175,55,0.26),rgba(212,175,55,0.12))]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
};
