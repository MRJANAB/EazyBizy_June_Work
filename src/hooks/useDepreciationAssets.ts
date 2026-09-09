import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CompaniesActInputs,
  DepreciationAsset,
  GenericWdvInputs,
  IncomeTaxBlockInputs,
} from "@/types/depreciation";

interface AssetRow {
  id: string;
  user_id: string;
  asset_code: string;
  asset_name: string;
  asset_category: string;
  asset_sub_category: string | null;
  description: string | null;
  location: string | null;
  department: string | null;
  acquisition_date: string;
  date_put_to_use: string | null;
  original_cost: number;
  currency: string;
  vendor: string | null;
  invoice_reference: string | null;
  disposal_date: string | null;
  disposal_proceeds: number | null;
  status: string;
  companies_act_inputs: CompaniesActInputs | null;
  income_tax_inputs: IncomeTaxBlockInputs | null;
  generic_wdv_inputs: GenericWdvInputs | null;
  created_at: string;
  updated_at: string;
}

const fromRow = (row: AssetRow): DepreciationAsset => ({
  id: row.id,
  user_id: row.user_id,
  asset_code: row.asset_code,
  asset_name: row.asset_name,
  asset_category: row.asset_category,
  asset_sub_category: row.asset_sub_category || undefined,
  description: row.description || undefined,
  location: row.location || undefined,
  department: row.department || undefined,
  acquisition_date: row.acquisition_date,
  date_put_to_use: row.date_put_to_use || undefined,
  original_cost: Number(row.original_cost) || 0,
  currency: row.currency,
  vendor: row.vendor || undefined,
  invoice_reference: row.invoice_reference || undefined,
  disposal_date: row.disposal_date || undefined,
  disposal_proceeds: row.disposal_proceeds != null ? Number(row.disposal_proceeds) : undefined,
  status: row.status as DepreciationAsset["status"],
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export interface AssetBasisConfig {
  companies_act_inputs?: CompaniesActInputs | null;
  income_tax_inputs?: IncomeTaxBlockInputs | null;
  generic_wdv_inputs?: GenericWdvInputs | null;
}

export function useDepreciationAssets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<DepreciationAsset[]>([]);
  const [basisConfig, setBasisConfig] = useState<Record<string, AssetBasisConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("depreciation_assets" as never)
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const rows = (data as unknown as AssetRow[]) || [];
    setAssets(rows.map(fromRow));
    const configMap: Record<string, AssetBasisConfig> = {};
    rows.forEach((row) => {
      configMap[row.id] = {
        companies_act_inputs: row.companies_act_inputs,
        income_tax_inputs: row.income_tax_inputs,
        generic_wdv_inputs: row.generic_wdv_inputs,
      };
    });
    setBasisConfig(configMap);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addAsset = useCallback(
    async (asset: Omit<DepreciationAsset, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user) throw new Error("Not signed in.");
      const { data, error: insertError } = await supabase
        .from("depreciation_assets" as never)
        .insert({ ...asset, user_id: user.id } as never)
        .select("*")
        .single();
      if (insertError) throw insertError;
      await refresh();
      return fromRow(data as unknown as AssetRow);
    },
    [user, refresh],
  );

  const updateAsset = useCallback(
    async (id: string, updates: Partial<DepreciationAsset> & AssetBasisConfig) => {
      const { error: updateError } = await supabase
        .from("depreciation_assets" as never)
        .update(updates as never)
        .eq("id", id);
      if (updateError) throw updateError;
      await refresh();
    },
    [refresh],
  );

  const deleteAsset = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase
        .from("depreciation_assets" as never)
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;
      await refresh();
    },
    [refresh],
  );

  return { assets, basisConfig, loading, error, refresh, addAsset, updateAsset, deleteAsset };
}
