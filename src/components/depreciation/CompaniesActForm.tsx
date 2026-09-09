import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompaniesActInputs, CompaniesActMethod, COMPANIES_ACT_METHOD_LABELS, DepreciationAsset } from "@/types/depreciation";
import { calculateCompaniesActDepreciation, buildCompaniesActSchedule } from "@/lib/depreciation/companiesActEngine";
import { CompaniesActRule } from "@/types/depreciation";
import { resolveCompaniesActRule } from "@/lib/depreciation/defaultRules";

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

interface CompaniesActFormProps {
  asset: DepreciationAsset;
  initial?: CompaniesActInputs | null;
  rules: CompaniesActRule[];
  onSave: (inputs: CompaniesActInputs) => void;
}

const defaultInputs = (asset: DepreciationAsset, rule?: CompaniesActRule): CompaniesActInputs => ({
  asset_type: rule?.asset_type || "",
  useful_life: rule?.useful_life || 10,
  useful_life_unit: rule?.useful_life_unit || "years",
  residual_value_pct: rule?.residual_value_pct ?? 5,
  method: rule?.permitted_method || "SLM",
  financial_year: "2026-27",
  date_available_for_use: asset.date_put_to_use,
});

export default function CompaniesActForm({ asset, initial, rules, onSave }: CompaniesActFormProps) {
  const matchedRule = resolveCompaniesActRule(rules, asset.asset_category);
  const [inputs, setInputs] = useState<CompaniesActInputs>(initial || defaultInputs(asset, matchedRule));
  const [showAudit, setShowAudit] = useState(false);
  const [scheduleYears, setScheduleYears] = useState(10);

  const update = (updates: Partial<CompaniesActInputs>) => setInputs((prev) => ({ ...prev, ...updates }));

  const result = useMemo(() => calculateCompaniesActDepreciation(inputs, asset.original_cost), [inputs, asset.original_cost]);
  const schedule = useMemo(() => buildCompaniesActSchedule(inputs, asset.original_cost, scheduleYears), [inputs, asset.original_cost, scheduleYears]);

  return (
    <div className="space-y-5">
      {matchedRule && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Matched Rule: <strong>{matchedRule.asset_category}</strong> — {matchedRule.useful_life} {matchedRule.useful_life_unit}, {matchedRule.residual_value_pct}% residual, {COMPANIES_ACT_METHOD_LABELS[matchedRule.permitted_method]}. Source: {matchedRule.source_reference}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Asset Type</Label>
          <Input value={inputs.asset_type} onChange={(e) => update({ asset_type: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Useful Life</Label>
          <Input type="number" min={0.01} value={inputs.useful_life} onChange={(e) => update({ useful_life: Number(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Useful Life Unit</Label>
          <Select value={inputs.useful_life_unit} onValueChange={(v: "years" | "months") => update({ useful_life_unit: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="years">Years</SelectItem>
              <SelectItem value="months">Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Residual Value %</Label>
          <Input type="number" min={0} max={100} value={inputs.residual_value_pct ?? ""} onChange={(e) => update({ residual_value_pct: Number(e.target.value) || 0, residual_value: undefined })} />
        </div>
        <div className="space-y-1.5">
          <Label>Residual Value (₹) — overrides %</Label>
          <Input type="number" min={0} value={inputs.residual_value ?? ""} placeholder="Leave blank to use %" onChange={(e) => update({ residual_value: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
        <div className="space-y-1.5">
          <Label>Depreciation Method</Label>
          <Select value={inputs.method} onValueChange={(v: CompaniesActMethod) => update({ method: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(COMPANIES_ACT_METHOD_LABELS) as [CompaniesActMethod, string][]).map(([v, label]) => (
                <SelectItem key={v} value={v}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {inputs.method === "OTHER" && (
          <div className="space-y-1.5">
            <Label>Configured Accounting Rate %</Label>
            <Input type="number" min={0} max={100} value={inputs.other_method_rate_pct ?? ""} onChange={(e) => update({ other_method_rate_pct: Number(e.target.value) || 0 })} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Financial Year</Label>
          <Input value={inputs.financial_year} onChange={(e) => update({ financial_year: e.target.value })} placeholder="2026-27" />
        </div>
        <div className="space-y-1.5">
          <Label>Date Available for Use</Label>
          <Input type="date" value={inputs.date_available_for_use || ""} onChange={(e) => update({ date_available_for_use: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Opening Carrying Amount (₹)</Label>
          <Input type="number" min={0} value={inputs.opening_carrying_amount ?? ""} placeholder={`Default: Cost ₹${asset.original_cost.toLocaleString("en-IN")}`} onChange={(e) => update({ opening_carrying_amount: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
        <div className="space-y-1.5">
          <Label>Opening Accumulated Depreciation (₹)</Label>
          <Input type="number" min={0} value={inputs.opening_accumulated_depreciation ?? ""} onChange={(e) => update({ opening_accumulated_depreciation: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </div>

      <Button onClick={() => onSave(inputs)}>Calculate &amp; Save</Button>

      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
          {result.warnings.map((w, i) => <p key={i} className="text-xs text-amber-800">⚠ {w}</p>)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Gross Block", value: result.gross_block },
          { label: "Residual Value", value: result.residual_value },
          { label: "Current-Year Depreciation", value: result.current_year_depreciation },
          { label: "Closing Carrying Amount (NBV)", value: result.closing_carrying_amount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border bg-card p-3 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{fmt(value)}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Remaining Useful Life: {result.remaining_useful_life_years} yrs
        {result.pro_rata_applied && ` · Pro-rata applied (${result.pro_rata_days} days this FY)`}
        {result.is_fully_depreciated && " · Fully depreciated"}
      </p>

      <Button variant="outline" size="sm" onClick={() => setShowAudit((s) => !s)}>
        {showAudit ? "Hide" : "View"} Calculation
      </Button>
      {showAudit && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          {result.calculation_steps.map((step, i) => (
            <p key={i} className="text-xs font-mono text-slate-700">{i + 1}. {step}</p>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Multi-Year Schedule</Label>
          <Select value={String(scheduleYears)} onValueChange={(v) => setScheduleYears(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Year</SelectItem>
              <SelectItem value="5">5 Years</SelectItem>
              <SelectItem value="10">10 Years</SelectItem>
              <SelectItem value="30">Full Asset Life</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>FY</TableHead>
                <TableHead>Gross Block</TableHead>
                <TableHead>Opening Acc. Dep.</TableHead>
                <TableHead>Current Dep.</TableHead>
                <TableHead>Closing Acc. Dep.</TableHead>
                <TableHead>Net Book Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((row) => (
                <TableRow key={row.financial_year}>
                  <TableCell>{row.financial_year}</TableCell>
                  <TableCell>{fmt(row.gross_block)}</TableCell>
                  <TableCell>{fmt(row.opening_accumulated_depreciation)}</TableCell>
                  <TableCell>{fmt(row.current_depreciation)}</TableCell>
                  <TableCell>{fmt(row.closing_accumulated_depreciation)}</TableCell>
                  <TableCell className="font-semibold">{fmt(row.net_book_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
