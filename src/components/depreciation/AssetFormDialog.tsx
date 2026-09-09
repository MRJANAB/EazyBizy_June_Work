import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ASSET_STATUS_LABELS, AssetStatus, DepreciationAsset } from "@/types/depreciation";

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: DepreciationAsset;
  onSubmit: (asset: Omit<DepreciationAsset, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
}

const empty: Omit<DepreciationAsset, "id" | "user_id" | "created_at" | "updated_at"> = {
  asset_code: "",
  asset_name: "",
  asset_category: "",
  asset_sub_category: "",
  description: "",
  location: "",
  department: "",
  acquisition_date: new Date().toISOString().slice(0, 10),
  date_put_to_use: "",
  original_cost: 0,
  currency: "INR",
  vendor: "",
  invoice_reference: "",
  disposal_date: "",
  disposal_proceeds: undefined,
  status: "active",
};

export default function AssetFormDialog({ open, onOpenChange, initial, onSubmit }: AssetFormDialogProps) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setForm({ ...empty, ...initial });
    } else {
      setForm(empty);
    }
    setError(null);
  }, [initial, open]);

  const update = (updates: Partial<typeof form>) => setForm((f) => ({ ...f, ...updates }));

  const validate = (): string | null => {
    if (!form.asset_code.trim()) return "Asset ID is required.";
    if (!form.asset_name.trim()) return "Asset Name is required.";
    if (!form.asset_category.trim()) return "Asset Category is required.";
    if (form.original_cost < 0) return "Original cost cannot be negative.";
    if (!form.acquisition_date) return "Acquisition date is required.";
    if (form.date_put_to_use && form.date_put_to_use < form.acquisition_date) {
      return "Date put to use cannot precede the acquisition date.";
    }
    if (form.disposal_date && form.disposal_date < form.acquisition_date) {
      return "Disposal date cannot precede the acquisition date.";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save asset.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Asset" : "Add Asset"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Asset ID *</Label>
            <Input value={form.asset_code} onChange={(e) => update({ asset_code: e.target.value })} placeholder="AST-001" />
          </div>
          <div className="space-y-1.5">
            <Label>Asset Name *</Label>
            <Input value={form.asset_name} onChange={(e) => update({ asset_name: e.target.value })} placeholder="CNC Machine" />
          </div>
          <div className="space-y-1.5">
            <Label>Asset Category *</Label>
            <Input value={form.asset_category} onChange={(e) => update({ asset_category: e.target.value })} placeholder="Plant & Machinery" />
          </div>
          <div className="space-y-1.5">
            <Label>Asset Sub-category</Label>
            <Input value={form.asset_sub_category} onChange={(e) => update({ asset_sub_category: e.target.value })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => update({ description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => update({ location: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => update({ department: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Acquisition Date *</Label>
            <Input type="date" value={form.acquisition_date} onChange={(e) => update({ acquisition_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Date Put to Use</Label>
            <Input type="date" value={form.date_put_to_use || ""} onChange={(e) => update({ date_put_to_use: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Original Cost (₹) *</Label>
            <Input type="number" min={0} value={form.original_cost || ""} onChange={(e) => update({ original_cost: Number(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => update({ currency: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <Input value={form.vendor} onChange={(e) => update({ vendor: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Invoice / Reference Number</Label>
            <Input value={form.invoice_reference} onChange={(e) => update({ invoice_reference: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Disposal Date</Label>
            <Input type="date" value={form.disposal_date || ""} onChange={(e) => update({ disposal_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Disposal Proceeds (₹)</Label>
            <Input type="number" min={0} value={form.disposal_proceeds ?? ""} onChange={(e) => update({ disposal_proceeds: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Asset Status</Label>
            <Select value={form.status} onValueChange={(v: AssetStatus) => update({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : initial ? "Save Changes" : "Add Asset"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
