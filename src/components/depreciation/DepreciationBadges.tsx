import { Badge } from "@/components/ui/badge";

export const BookBadge = () => (
  <Badge className="bg-amber-100 text-amber-800 border-amber-300" variant="outline">BOOK</Badge>
);
export const TaxBadge = () => (
  <Badge className="bg-blue-100 text-blue-800 border-blue-300" variant="outline">TAX</Badge>
);
export const GenericBadge = () => (
  <Badge className="bg-slate-100 text-slate-700 border-slate-300" variant="outline">GENERIC</Badge>
);

export const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800 border-emerald-300",
    fully_depreciated: "bg-slate-200 text-slate-700 border-slate-400",
    disposed: "bg-red-100 text-red-800 border-red-300",
    written_off: "bg-red-100 text-red-800 border-red-300",
    under_construction: "bg-amber-100 text-amber-800 border-amber-300",
  };
  const labels: Record<string, string> = {
    active: "Active",
    fully_depreciated: "Fully Depreciated",
    disposed: "Disposed",
    written_off: "Written Off",
    under_construction: "Under Construction",
  };
  return <Badge className={map[status] || ""} variant="outline">{labels[status] || status}</Badge>;
};
