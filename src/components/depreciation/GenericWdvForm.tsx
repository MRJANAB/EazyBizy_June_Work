import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DepreciationAsset, GenericWdvDefaults, GenericWdvInputs } from "@/types/depreciation";
import { calculateGenericWdv, buildGenericWdvSchedule } from "@/lib/depreciation/genericWdvEngine";

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

interface GenericWdvFormProps {
  asset: DepreciationAsset;
  initial?: GenericWdvInputs | null;
  defaults: GenericWdvDefaults;
  onSave: (inputs: GenericWdvInputs) => void;
}

const defaultInputs = (asset: DepreciationAsset, defaults: GenericWdvDefaults): GenericWdvInputs => ({
  original_cost: asset.original_cost,
  depreciation_rate_pct: defaults.default_depreciation_rate_pct,
  financial_year: "2026-27",
  partial_year_depreciation: defaults.partial_year_depreciation_default,
  residual_value: defaults.default_residual_value || undefined,
});

export default function GenericWdvForm({ asset, initial, defaults, onSave }: GenericWdvFormProps) {
  const [inputs, setInputs] = useState<GenericWdvInputs>(initial || defaultInputs(asset, defaults));
  const [showAudit, setShowAudit] = useState(false);
  const [scheduleYears, setScheduleYears] = useState(5);

  const update = (updates: Partial<GenericWdvInputs>) => setInputs((prev) => ({ ...prev, ...updates }));

  const result = useMemo(() => calculateGenericWdv(inputs), [inputs]);
  const schedule = useMemo(() => buildGenericWdvSchedule(inputs, scheduleYears), [inputs, scheduleYears]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        Generic WDV is a plain mathematical estimate — it is NOT an official Companies Act or Income Tax calculation.
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Original Cost (₹)</Label>
          <Input type="number" min={0} value={inputs.original_cost} onChange={(e) => update({ original_cost: Number(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Opening WDV (₹) — leave blank to use cost</Label>
          <Input type="number" min={0} value={inputs.opening_wdv ?? ""} onChange={(e) => update({ opening_wdv: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
        <div className="space-y-1.5">
          <Label>Depreciation Rate % *</Label>
          <Input type="number" min={0} max={100} value={inputs.depreciation_rate_pct} onChange={(e) => update({ depreciation_rate_pct: Number(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Financial Year</Label>
          <Input value={inputs.financial_year} onChange={(e) => update({ financial_year: e.target.value })} placeholder="2026-27" />
        </div>
        <div className="space-y-1.5">
          <Label>Residual Value (₹)</Label>
          <Input type="number" min={0} value={inputs.residual_value ?? ""} onChange={(e) => update({ residual_value: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox checked={inputs.partial_year_depreciation} onCheckedChange={(v) => update({ partial_year_depreciation: !!v })} />
          <Label className="cursor-pointer" onClick={() => update({ partial_year_depreciation: !inputs.partial_year_depreciation })}>Partial-Year Depreciation</Label>
        </div>
        {inputs.partial_year_depreciation && (
          <>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={inputs.start_date || ""} onChange={(e) => update({ start_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={inputs.end_date || ""} onChange={(e) => update({ end_date: e.target.value })} />
            </div>
          </>
        )}
      </div>

      <Button onClick={() => onSave(inputs)}>Calculate &amp; Save</Button>

      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
          {result.warnings.map((w, i) => <p key={i} className="text-xs text-amber-800">⚠ {w}</p>)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Opening WDV", value: result.opening_wdv },
          { label: "Depreciation Rate", value: undefined, display: `${result.depreciation_rate_pct}%` },
          { label: "Depreciation", value: result.depreciation },
          { label: "Closing WDV", value: result.closing_wdv },
        ].map(({ label, value, display }) => (
          <div key={label} className="rounded-xl border bg-card p-3 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{display ?? fmt(value as number)}</p>
          </div>
        ))}
      </div>

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
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>FY</TableHead>
                <TableHead>Opening WDV</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Depreciation</TableHead>
                <TableHead>Accumulated Dep.</TableHead>
                <TableHead>Closing WDV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((row) => (
                <TableRow key={row.financial_year}>
                  <TableCell>{row.financial_year}</TableCell>
                  <TableCell>{fmt(row.opening_wdv)}</TableCell>
                  <TableCell>{row.rate_pct}%</TableCell>
                  <TableCell>{fmt(row.depreciation)}</TableCell>
                  <TableCell>{fmt(row.accumulated_depreciation)}</TableCell>
                  <TableCell className="font-semibold">{fmt(row.closing_wdv)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
