import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { CompaniesActMethod, CompaniesActRule, IncomeTaxRule, Under180DaysTreatment, GenericWdvDefaults } from "@/types/depreciation";

interface RulesAndRatesTabProps {
  companiesActRules: CompaniesActRule[];
  incomeTaxRules: IncomeTaxRule[];
  genericWdvDefaults: GenericWdvDefaults;
  onAddCaRule: (rule: Omit<CompaniesActRule, "id">) => Promise<void>;
  onDeleteCaRule: (id: string) => Promise<void>;
  onToggleCaRule: (id: string, active: boolean) => Promise<void>;
  onAddItRule: (rule: Omit<IncomeTaxRule, "id">) => Promise<void>;
  onDeleteItRule: (id: string) => Promise<void>;
  onToggleItRule: (id: string, active: boolean) => Promise<void>;
  onSaveGenericDefaults: (updates: Partial<GenericWdvDefaults>) => Promise<void>;
}

const emptyCaRule: Omit<CompaniesActRule, "id"> = {
  asset_category: "", asset_type: "", useful_life: 10, useful_life_unit: "years",
  residual_value_pct: 5, permitted_method: "SLM", effective_date: new Date().toISOString().slice(0, 10),
  source_reference: "", notes: "", active: true,
};
const emptyItRule: Omit<IncomeTaxRule, "id"> = {
  assessment_year: "", financial_year: "", block_of_assets: "", asset_category: "",
  depreciation_rate_pct: 15, lt_180_days_treatment: "half_rate",
  effective_date: new Date().toISOString().slice(0, 10), source_reference: "", notes: "", active: true,
};

