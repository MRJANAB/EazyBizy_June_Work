import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Building2, Landmark, Calculator, GitCompareArrows } from "lucide-react";
import { DepreciationAsset, CompaniesActInputs, IncomeTaxBlockInputs, GenericWdvInputs, CompaniesActRule, IncomeTaxRule, GenericWdvDefaults } from "@/types/depreciation";
import { AssetBasisConfig } from "@/hooks/useDepreciationAssets";
import CompaniesActForm from "./CompaniesActForm";
import IncomeTaxForm from "./IncomeTaxForm";
import GenericWdvForm from "./GenericWdvForm";
import CompareView from "./CompareView";
import { compareDepreciation } from "@/lib/depreciation/compareEngine";
import { StatusBadge } from "./DepreciationBadges";

type Basis = "companies_act" | "income_tax" | "generic_wdv" | "compare";

interface AssetWorkspaceProps {
  asset: DepreciationAsset;
  config: AssetBasisConfig;
  companiesActRules: CompaniesActRule[];
  incomeTaxRules: IncomeTaxRule[];
  genericWdvDefaults: GenericWdvDefaults;
  onBack: () => void;
  onSaveConfig: (updates: AssetBasisConfig) => Promise<void>;
}

export default function AssetWorkspace({
  asset,
  config,
  companiesActRules,
  incomeTaxRules,
  genericWdvDefaults,
  onBack,
  onSaveConfig,
}: AssetWorkspaceProps) {
  const [basis, setBasis] = useState<Basis>("companies_act");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSaveCa = async (inputs: CompaniesActInputs) => {
    await onSaveConfig({ companies_act_inputs: inputs });
    setSaveMessage("Companies Act inputs saved.");
    setTimeout(() => setSaveMessage(null), 2500);
  };
  const handleSaveIt = async (inputs: IncomeTaxBlockInputs) => {
    await onSaveConfig({ income_tax_inputs: inputs });
    setSaveMessage("Income Tax inputs saved.");
    setTimeout(() => setSaveMessage(null), 2500);
  };
  const handleSaveGw = async (inputs: GenericWdvInputs) => {
    await onSaveConfig({ generic_wdv_inputs: inputs });
    setSaveMessage("Generic WDV inputs saved.");
    setTimeout(() => setSaveMessage(null), 2500);
  };

  const comparison = compareDepreciation({
    asset,
    financial_year: "2026-27",
    companiesActInputs: config.companies_act_inputs || undefined,
    incomeTaxInputs: config.income_tax_inputs || undefined,
    genericWdvInputs: config.generic_wdv_inputs || undefined,
  });

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ChevronLeft className="w-4 h-4" /> Back to Assets
      </Button>

      <Card>
        <CardContent className="p-5 space-y-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold">{asset.asset_name}</h2>
              <p className="text-sm text-muted-foreground">
                {asset.asset_code} · {asset.asset_category} · Original Cost ₹{asset.original_cost.toLocaleString("en-IN")}
              </p>
            </div>
            <StatusBadge status={asset.status} />
          </div>
        </CardContent>
      </Card>

      <div>
        <p className="text-sm font-semibold mb-2">DEPRECIATION BASIS</p>
        <Tabs value={basis} onValueChange={(v) => setBasis(v as Basis)}>
          <TabsList>
            <TabsTrigger value="companies_act" className="gap-1.5"><Building2 className="w-4 h-4" /> Companies Act</TabsTrigger>
            <TabsTrigger value="income_tax" className="gap-1.5"><Landmark className="w-4 h-4" /> Income Tax</TabsTrigger>
            <TabsTrigger value="generic_wdv" className="gap-1.5"><Calculator className="w-4 h-4" /> Generic WDV</TabsTrigger>
            <TabsTrigger value="compare" className="gap-1.5"><GitCompareArrows className="w-4 h-4" /> Compare</TabsTrigger>
          </TabsList>

          {saveMessage && <p className="text-sm text-emerald-600 mt-2">✓ {saveMessage}</p>}

          <TabsContent value="companies_act" className="mt-4">
            <Card><CardContent className="p-5">
              <CompaniesActForm asset={asset} initial={config.companies_act_inputs} rules={companiesActRules} onSave={handleSaveCa} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="income_tax" className="mt-4">
            <Card><CardContent className="p-5">
              <IncomeTaxForm asset={asset} initial={config.income_tax_inputs} rules={incomeTaxRules} onSave={handleSaveIt} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="generic_wdv" className="mt-4">
            <Card><CardContent className="p-5">
              <GenericWdvForm asset={asset} initial={config.generic_wdv_inputs} defaults={genericWdvDefaults} onSave={handleSaveGw} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="compare" className="mt-4">
            <Card><CardContent className="p-5">
              <CompareView comparison={comparison} />
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
