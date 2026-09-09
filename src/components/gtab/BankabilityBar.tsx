/**
 * BankabilityBar — always-visible strip of the numbers a banker checks first.
 * Shown on the money steps (5–9) so the applicant sees live impact while typing,
 * without opening the AI drawer. Calculation-only (no API).
 */
import { useMemo } from "react";
import { IndianRupee, TrendingUp, Landmark, PieChart } from "lucide-react";
import type { GTABFormData } from "@/types/gtab";
import { getFinancingPlan } from "@/lib/projectReport";
import { predictViability } from "@/lib/aiEngine";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);

const Chip = ({
  icon: Icon, label, value, tone = "neutral",
}: {
  icon: typeof IndianRupee; label: string; value: string; tone?: "good" | "warn" | "bad" | "neutral";
}) => {
  const toneCls =
    tone === "good" ? "text-emerald-700 border-emerald-200/70 bg-emerald-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_14px_-4px_rgba(16,185,129,0.25)]"
    : tone === "warn" ? "text-amber-700 border-amber-200/70 bg-amber-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_14px_-4px_rgba(217,119,6,0.25)]"
    : tone === "bad" ? "text-red-700 border-red-200/70 bg-red-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_14px_-4px_rgba(220,38,38,0.25)]"
    : "text-slate-700 border-gray-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_14px_-4px_rgba(15,23,42,0.10)]";
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 transition-transform duration-200 hover:-translate-y-0.5 ${toneCls}`}>
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</p>
        <p className="truncate text-sm font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
};

export default function BankabilityBar({ formData }: { formData: GTABFormData }) {
  const plan      = useMemo(() => getFinancingPlan(formData), [formData]);
  const viability = useMemo(() => predictViability(formData), [formData]);

  const dscr = viability.dscrEstimate;
  const dscrTone = dscr <= 0 ? "neutral" : dscr >= 1.25 ? "good" : dscr >= 1 ? "warn" : "bad";
  // Promoter margin: healthy when at/above ~15% (bank floor varies by scheme).
  const marginTone = plan.promoterEquityPct >= 15 ? "good" : plan.promoterEquityPct > 0 ? "warn" : "neutral";

  return (
    <div className="mb-4 rounded-2xl border border-gray-100 bg-slate-50/80 p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_22px_-8px_rgba(15,23,42,0.08)]">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-4 w-1 rounded-full bg-[#15b8aa]" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Bankability — live figures
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Chip icon={IndianRupee} label="Project Cost"   value={fmt(plan.totalProjectCost)} />
        <Chip icon={Landmark}    label="Bank Finance"   value={fmt(plan.totalBankFinance)} />
        <Chip icon={PieChart}    label="Promoter Share" value={`${plan.promoterEquityPct}%`} tone={marginTone} />
        <Chip icon={TrendingUp}  label="Est. DSCR"      value={dscr > 0 ? `${dscr.toFixed(2)}x` : "N/A"} tone={dscrTone} />
      </div>
    </div>
  );
}