export default function RulesAndRatesTab({
  companiesActRules, incomeTaxRules, genericWdvDefaults,
  onAddCaRule, onDeleteCaRule, onToggleCaRule,
  onAddItRule, onDeleteItRule, onToggleItRule,
  onSaveGenericDefaults,
}: RulesAndRatesTabProps) {
  const [caForm, setCaForm] = useState(emptyCaRule);
  const [itForm, setItForm] = useState(emptyItRule);
  const [gwForm, setGwForm] = useState(genericWdvDefaults);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Rules &amp; Rates</h2>
      <Tabs defaultValue="ca">
        <TabsList>
          <TabsTrigger value="ca">Companies Act Rules</TabsTrigger>
          <TabsTrigger value="it">Income Tax Rules</TabsTrigger>
          <TabsTrigger value="gw">Generic WDV Defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="ca" className="mt-4 space-y-4">
          <Card><CardContent className="p-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input placeholder="Asset Category" value={caForm.asset_category} onChange={(e) => setCaForm({ ...caForm, asset_category: e.target.value })} />
            <Input placeholder="Asset Type" value={caForm.asset_type} onChange={(e) => setCaForm({ ...caForm, asset_type: e.target.value })} />
            <Input type="number" placeholder="Useful Life" value={caForm.useful_life} onChange={(e) => setCaForm({ ...caForm, useful_life: Number(e.target.value) || 0 })} />
            <Select value={caForm.useful_life_unit} onValueChange={(v: "years" | "months") => setCaForm({ ...caForm, useful_life_unit: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="years">Years</SelectItem><SelectItem value="months">Months</SelectItem></SelectContent>
            </Select>
            <Input type="number" placeholder="Residual Value %" value={caForm.residual_value_pct} onChange={(e) => setCaForm({ ...caForm, residual_value_pct: Number(e.target.value) || 0 })} />
            <Select value={caForm.permitted_method} onValueChange={(v: CompaniesActMethod) => setCaForm({ ...caForm, permitted_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="SLM">SLM</SelectItem><SelectItem value="WDV">WDV</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent>
            </Select>
            <Input type="date" value={caForm.effective_date} onChange={(e) => setCaForm({ ...caForm, effective_date: e.target.value })} />
            <Input placeholder="Source / Reference" value={caForm.source_reference} onChange={(e) => setCaForm({ ...caForm, source_reference: e.target.value })} className="md:col-span-2" />
            <div className="md:col-span-4">
              <Button size="sm" className="gap-1" onClick={async () => { await onAddCaRule(caForm); setCaForm(emptyCaRule); }}>
                <Plus className="w-4 h-4" /> Add Companies Act Rule
              </Button>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead>Useful Life</TableHead>
                <TableHead>Residual %</TableHead><TableHead>Method</TableHead><TableHead>Source</TableHead>
                <TableHead>Active</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {companiesActRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.asset_category}</TableCell>
                    <TableCell>{rule.asset_type}</TableCell>
                    <TableCell>{rule.useful_life} {rule.useful_life_unit}</TableCell>
                    <TableCell>{rule.residual_value_pct}%</TableCell>
                    <TableCell>{rule.permitted_method}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{rule.source_reference}</TableCell>
                    <TableCell><Checkbox checked={rule.active} onCheckedChange={(v) => onToggleCaRule(rule.id, !!v)} /></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => onDeleteCaRule(rule.id)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="it" className="mt-4 space-y-4">
          <Card><CardContent className="p-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input placeholder="Assessment Year (e.g. 2027-28)" value={itForm.assessment_year} onChange={(e) => setItForm({ ...itForm, assessment_year: e.target.value })} />
            <Input placeholder="Financial Year (e.g. 2026-27)" value={itForm.financial_year} onChange={(e) => setItForm({ ...itForm, financial_year: e.target.value })} />
            <Input placeholder="Block of Assets" value={itForm.block_of_assets} onChange={(e) => setItForm({ ...itForm, block_of_assets: e.target.value })} />
            <Input placeholder="Asset Category" value={itForm.asset_category} onChange={(e) => setItForm({ ...itForm, asset_category: e.target.value })} />
            <Input type="number" placeholder="Depreciation Rate %" value={itForm.depreciation_rate_pct} onChange={(e) => setItForm({ ...itForm, depreciation_rate_pct: Number(e.target.value) || 0 })} />
            <Select value={itForm.lt_180_days_treatment} onValueChange={(v: Under180DaysTreatment) => setItForm({ ...itForm, lt_180_days_treatment: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="half_rate">Half Rate</SelectItem>
                <SelectItem value="full_rate">Full Rate</SelectItem>
                <SelectItem value="no_depreciation">No Depreciation</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={itForm.effective_date} onChange={(e) => setItForm({ ...itForm, effective_date: e.target.value })} />
            <Input placeholder="Source / Reference" value={itForm.source_reference} onChange={(e) => setItForm({ ...itForm, source_reference: e.target.value })} />
            <div className="md:col-span-4">
              <Button size="sm" className="gap-1" onClick={async () => { await onAddItRule(itForm); setItForm(emptyItRule); }}>
                <Plus className="w-4 h-4" /> Add Income Tax Rule
              </Button>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>AY</TableHead><TableHead>Block</TableHead><TableHead>Category</TableHead>
                <TableHead>Rate</TableHead><TableHead>&lt;180d Rule</TableHead><TableHead>Source</TableHead>
                <TableHead>Active</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {incomeTaxRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.assessment_year}</TableCell>
                    <TableCell>{rule.block_of_assets}</TableCell>
                    <TableCell>{rule.asset_category}</TableCell>
                    <TableCell>{rule.depreciation_rate_pct}%</TableCell>
                    <TableCell className="text-xs">{rule.lt_180_days_treatment}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{rule.source_reference}</TableCell>
                    <TableCell><Checkbox checked={rule.active} onCheckedChange={(v) => onToggleItRule(rule.id, !!v)} /></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => onDeleteItRule(rule.id)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="gw" className="mt-4">
          <Card><CardContent className="p-4 space-y-4 max-w-md">
            <div className="space-y-1.5">
              <Label>Default Depreciation Rate %</Label>
              <Input type="number" value={gwForm.default_depreciation_rate_pct} onChange={(e) => setGwForm({ ...gwForm, default_depreciation_rate_pct: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label>Default Residual Value (₹)</Label>
              <Input type="number" value={gwForm.default_residual_value} onChange={(e) => setGwForm({ ...gwForm, default_residual_value: Number(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={gwForm.partial_year_depreciation_default} onCheckedChange={(v) => setGwForm({ ...gwForm, partial_year_depreciation_default: !!v })} />
              <Label>Partial-Year Depreciation by Default</Label>
            </div>
            <Button onClick={() => onSaveGenericDefaults(gwForm)}>Save Defaults</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
