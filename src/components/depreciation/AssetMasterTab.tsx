import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Calculator } from "lucide-react";
import { ASSET_STATUS_LABELS, AssetStatus, DepreciationAsset } from "@/types/depreciation";
import { StatusBadge } from "./DepreciationBadges";
import AssetFormDialog from "./AssetFormDialog";

interface AssetMasterTabProps {
  assets: DepreciationAsset[];
  loading: boolean;
  onAdd: (asset: Omit<DepreciationAsset, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdate: (id: string, updates: Partial<DepreciationAsset>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenWorkspace: (assetId: string) => void;
}

export default function AssetMasterTab({ assets, loading, onAdd, onUpdate, onDelete, onOpenWorkspace }: AssetMasterTabProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DepreciationAsset | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(assets.map((a) => a.asset_category))).filter(Boolean), [assets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      const matchesSearch =
        !q ||
        a.asset_code.toLowerCase().includes(q) ||
        a.asset_name.toLowerCase().includes(q) ||
        a.asset_category.toLowerCase().includes(q) ||
        (a.location || "").toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || a.asset_category === categoryFilter;
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assets, search, categoryFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold">Asset Master</h2>
        <Button onClick={() => { setEditing(undefined); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Asset
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input placeholder="Search by Asset ID, Name, Category, Location..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(ASSET_STATUS_LABELS).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading assets...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No assets found. Click "Add Asset" to create one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Acquisition Date</TableHead>
                  <TableHead>Original Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono text-xs">{asset.asset_code}</TableCell>
                    <TableCell>{asset.asset_name}</TableCell>
                    <TableCell>{asset.asset_category}</TableCell>
                    <TableCell>{asset.acquisition_date}</TableCell>
                    <TableCell>₹{asset.original_cost.toLocaleString("en-IN")}</TableCell>
                    <TableCell><StatusBadge status={asset.status} /></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => onOpenWorkspace(asset.id)} className="gap-1">
                        <Calculator className="w-3.5 h-3.5" /> Calculate
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(asset); setFormOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeletingId(asset.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={async (asset) => {
          if (editing) await onUpdate(editing.id, asset);
          else await onAdd(asset);
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the asset and its depreciation configuration. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deletingId) await onDelete(deletingId);
                setDeletingId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
