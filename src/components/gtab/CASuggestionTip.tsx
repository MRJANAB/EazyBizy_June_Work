import { Lightbulb, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Advisory } from "@/lib/caAdvisory";
import type { GTABFormData } from "@/types/gtab";

const TONE = {
  good: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  warn: { box: "border-amber-300 bg-amber-50 text-amber-800", icon: AlertTriangle },
  info: { box: "border-sky-200 bg-sky-50 text-sky-800", icon: Lightbulb },
} as const;

/**
 * Renders calculation-derived CA/banker suggestions. Pass the advisories you
 * computed for the current step; each shows its message and, when the advisory
 * carries an `apply`, a one-click button that patches the form.
 */
export const CASuggestionTip = ({
  advisories,
  onApply,
}: {
  advisories: (Advisory | null | undefined)[];
  onApply: (patch: Partial<GTABFormData>) => void;
}) => {
  const items = advisories.filter((a): a is Advisory => !!a);
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((a, i) => {
        const t = TONE[a.tone];
        const Icon = t.icon;
        return (
          <div key={i} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${t.box}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="leading-relaxed">
                <span className="font-semibold">CA tip: </span>{a.message}
              </p>
              {a.apply && (
                <button
                  type="button"
                  onClick={() => onApply(a.apply!.patch)}
                  className="rounded-lg border border-current/30 bg-white/60 px-3 py-1 text-xs font-semibold hover:bg-white"
                >
                  {a.apply.label}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CASuggestionTip;
