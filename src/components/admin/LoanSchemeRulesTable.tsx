import { useState, useEffect } from "react";
import { Landmark, Loader2, Pencil, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

interface LoanSchemeRule {
  id: string;
  scheme_id: string;
  bank_name: string | null;
  rule_key: string;
  value: Json;
  effective_date: string;
  source_reference: string;
  notes: string | null;
  active: boolean;
  updated_at: string;
}

const SCHEME_LABELS: Record<string, string> = {
  pmegp: "PMEGP",
  mudra_shishu: "Mudra Shishu",
  mudra_kishor: "Mudra Kishor",
  mudra_tarun: "Mudra Tarun",
  mudra_tarunplus: "Mudra Tarun+",
  cgtmse: "CGTMSE",
  msme_psu: "MSME PSU Bank",
  default: "Default (generic fallback)",
};

const RULE_LABELS: Record<string, string> = {
  scorecard_benchmarks: "Scorecard Benchmarks (incl. DSCR)",
  margin_money_subsidy_pct: "Margin Money Subsidy %",
  promoter_contribution_pct: "Promoter Contribution %",
  term_loan_pct_default: "Term Loan % (default)",
  wc_loan_pct_default: "Working Capital Loan % (default)",
  interest_rate_pct_default: "Interest Rate % (default)",
  moratorium_months_default: "Moratorium (months, default)",
  promoter_floor_pct: "Promoter Floor %",
};

const fmtValue = (value: Json): string => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, Json>)
      .map(([k, v]) => `${k}: ${v}`)
      .join("  ·  ");
  }
  return JSON.stringify(value);
};

const LoanSchemeRulesTable = () => {
  const [rules, setRules] = useState<LoanSchemeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LoanSchemeRule | null>(null);
  const [editValueText, setEditValueText] = useState("");
  const [editSourceRef, setEditSourceRef] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("loan_scheme_rules")
      .select("*")
      .order("scheme_id", { ascending: true })
      .order("rule_key", { ascending: true });

    if (error) {
      console.error("Error fetching loan scheme rules:", error);
      toast({
        title: "Failed to load rules",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setRules(data || []);
    }
    setLoading(false);
  };

  const openEdit = (rule: LoanSchemeRule) => {
    setEditing(rule);
    setEditValueText(JSON.stringify(rule.value, null, 2));
    setEditSourceRef(rule.source_reference);
    setEditNotes(rule.notes || "");
    setEditActive(rule.active);
    setJsonError(null);
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    let parsedValue: Json;
    try {
      parsedValue = JSON.parse(editValueText);
    } catch {
      setJsonError("Not valid JSON — check for a missing quote, comma, or bracket.");
      return;
    }
    setJsonError(null);
    setIsSaving(true);

    const { error } = await supabase
      .from("loan_scheme_rules")
      .update({
        value: parsedValue,
        source_reference: editSourceRef,
        notes: editNotes || null,
        active: editActive,
      })
      .eq("id", editing.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: "Save failed",
        description: error.message.includes("row-level security")
          ? "You don't have admin permission to edit rules."
          : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Rule updated", description: `${SCHEME_LABELS[editing.scheme_id] ?? editing.scheme_id} — ${RULE_LABELS[editing.rule_key] ?? editing.rule_key}` });
    setEditing(null);
    fetchRules();
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Loan Scheme Rules & Rates
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            The single source of truth for PMEGP subsidy tiers, promoter-contribution minimums, DSCR benchmarks,
            and default term-loan/working-capital %. Read by the report-generation backend and the live wizard
            preview — an edit here takes effect within a few minutes (backend cache) without a redeploy.
          </p>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No rules found — has the migration been applied?</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge variant="outline">{SCHEME_LABELS[rule.scheme_id] ?? rule.scheme_id}</Badge>
                        {rule.bank_name && (
                          <span className="ml-1 text-xs text-muted-foreground">({rule.bank_name})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{RULE_LABELS[rule.rule_key] ?? rule.rule_key}</TableCell>
                      <TableCell className="max-w-[360px] truncate text-xs font-mono" title={fmtValue(rule.value)}>
                        {fmtValue(rule.value)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rule.effective_date}</TableCell>
                      <TableCell>
                        {rule.active ? (
                          <Badge variant="secondary">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing && (SCHEME_LABELS[editing.scheme_id] ?? editing.scheme_id)} —{" "}
              {editing && (RULE_LABELS[editing.rule_key] ?? editing.rule_key)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Value (JSON)</label>
              <Textarea
                value={editValueText}
                onChange={(e) => setEditValueText(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              {jsonError && <p className="text-sm text-destructive mt-1">{jsonError}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Source / Reference</label>
              <Input value={editSourceRef} onChange={(e) => setEditSourceRef(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Active</label>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={saveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LoanSchemeRulesTable;
