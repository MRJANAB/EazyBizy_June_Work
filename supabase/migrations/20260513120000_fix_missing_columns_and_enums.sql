-- ============================================================
-- EazyBizy: Complete Fix — Enums + Columns + Loan Type
-- Safe to run multiple times (all IF NOT EXISTS / ON CONFLICT)
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. LOAN SCHEME enum — add all Mudra sub-schemes + CGTMSE ─────────────────
ALTER TYPE public.gtab_loan_scheme ADD VALUE IF NOT EXISTS 'mudra_shishu';
ALTER TYPE public.gtab_loan_scheme ADD VALUE IF NOT EXISTS 'mudra_kishor';
ALTER TYPE public.gtab_loan_scheme ADD VALUE IF NOT EXISTS 'mudra_tarun';
ALTER TYPE public.gtab_loan_scheme ADD VALUE IF NOT EXISTS 'mudra_tarunplus';
ALTER TYPE public.gtab_loan_scheme ADD VALUE IF NOT EXISTS 'cgtmse';

-- ── 2. SOCIAL CATEGORY enum — add special categories ─────────────────────────
-- These are in the frontend dropdown but missing from the DB enum.
-- Saving Women / Ex-Serviceman / PwD was silently rejected before this fix.
ALTER TYPE public.gtab_social_category ADD VALUE IF NOT EXISTS 'women';
ALTER TYPE public.gtab_social_category ADD VALUE IF NOT EXISTS 'ex_serviceman';
ALTER TYPE public.gtab_social_category ADD VALUE IF NOT EXISTS 'pwd';

-- ── 3. REGISTRATION TYPE enum — add OPC / HUF / Cooperative / Trust ──────────
ALTER TYPE public.gtab_registration_type ADD VALUE IF NOT EXISTS 'opc';
ALTER TYPE public.gtab_registration_type ADD VALUE IF NOT EXISTS 'huf';
ALTER TYPE public.gtab_registration_type ADD VALUE IF NOT EXISTS 'cooperative';
ALTER TYPE public.gtab_registration_type ADD VALUE IF NOT EXISTS 'trust';

-- ── 4. EazyBizy MSME loan type (app fetches this by name on save) ─────────────
INSERT INTO public.loan_types (
  name, description,
  min_amount, max_amount,
  interest_rate,
  tenure_months_min, tenure_months_max,
  icon
)
SELECT
  'EazyBizy MSME',
  'EazyBizy CMA/DPR loan application — government scheme',
  10000, 50000000,
  10.5,
  12, 120,
  'briefcase'
WHERE NOT EXISTS (
  SELECT 1 FROM public.loan_types WHERE name = 'EazyBizy MSME'
);

-- ── 5. project_report_inputs — CRITICAL (Step 9 CMA data) ────────────────────
-- Without this column, all promoter details, loan structure, revenue
-- projections and production params entered in Step 9 are lost on save.
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS project_report_inputs JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── 6. DPR report tracking columns ───────────────────────────────────────────
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS dpr_api_payload         JSONB,
  ADD COLUMN IF NOT EXISTS dpr_calculation_result  JSONB,
  ADD COLUMN IF NOT EXISTS dpr_report_id           TEXT,
  ADD COLUMN IF NOT EXISTS dpr_download_url        TEXT,
  ADD COLUMN IF NOT EXISTS dpr_generated_at        TIMESTAMPTZ;

-- ── 7. PMEGP + scheme-specific fields ────────────────────────────────────────
-- area_type  → determines subsidy % (Urban 15/25%, Rural 25/35%)
-- is_second_loan → PMEGP 2nd loan raises project cost cap to Rs.1Cr
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS area_type              TEXT    DEFAULT 'rural',
  ADD COLUMN IF NOT EXISTS implementing_agency    TEXT,
  ADD COLUMN IF NOT EXISTS is_second_loan         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_bank         TEXT;

-- ── 8. Address — district field ───────────────────────────────────────────────
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS district TEXT;

-- ── 9. Salary structure fields ────────────────────────────────────────────────
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS skilled_workers_count       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skilled_workers_salary      NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS semi_skilled_workers_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS semi_skilled_workers_salary NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wages_count                 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wages_salary                NUMERIC DEFAULT 0;

-- ── 10. Narrative text fields (Step 4 — PDF report sections) ─────────────────
-- These are user-written narrative sections that appear verbatim in the PDF.
-- Previously only saved to localStorage — lost if user cleared browser cache.
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS introduction_text        TEXT,
  ADD COLUMN IF NOT EXISTS market_aspects_text      TEXT,
  ADD COLUMN IF NOT EXISTS management_aspects_text  TEXT,
  ADD COLUMN IF NOT EXISTS technical_aspects_text   TEXT,
  ADD COLUMN IF NOT EXISTS financial_aspects_text   TEXT;

-- ── 10. RLS — ensure new JSONB column is covered by existing policies ─────────
-- The existing RLS policies use (user_id = auth.uid()) which covers all columns
-- on the row automatically — no additional policy changes needed.

-- ── Done ──────────────────────────────────────────────────────────────────────
-- After running this migration:
-- 1. Regenerate Supabase types:
--    npx supabase gen types typescript --project-id oufwdhgzozngsdhqmdui > src/integrations/supabase/types.ts
-- 2. Start a fresh new application in EazyBizy (not resume old draft)
-- 3. All 10 steps will auto-fill with demo data
-- 4. Generate report from Step 10
