import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, FileSpreadsheet } from "lucide-react";
import { DISCLAIMER_TEXT } from "@/types/depreciation";
import { useDepreciationAssets } from "@/hooks/useDepreciationAssets";
import { useCompaniesActRules, useIncomeTaxRules, useGenericWdvDefaults } from "@/hooks/useDepreciationRules";
import DashboardTab from "@/components/depreciation/DashboardTab";
import AssetMasterTab from "@/components/depreciation/AssetMasterTab";
import RulesAndRatesTab from "@/components/depreciation/RulesAndRatesTab";
import AssetWorkspace from "@/components/depreciation/AssetWorkspace";
import AssetFormDialog from "@/components/depreciation/AssetFormDialog";
import { compareDepreciation } from "@/lib/depreciation/compareEngine";
import { exportDepreciationExcel } from "@/lib/depreciation/exportReport";

export default function DepreciationApp() {
  const { assets, basisConfig, loading, addAsset, updateAsset, deleteAsset } = useDepreciationAssets();
  const { rules: caRules, addRule: addCaRule, updateRule: updateCaRule, deleteRule: deleteCaRule } = useCompaniesActRules();
  const { rules: itRules, addRule: addItRule, updateRule: updateItRule, deleteRule: deleteItRule } = useIncomeTaxRules();
  const { defaults: gwDefaults, save: saveGwDefaults } = useGenericWdvDefaults();

  const [tab, setTab] = useState("dashboard");
  const [workspaceAssetId, setWorkspaceAssetId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const openWorkspace = (assetId: string) => {
    setWorkspaceAssetId(assetId);
    setTab("assets");
  };

  const workspaceAsset = workspaceAssetId ? assets.find((a) => a.id === workspaceAssetId) : undefined;

  const handleExportExcel = async () => {
    const comparisons = assets.map((asset) =>
      compareDepreciation({
        asset,
        financial_year: "2026-27",
        companiesActInputs: basisConfig[asset.id]?.companies_act_inputs || undefined,
        incomeTaxInputs: basisConfig[asset.id]?.income_tax_inputs || undefined,
        genericWdvInputs: basisConfig[asset.id]?.generic_wdv_inputs || undefined,
      }),
    );
    await exportDepreciationExcel({ assets, comparisons });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Depreciation &amp; WDV System</h1>
          <p className="text-sm text-muted-foreground">Companies Act · Income Tax · Generic WDV — independent engines, compared side by side.</p>
        </div>
        <Button variant="outline" onClick={handleExportExcel} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Export Excel (All Assets)
        </Button>
      </div>

      <Alert className="border-amber-300 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <AlertDescription className="text-amber-800 text-xs">{DISCLAIMER_TEXT}</AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v !== "assets") setWorkspaceAssetId(null); }}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="rules">Rules &amp; Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardTab
            assets={assets}
            basisConfig={basisConfig}
            onAddAsset={() => setQuickAddOpen(true)}
            onGoToAssets={() => setTab("assets")}
            onOpenWorkspace={openWorkspace}
          />
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          {workspaceAsset ? (
            <AssetWorkspace
              asset={workspaceAsset}
              config={basisConfig[workspaceAsset.id] || {}}
              companiesActRules={caRules}
              incomeTaxRules={itRules}
              genericWdvDefaults={gwDefaults}
              onBack={() => setWorkspaceAssetId(null)}
              onSaveConfig={(updates) => updateAsset(workspaceAsset.id, updates)}
            />
          ) : (
            <AssetMasterTab
              assets={assets}
              loading={loading}
              onAdd={async (asset) => { await addAsset(asset); }}
              onUpdate={updateAsset}
              onDelete={deleteAsset}
              onOpenWorkspace={openWorkspace}
            />
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <RulesAndRatesTab
            companiesActRules={caRules}
            incomeTaxRules={itRules}
            genericWdvDefaults={gwDefaults}
            onAddCaRule={addCaRule}
            onDeleteCaRule={deleteCaRule}
            onToggleCaRule={(id, active) => updateCaRule(id, { active })}
            onAddItRule={addItRule}
            onDeleteItRule={deleteItRule}
            onToggleItRule={(id, active) => updateItRule(id, { active })}
            onSaveGenericDefaults={saveGwDefaults}
          />
        </TabsContent>
      </Tabs>

      <AssetFormDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} onSubmit={async (asset) => { await addAsset(asset); }} />
    </div>
  );
}
