import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Boxes, IndianRupee, TrendingDown, Wallet, Landmark, CheckCircle2, Clock, Plus } from "lucide-react";
import { DepreciationAsset } from "@/types/depreciation";
import { AssetBasisConfig } from "@/hooks/useDepreciationAssets";
import { computeDashboardTotals } from "@/lib/depreciation/assetCalculations";
import { StatusBadge } from "./DepreciationBadges";

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

interface DashboardTabProps {
  assets: DepreciationAsset[];
  basisConfig: Record<string, AssetBasisConfig>;
  onAddAsset: () => void;
  onGoToAssets: () => void;
  onOpenWorkspace: (assetId: string) => void;
}

export default function DashboardTab({ assets, basisConfig, onAddAsset, onGoToAssets, onOpenWorkspace }: DashboardTabProps) {
  const totals = computeDashboardTotals(assets, basisConfig);

  const cards = [
    { label: "Total Assets", value: totals.totalAssets.toString(), icon: Boxes },
    { label: "Total Original Cost", value: fmt(totals.totalOriginalCost), icon: IndianRupee },
    { label: "Total Accumulated Depreciation", value: fmt(totals.totalAccumulatedDepreciation), icon: TrendingDown },
    { label: "Current-Year Depreciation", value: fmt(totals.currentYearDepreciation), icon: TrendingDown },
    { label: "Closing Book Value", value: fmt(totals.closingBookValue), icon: Wallet },
    { label: "Closing Tax WDV", value: fmt(totals.closingTaxWdv), icon: Landmark },
    { label: "Fully Depreciated Assets", value: totals.fullyDepreciatedCount.toString(), icon: CheckCircle2 },
    { label: "Assets Under Depreciation", value: totals.underDepreciationCount.toString(), icon: Clock },
  ];

  const recent = assets.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold">Dashboard</h2>
        <div className="flex gap-2">
          <Button onClick={onAddAsset} className="gap-2"><Plus className="w-4 h-4" /> Add Asset</Button>
          <Button variant="outline" onClick={onGoToAssets}>View All Assets</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{label}</span>
              </div>
              <p className="text-xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold">Recently Added Assets</p>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assets yet — click "Add Asset" to get started.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => onOpenWorkspace(asset.id)}
                  className="w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left hover:bg-muted/50 transition"
                >
                  <div>
                    <p className="text-sm font-medium">{asset.asset_name}</p>
                    <p className="text-xs text-muted-foreground">{asset.asset_code} · {asset.asset_category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">₹{asset.original_cost.toLocaleString("en-IN")}</span>
                    <StatusBadge status={asset.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
