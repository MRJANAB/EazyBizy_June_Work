import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DepreciationAsset, IncomeTaxBlockInputs, IncomeTaxRule, Under180DaysTreatment } from "@/types/depreciation";
import { calculateIncomeTaxDepreciation, buildIncomeTaxSchedule } from "@/lib/depreciation/incomeTaxEngine";
import { resolveIncomeTaxRule } from "@/lib/depreciation/defaultRules";

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

interface IncomeTaxFormProps {
  asset: DepreciationAsset;
  initial?: IncomeTaxBlockInputs | null;
  rules: IncomeTaxRule[];
  onSave: (inputs: IncomeTaxBlockInputs) => void;
}

const defaultInputs = (asset: DepreciationAsset, rule?: IncomeTaxRule): IncomeTaxBlockInputs => ({
  assessment_year: "2027-28",
  financial_year: "2026-27",
  block_name: rule?.block_of_assets || `${asset.asset_category} Block`,
  asset_type: asset.asset_category,
  applicable_rate_pct: rule?.depreciation_rate_pct ?? 15,
  opening_wdv_of_block: 0,
  additions_lt_180_days: 0,
  additions_gte_180_days: asset.original_cost,
  disposal_sale_consideration: 0,
});

export default function IncomeTaxForm({ asset, initial, rules, onSave }: IncomeTaxFormProps) {
  const matchedRule = resolveIncomeTaxRule(rules, asset.asset_category);
  const [inputs, setInputs] = useState<IncomeTaxBlockInputs>(initial || defaultInputs(asset, matchedRule));
  const [lt180Treatment, setLt180Treatment] = useState<Under180DaysTreatment>(matchedRule?.lt_180_days_treatment || "half_rate");
  const [blockCeases, setBlockCeases] = useState(inputs.block_ceases_to_exist || false);
  const [showAudit, setShowAudit] = useState(false);
  const [scheduleYears, setScheduleYears] = useState(5);

  const update = (updates: Partial<IncomeTaxBlockInputs>) => setInputs((prev) => ({ ...prev, ...updates }));

  const effectiveInputs = { ...inputs, block_ceases_to_exist: blockCeases };
  const result = useMemo(() => calculateIncomeTaxDepreciation(effectiveInputs, lt180Treatment), [effectiveInputs, lt180Treatment]);
  const schedule = useMemo(() => buildIncomeTaxSchedule(effectiveInputs, lt180Treatment, scheduleYears), [effectiveInputs, lt180Treatment, scheduleYears]);

  return (
    <div className="space-y-5">
      {matchedRule && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Matched Tax Rule: <strong>{matchedRule.block_of_assets}</strong> — {matchedRule.depreciation_rate_pct}% rate. Source: {matchedRule.source_reference}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Assessment Year *</Label>
          <Input value={inputs.assessment_year} onChange={(e) => update({ assessment_year: e.target.value })} placeholder="2027-28" />
        </div>
        <div className="space-y-1.5">
          <Label>Financial Year *</Label>
          <Input value={inputs.financial_year} onChange={(e) => update({ financial_year: e.target.value })} placeholder="2026-27" />
        </div>
        <div className="space-y-1.5">
          <Label>Block of Assets *</Label>
          <Input value={inputs.block_name} onChange={(e) => update({ block_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Applicable Depreciation Rate % *</Label>
          <Input type="number" min={0} max={100} value={inputs.applicable_rate_pct} onChange={(e) => update({ applicable_rate_pct: Number(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Opening WDV of Block (₹)</Label>
          <Input type="number" min={0} value={inputs.opening_wdv_of_block} onChange={(e) => update({ opening_wdv_of_block: Number(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Additions Used ≥180 Days (₹)</Label>
          <Input type="number" min={0} value={inputs.additions_gte_180_days} onChange={(e) => update({ additions_gte_180_days: Number(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Additions Used &lt;180 Days (₹)</Label>
          <Input type="number" min={0} value={inputs.additions_lt_180_days} onChange={(e) => update({ additions_lt_180_days: Number(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Disposal / Sale Consideration (₹)</Label>
          <Input type="number" min={0} value={inputs.disposal_sale_consideration} onChange={(e) => update({ disposal_sale_consideration: Number(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>&lt;180-Day Treatment</Label>
          <Select value={lt180Treatment} onValueChange={(v: Under180DaysTreatment) => setLt180Treatment(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="half_rate">Half Rate (statutory default)</SelectItem>
              <SelectItem value="full_rate">Full Rate (rule override)</SelectItem>
              <SelectItem value="no_depreciation">No Depreciation (rule override)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox checked={blockCeases} onCheckedChange={(v) => setBlockCeases(!!v)} />
          <Label className="cursor-pointer" onClick={() => setBlockCeases((b) => !b)}>Block ceases to exist this year (all assets sold/discarded)</Label>
        </div>
      </div>

      <Button onClick={() => onSave(effectiveInputs)}>Calculate &amp; Save</Button>

      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
          {result.warnings.map((w, i) => <p key={i} className="text-xs text-amber-800">⚠ {w}</p>)}
        </div>
      )}

      {result.block_ceased ? (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">Block Ceased to Exist — No Depreciation Allowed</p>
          {result.short_term_capital_gain_loss !== undefined && (
            <p className="text-sm text-red-600 mt-1">Short-Term Capital Gain: {fmt(result.short_term_capital_gain_loss)}</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Opening WDV", value: result.opening_wdv },
            { label: "Full-Rate Depreciation", value: result.full_depreciation },
            { label: "Restricted Depreciation (<180d)", value: result.restricted_depreciation },
            { label: "Closing Tax WDV", value: result.closing_wdv },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border bg-card p-3 space-y-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{fmt(value)}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs font-semibold text-blue-700">This is the TAX WDV, not the book carrying value.</p>

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
                <TableHead>Opening Block WDV</TableHead>
                <TableHead>Additions</TableHead>
                <TableHead>Disposal Adj.</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Full Dep.</TableHead>
                <TableHead>Restricted Dep.</TableHead>
                <TableHead>Total Dep.</TableHead>
                <TableHead>Closing Block WDV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((row) => (
                <TableRow key={row.financial_year}>
                  <TableCell>{row.financial_year}</TableCell>
                  <TableCell>{fmt(row.opening_block_wdv)}</TableCell>
                  <TableCell>{fmt(row.additions)}</TableCell>
                  <TableCell>{fmt(row.disposal_adjustment)}</TableCell>
                  <TableCell>{row.rate_pct}%</TableCell>
                  <TableCell>{fmt(row.full_depreciation)}</TableCell>
                  <TableCell>{fmt(row.restricted_depreciation)}</TableCell>
                  <TableCell>{fmt(row.total_depreciation)}</TableCell>
                  <TableCell className="font-semibold">{fmt(row.closing_block_wdv)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
