import { type KeyboardEvent } from "react";
import { ChevronRight, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardAlertPriority = "critical" | "high" | "medium";
export type DashboardAlertStatus = "rejected" | "due-soon" | "in-review";
export type DashboardAlertType = "document" | "payment" | "verification";

export interface DashboardAlert {
  id: string;
  userId: string;
  userEmail?: string;
  title: string;
  description: string;
  type: DashboardAlertType;
  status: DashboardAlertStatus;
  updatedAt?: string;
  dueDate?: string;
  icon: LucideIcon;
  actionLabel: string;
  actionRoute: string;
  priority: DashboardAlertPriority;
  dismissible: boolean;
}

type AlertCardProps = {
  alert: DashboardAlert;
  badgeLabel: string;
  badgeClassName: string;
  metaLabel: string;
  onNavigate: (alert: DashboardAlert) => void;
  onDismiss?: (alertId: string) => void;
  className?: string;
};

const AlertCard = ({
  alert,
  badgeLabel,
  badgeClassName,
  metaLabel,
  onNavigate,
  onDismiss,
  className,
}: AlertCardProps) => {
  const Icon = alert.icon;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onNavigate(alert);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(alert)}
      onKeyDown={handleKeyDown}
      aria-label={`${alert.title}. ${alert.description}. Open ${alert.actionLabel}.`}
      className={cn(
        "group cursor-pointer rounded-[1.5rem] border border-white/10 bg-[#061b34]/80 p-4 transition duration-200 hover:border-[#00C2D1]/25 hover:bg-[#082342]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2D1]/35",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00C2D1]/15 text-[#00C2D1]">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-white sm:text-lg">{alert.title}</p>
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", badgeClassName)}>
                {badgeLabel}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-300">{alert.description}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{metaLabel}</p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            {alert.dismissible && onDismiss ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDismiss(alert.id);
                }}
                aria-label={`Dismiss ${alert.title}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onNavigate(alert);
              }}
              aria-label={`${alert.actionLabel} for ${alert.title}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#00C2D1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#00adc4]"
            >
              <span className="whitespace-nowrap">{alert.actionLabel}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate(alert);
            }}
            aria-label={`Open ${alert.title}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#0b2141] text-[#00C2D1] transition hover:border-[#00C2D1]/35 hover:bg-[#0d2853] hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
