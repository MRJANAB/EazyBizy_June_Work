import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompaniesActRule, GenericWdvDefaults, IncomeTaxRule } from "@/types/depreciation";
import { SEED_COMPANIES_ACT_RULES, SEED_INCOME_TAX_RULES } from "@/lib/depreciation/defaultRules";
import { useAuth } from "@/hooks/useAuth";

/**
 * Rules & Rates data access. Falls back to the in-memory SEED_* defaults
 * (with a synthetic id) if the database has no rows yet or the tables
 * aren't reachable — so the app is usable immediately after deploy, before
 * the migration has necessarily been applied everywhere. Once real rows
 * exist in the DB they take over.
 */
export function useCompaniesActRules() {
  const [rules, setRules] = useState<CompaniesActRule[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("depreciation_companies_act_rules" as never).select("*");
    if (error || !data || (data as unknown[]).length === 0) {
      setRules(SEED_COMPANIES_ACT_RULES.map((r, i) => ({ ...r, id: `seed-ca-${i}` })));
    } else {
      setRules(data as unknown as CompaniesActRule[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addRule = useCallback(async (rule: Omit<CompaniesActRule, "id">) => {
    const { error } = await supabase.from("depreciation_companies_act_rules" as never).insert(rule as never);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const updateRule = useCallback(async (id: string, updates: Partial<CompaniesActRule>) => {
    const { error } = await supabase.from("depreciation_companies_act_rules" as never).update(updates as never).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const deleteRule = useCallback(async (id: string) => {
    const { error } = await supabase.from("depreciation_companies_act_rules" as never).delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  return { rules, loading, refresh, addRule, updateRule, deleteRule };
}

export function useIncomeTaxRules() {
  const [rules, setRules] = useState<IncomeTaxRule[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("depreciation_income_tax_rules" as never).select("*");
    if (error || !data || (data as unknown[]).length === 0) {
      setRules(SEED_INCOME_TAX_RULES.map((r, i) => ({ ...r, id: `seed-it-${i}` })));
    } else {
      setRules(data as unknown as IncomeTaxRule[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addRule = useCallback(async (rule: Omit<IncomeTaxRule, "id">) => {
    const { error } = await supabase.from("depreciation_income_tax_rules" as never).insert(rule as never);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const updateRule = useCallback(async (id: string, updates: Partial<IncomeTaxRule>) => {
    const { error } = await supabase.from("depreciation_income_tax_rules" as never).update(updates as never).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const deleteRule = useCallback(async (id: string) => {
    const { error } = await supabase.from("depreciation_income_tax_rules" as never).delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  return { rules, loading, refresh, addRule, updateRule, deleteRule };
}

export function useGenericWdvDefaults() {
  const { user } = useAuth();
  const [defaults, setDefaults] = useState<GenericWdvDefaults>({
    id: "local-default",
    default_depreciation_rate_pct: 20,
    default_residual_value: 0,
    partial_year_depreciation_default: false,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("depreciation_generic_wdv_defaults" as never)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setDefaults(data as unknown as GenericWdvDefaults);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (updates: Partial<GenericWdvDefaults>) => {
      if (!user) return;
      const { error } = await supabase
        .from("depreciation_generic_wdv_defaults" as never)
        .upsert({ ...defaults, ...updates, user_id: user.id } as never, { onConflict: "user_id" });
      if (error) throw error;
      await refresh();
    },
    [user, defaults, refresh],
  );

  return { defaults, loading, save };
}
