-- Indian Depreciation & WDV Calculation and Reporting System.
--
-- Asset Master + two Rules & Rates masters (Companies Act, Income Tax) +
-- per-user Generic WDV defaults. The calculation engines themselves live in
-- the frontend (src/lib/depreciation/*.ts) and are pure/stateless — this
-- schema only persists the ASSET DATA and the CONFIGURABLE rules, never a
-- hardcoded rate or useful life.
--
-- Apply in Supabase → SQL Editor.

-- ── Asset Master ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.depreciation_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_code text NOT NULL,
  asset_name text NOT NULL,
  asset_category text NOT NULL,
  asset_sub_category text,
  description text,
  location text,
  department text,
  acquisition_date date NOT NULL,
  date_put_to_use date,
  original_cost numeric NOT NULL DEFAULT 0 CHECK (original_cost >= 0),
  currency text NOT NULL DEFAULT 'INR',
  vendor text,
  invoice_reference text,
  disposal_date date,
  disposal_proceeds numeric,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'fully_depreciated', 'disposed', 'written_off', 'under_construction')),
  -- Per-basis configuration, stored as JSON so each engine's shape can evolve
  -- independently without a schema migration per field.
  companies_act_inputs jsonb,
  income_tax_inputs jsonb,
  generic_wdv_inputs jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT depreciation_assets_disposal_after_acquisition
    CHECK (disposal_date IS NULL OR disposal_date >= acquisition_date),
  CONSTRAINT depreciation_assets_put_to_use_after_acquisition
    CHECK (date_put_to_use IS NULL OR date_put_to_use >= acquisition_date)
);

CREATE INDEX IF NOT EXISTS idx_depreciation_assets_user ON public.depreciation_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_assets_category ON public.depreciation_assets(asset_category);
CREATE INDEX IF NOT EXISTS idx_depreciation_assets_status ON public.depreciation_assets(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_depreciation_assets_user_code ON public.depreciation_assets(user_id, asset_code);

ALTER TABLE public.depreciation_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own depreciation assets" ON public.depreciation_assets;
CREATE POLICY "Users manage their own depreciation assets"
ON public.depreciation_assets FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins and analysts can view all depreciation assets" ON public.depreciation_assets;
CREATE POLICY "Admins and analysts can view all depreciation assets"
ON public.depreciation_assets FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'credit_analyst'::app_role)
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_depreciation_assets_updated_at ON public.depreciation_assets;
CREATE TRIGGER trg_depreciation_assets_updated_at
BEFORE UPDATE ON public.depreciation_assets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Rules & Rates: Companies Act ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.depreciation_companies_act_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_category text NOT NULL,
  asset_type text NOT NULL,
  useful_life numeric NOT NULL CHECK (useful_life > 0),
  useful_life_unit text NOT NULL DEFAULT 'years' CHECK (useful_life_unit IN ('years', 'months')),
  residual_value_pct numeric NOT NULL DEFAULT 0 CHECK (residual_value_pct >= 0 AND residual_value_pct <= 100),
  permitted_method text NOT NULL DEFAULT 'SLM' CHECK (permitted_method IN ('SLM', 'WDV', 'OTHER')),
  effective_date date NOT NULL,
  source_reference text NOT NULL,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.depreciation_companies_act_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read Companies Act rules" ON public.depreciation_companies_act_rules;
CREATE POLICY "Authenticated users can read Companies Act rules"
ON public.depreciation_companies_act_rules FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins manage Companies Act rules" ON public.depreciation_companies_act_rules;
CREATE POLICY "Admins manage Companies Act rules"
ON public.depreciation_companies_act_rules FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ── Rules & Rates: Income Tax ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.depreciation_income_tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_year text NOT NULL,
  financial_year text NOT NULL,
  block_of_assets text NOT NULL,
  asset_category text NOT NULL,
  depreciation_rate_pct numeric NOT NULL CHECK (depreciation_rate_pct >= 0 AND depreciation_rate_pct <= 100),
  lt_180_days_treatment text NOT NULL DEFAULT 'half_rate'
    CHECK (lt_180_days_treatment IN ('half_rate', 'full_rate', 'no_depreciation')),
  effective_date date NOT NULL,
  source_reference text NOT NULL,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.depreciation_income_tax_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read Income Tax rules" ON public.depreciation_income_tax_rules;
CREATE POLICY "Authenticated users can read Income Tax rules"
ON public.depreciation_income_tax_rules FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins manage Income Tax rules" ON public.depreciation_income_tax_rules;
CREATE POLICY "Admins manage Income Tax rules"
ON public.depreciation_income_tax_rules FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ── Generic WDV defaults (per-user) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.depreciation_generic_wdv_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  default_depreciation_rate_pct numeric NOT NULL DEFAULT 20 CHECK (default_depreciation_rate_pct >= 0 AND default_depreciation_rate_pct <= 100),
  default_residual_value numeric NOT NULL DEFAULT 0 CHECK (default_residual_value >= 0),
  partial_year_depreciation_default boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.depreciation_generic_wdv_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own Generic WDV defaults" ON public.depreciation_generic_wdv_defaults;
CREATE POLICY "Users manage their own Generic WDV defaults"
ON public.depreciation_generic_wdv_defaults FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_generic_wdv_defaults_updated_at ON public.depreciation_generic_wdv_defaults;
CREATE TRIGGER trg_generic_wdv_defaults_updated_at
BEFORE UPDATE ON public.depreciation_generic_wdv_defaults
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Seed data — starting point only, fully editable via Rules & Rates UI ────
INSERT INTO public.depreciation_companies_act_rules
  (asset_category, asset_type, useful_life, useful_life_unit, residual_value_pct, permitted_method, effective_date, source_reference, active)
VALUES
  ('Plant & Machinery', 'General (continuous process plant excluded)', 15, 'years', 5, 'WDV', '2014-04-01', 'Schedule II, Companies Act 2013 — Part C, Plant & Machinery (general)', true),
  ('Furniture & Fittings', 'General', 10, 'years', 5, 'SLM', '2014-04-01', 'Schedule II, Companies Act 2013 — Part C, Furniture and Fittings', true),
  ('Computers & Data Processing', 'Servers and networks', 6, 'years', 5, 'SLM', '2014-04-01', 'Schedule II, Companies Act 2013 — Part C, Computers and data processing units', true),
  ('Computers & Data Processing', 'End-user devices (desktops/laptops)', 3, 'years', 5, 'SLM', '2014-04-01', 'Schedule II, Companies Act 2013 — Part C, Computers and data processing units', true),
  ('Office Equipment', 'General', 5, 'years', 5, 'SLM', '2014-04-01', 'Schedule II, Companies Act 2013 — Part C, Office Equipment', true),
  ('Motor Vehicles', 'General (other than those for hire)', 8, 'years', 5, 'WDV', '2014-04-01', 'Schedule II, Companies Act 2013 — Part C, Motor Vehicles', true),
  ('Buildings', 'RCC frame structure', 60, 'years', 5, 'SLM', '2014-04-01', 'Schedule II, Companies Act 2013 — Part C, Buildings', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.depreciation_income_tax_rules
  (assessment_year, financial_year, block_of_assets, asset_category, depreciation_rate_pct, lt_180_days_treatment, effective_date, source_reference, active)
VALUES
  ('2026-27', '2025-26', 'Buildings — mainly residential', 'Buildings', 5, 'half_rate', '2003-04-01', 'Income-tax Rules, 1962 — Appendix I, Block: Buildings (residential)', true),
  ('2026-27', '2025-26', 'Buildings — other than residential', 'Buildings', 10, 'half_rate', '2003-04-01', 'Income-tax Rules, 1962 — Appendix I, Block: Buildings (non-residential)', true),
  ('2026-27', '2025-26', 'Furniture & Fittings', 'Furniture & Fittings', 10, 'half_rate', '2003-04-01', 'Income-tax Rules, 1962 — Appendix I, Block: Furniture and fittings', true),
  ('2026-27', '2025-26', 'Plant & Machinery — General', 'Plant & Machinery', 15, 'half_rate', '2003-04-01', 'Income-tax Rules, 1962 — Appendix I, Block: Machinery and plant (general)', true),
  ('2026-27', '2025-26', 'Computers including Computer Software', 'Computers & Data Processing', 40, 'half_rate', '2003-04-01', 'Income-tax Rules, 1962 — Appendix I, Block: Computers including computer software', true),
  ('2026-27', '2025-26', 'Motor Vehicles — General', 'Motor Vehicles', 15, 'half_rate', '2003-04-01', 'Income-tax Rules, 1962 — Appendix I, Block: Motor vehicles (general)', true),
  ('2026-27', '2025-26', 'Intangible Assets', 'Intangible Assets', 25, 'half_rate', '2003-04-01', 'Income-tax Rules, 1962 — Appendix I, Block: Intangible assets', true)
ON CONFLICT DO NOTHING;
