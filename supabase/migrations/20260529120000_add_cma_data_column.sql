-- ============================================================
-- EazyBizy: Credit Analyst CMA Data Column + Supporting Fields
-- Safe to run multiple times (all IF NOT EXISTS)
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. cma_data — stores the full CA wizard draft (CMAFormData JSON)
-- Used by AdvancedCMAWizard handleSaveDraft / fetchApplicationData
-- hasCmaDraft in CreditAnalystDashboard reads this column directly
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS cma_data JSONB;

-- ── 2. cma_submitted_at — timestamp when CA last generated/submitted a report
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS cma_submitted_at TIMESTAMPTZ;

-- ── 3. cma_status — tracks progress through the CA workflow
--    values: 'draft' | 'review' | 'approved' | 'rejected'
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS cma_status TEXT DEFAULT 'draft';

-- ── 4. ca_remarks — internal CA notes/remarks on the application
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS ca_remarks TEXT;

-- ── 5. employee_count + salary_per_employee — used for manpower mapping
--    from GTAB Step 7 (Office Staff category) into CMA wizard
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS employee_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salary_per_employee   NUMERIC DEFAULT 0;

-- ── 6. total_project_cost — denormalised for quick dashboard display
--    without re-summing project_cost JSONB each time
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS total_project_cost    NUMERIC DEFAULT 0;

-- ── 7. margin_money — PMEGP/Mudra subsidy amount
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS margin_money          NUMERIC DEFAULT 0;

-- ── 8. eligible_loan_amount — final sanctioned loan (may differ from applied)
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS eligible_loan_amount  NUMERIC DEFAULT 0;

-- ── 9. Index on cma_data for faster dashboard hasCmaDraft check
CREATE INDEX IF NOT EXISTS idx_loan_applications_cma_data
  ON public.loan_applications
  USING gin (cma_data);

-- ── Done ──────────────────────────────────────────────────────────────────────
-- After running:
--   npx supabase gen types typescript --project-id <your-project-id> \
--     > src/integrations/supabase/types.ts
-- Then restart the frontend dev server so the new types are picked up.
