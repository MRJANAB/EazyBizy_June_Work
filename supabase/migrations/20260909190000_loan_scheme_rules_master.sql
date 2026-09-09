-- Loan Scheme Rules & Rates Master.
--
-- Single source of truth for the financing-split numbers that were
-- previously hardcoded (and, in places, disagreeing) across multiple
-- backend and frontend files: PMEGP margin-money subsidy tiers, promoter
-- contribution minimums, bank scorecard benchmarks (incl. DSCR), default
-- term-loan/working-capital bank-finance %, default interest rate, and
-- scheme-specific moratorium overrides.
--
-- Design: one flexible table rather than one-per-rule-type. `value` is
-- jsonb so a flat number ({"default": 10.5}), a tiered table (PMEGP's
-- category x area subsidy grid), or a scheme's whole benchmark set can
-- all be stored without a schema migration per rule shape. `bank_name`
-- is nullable (NULL = applies to every bank) so bank-specific overrides
-- can be added later without a new migration.
--
-- Seed data below is exactly the set of values already live in
-- production (backend/schemes/*.py, backend/core/engine.py) — applying
-- this migration changes nothing functionally on day 1; the backend
-- Rules Engine (backend/rules/) is what actually switches the read path
-- from hardcoded constants to these rows.
--
-- Apply in Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS public.loan_scheme_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id text NOT NULL
    CHECK (scheme_id IN (
      'pmegp', 'mudra_shishu', 'mudra_kishor', 'mudra_tarun', 'mudra_tarunplus',
      'cgtmse', 'msme_psu', 'default'
    )),
  bank_name text,
  rule_key text NOT NULL
    CHECK (rule_key IN (
      'scorecard_benchmarks', 'margin_money_subsidy_pct', 'promoter_contribution_pct',
      'term_loan_pct_default', 'wc_loan_pct_default', 'interest_rate_pct_default',
      'moratorium_months_default', 'promoter_floor_pct'
    )),
  value jsonb NOT NULL,
  effective_date date NOT NULL,
  source_reference text NOT NULL,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loan_scheme_rules_lookup
  ON public.loan_scheme_rules(scheme_id, rule_key, active);

-- Enforce one active row per (scheme, bank, rule, effective_date) — treat
-- NULL bank_name ("all banks") as its own single slot via COALESCE.
CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_scheme_rules_unique
  ON public.loan_scheme_rules(scheme_id, COALESCE(bank_name, ''), rule_key, effective_date);

ALTER TABLE public.loan_scheme_rules ENABLE ROW LEVEL SECURITY;

-- Published scheme/bank rates are reference data, not user data — readable
-- by anyone (including the unauthenticated backend service), same as a
-- bank's public interest-rate sheet. Only writes are admin-gated.
DROP POLICY IF EXISTS "Anyone can read loan scheme rules" ON public.loan_scheme_rules;
CREATE POLICY "Anyone can read loan scheme rules"
ON public.loan_scheme_rules FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins manage loan scheme rules" ON public.loan_scheme_rules;
CREATE POLICY "Admins manage loan scheme rules"
ON public.loan_scheme_rules FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_loan_scheme_rules_updated_at ON public.loan_scheme_rules;
CREATE TRIGGER trg_loan_scheme_rules_updated_at
BEFORE UPDATE ON public.loan_scheme_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Seed: Bank Scorecard Benchmarks (incl. DSCR) ────────────────────────────
-- Source: backend/core/engine.py SCHEME_BENCHMARKS, as used by validator.py
-- and scorecard.py. dscr_avg here is also the canonical value that
-- schemes/router.py's per-scheme "dscr_benchmark" field must read from
-- (it previously duplicated these numbers in a second hardcoded table).
INSERT INTO public.loan_scheme_rules (scheme_id, rule_key, value, effective_date, source_reference, notes) VALUES
('pmegp',           'scorecard_benchmarks', '{"dscr_avg":1.25,"current_ratio":1.33,"debt_equity":3.0,"ebitda_margin":20.0,"net_margin":10.0,"interest_coverage":2.0,"tol_tnw":4.0,"promoter_pct":10.0}', '2026-01-01', 'RBI Master Circular on Lending to MSE Sector + KVIC PMEGP guidelines', 'Standard full-CMA bank scorecard thresholds'),
('mudra_shishu',    'scorecard_benchmarks', '{"dscr_avg":1.10,"current_ratio":1.20,"debt_equity":4.0,"ebitda_margin":15.0,"net_margin":8.0,"interest_coverage":1.5,"tol_tnw":5.0,"promoter_pct":10.0}',  '2026-01-01', 'PM MUDRA Yojana scheme guidelines (Shishu tier, simplified appraisal)', 'Lower thresholds — micro-loan simplified scoring'),
('mudra_kishor',    'scorecard_benchmarks', '{"dscr_avg":1.10,"current_ratio":1.20,"debt_equity":4.0,"ebitda_margin":15.0,"net_margin":8.0,"interest_coverage":1.5,"tol_tnw":5.0,"promoter_pct":10.0}',  '2026-01-01', 'PM MUDRA Yojana scheme guidelines (Kishor tier, light CMA)', NULL),
('mudra_tarun',     'scorecard_benchmarks', '{"dscr_avg":1.25,"current_ratio":1.33,"debt_equity":3.0,"ebitda_margin":20.0,"net_margin":10.0,"interest_coverage":2.0,"tol_tnw":4.0,"promoter_pct":10.0}', '2026-01-01', 'PM MUDRA Yojana scheme guidelines (Tarun tier, full CMA)', NULL),
('mudra_tarunplus', 'scorecard_benchmarks', '{"dscr_avg":1.25,"current_ratio":1.33,"debt_equity":3.0,"ebitda_margin":20.0,"net_margin":10.0,"interest_coverage":2.0,"tol_tnw":4.0,"promoter_pct":10.0}', '2026-01-01', 'RBI circular 2023 (Tarun Plus tier), full CMA', NULL),
('cgtmse',          'scorecard_benchmarks', '{"dscr_avg":1.25,"current_ratio":1.33,"debt_equity":3.0,"ebitda_margin":20.0,"net_margin":10.0,"interest_coverage":2.0,"tol_tnw":4.0,"promoter_pct":10.0}', '2026-01-01', 'CGTMSE scheme guidelines, standard bank scorecard', NULL),
('msme_psu',        'scorecard_benchmarks', '{"dscr_avg":1.25,"current_ratio":1.33,"debt_equity":3.0,"ebitda_margin":20.0,"net_margin":10.0,"interest_coverage":2.0,"tol_tnw":4.0,"promoter_pct":20.0}', '2026-01-01', 'PSU bank MSME lending norms — 20-25% promoter margin standard', 'Higher promoter margin than subsidy-linked schemes'),
('default',         'scorecard_benchmarks', '{"dscr_avg":1.25,"current_ratio":1.33,"debt_equity":3.0,"ebitda_margin":20.0,"net_margin":10.0,"interest_coverage":2.0,"tol_tnw":4.0,"promoter_pct":10.0}', '2026-01-01', 'Generic fallback — standard full-CMA bank scorecard thresholds', NULL)
ON CONFLICT (scheme_id, COALESCE(bank_name, ''), rule_key, effective_date) DO NOTHING;

-- ── Seed: PMEGP Margin Money Subsidy (category x area) ──────────────────────
INSERT INTO public.loan_scheme_rules (scheme_id, rule_key, value, effective_date, source_reference, notes) VALUES
('pmegp', 'margin_money_subsidy_pct', '{"general_urban":15,"general_rural":25,"special_urban":25,"special_rural":35}', '2026-01-01', 'KVIC PMEGP Guidelines — Margin Money (Subsidy) table', 'Special = SC/ST/OBC/Women/Minority/Ex-Serviceman/PwD')
ON CONFLICT (scheme_id, COALESCE(bank_name, ''), rule_key, effective_date) DO NOTHING;

-- ── Seed: Promoter Contribution % ───────────────────────────────────────────
INSERT INTO public.loan_scheme_rules (scheme_id, rule_key, value, effective_date, source_reference, notes) VALUES
('pmegp',           'promoter_contribution_pct', '{"general":10,"special":5}', '2026-01-01', 'KVIC PMEGP Guidelines — Beneficiary''s own contribution', NULL),
('mudra_shishu',    'promoter_contribution_pct', '{"default":10}',             '2026-01-01', 'PM MUDRA Yojana scheme guidelines', NULL),
('mudra_kishor',    'promoter_contribution_pct', '{"default":10}',             '2026-01-01', 'PM MUDRA Yojana scheme guidelines', NULL),
('mudra_tarun',     'promoter_contribution_pct', '{"default":10}',             '2026-01-01', 'PM MUDRA Yojana scheme guidelines', NULL),
('mudra_tarunplus', 'promoter_contribution_pct', '{"default":10}',             '2026-01-01', 'RBI circular 2023 (Tarun Plus tier)', NULL)
ON CONFLICT (scheme_id, COALESCE(bank_name, ''), rule_key, effective_date) DO NOTHING;

-- ── Seed: Default Term Loan % (fixed capital) ───────────────────────────────
INSERT INTO public.loan_scheme_rules (scheme_id, rule_key, value, effective_date, source_reference, notes) VALUES
('cgtmse',   'term_loan_pct_default', '{"default":85}', '2026-01-01', 'CGTMSE-backed collateral-free lending — standard bank practice', 'Promoter = residual (fixed cost − term loan)'),
('msme_psu', 'term_loan_pct_default', '{"default":75}', '2026-01-01', 'CA-standard MSME project-finance practice — 75:25 debt:equity on fixed capital', 'User-overridable per Step 5 Means of Finance input')
ON CONFLICT (scheme_id, COALESCE(bank_name, ''), rule_key, effective_date) DO NOTHING;

-- ── Seed: Default Working-Capital Bank-Finance % ────────────────────────────
INSERT INTO public.loan_scheme_rules (scheme_id, rule_key, value, effective_date, source_reference, notes) VALUES
('default', 'wc_loan_pct_default', '{"default":60}', '2026-01-01', 'RBI/Nayak Committee simplified turnover method — conservative fallback', 'Overridden to 80% (Nayak Committee ceiling) by frontend default form state; this is only the server-side fallback when no value is supplied')
ON CONFLICT (scheme_id, COALESCE(bank_name, ''), rule_key, effective_date) DO NOTHING;

-- ── Seed: Default Interest Rate ─────────────────────────────────────────────
INSERT INTO public.loan_scheme_rules (scheme_id, rule_key, value, effective_date, source_reference, notes) VALUES
('default', 'interest_rate_pct_default', '{"default":10.5}', '2026-01-01', 'Typical MSME/DPR projection rate absent a confirmed bank sanction rate', 'User-overridable per Step 2 Loan & Scheme input')
ON CONFLICT (scheme_id, COALESCE(bank_name, ''), rule_key, effective_date) DO NOTHING;

-- ── Seed: Scheme-Specific Moratorium Override ───────────────────────────────
-- Only schemes with a fixed scheme-mandated moratorium get a row here;
-- PMEGP/MSME have no scheme override and use the user's own input as-is.
INSERT INTO public.loan_scheme_rules (scheme_id, rule_key, value, effective_date, source_reference, notes) VALUES
('mudra_shishu',    'moratorium_months_default', '{"default":0}', '2026-01-01', 'PM MUDRA Yojana scheme guidelines (Shishu — short tenure, no moratorium)', NULL),
('mudra_kishor',    'moratorium_months_default', '{"default":6}', '2026-01-01', 'PM MUDRA Yojana scheme guidelines (Kishor tier)', NULL),
('mudra_tarun',     'moratorium_months_default', '{"default":6}', '2026-01-01', 'PM MUDRA Yojana scheme guidelines (Tarun tier)', NULL),
('mudra_tarunplus', 'moratorium_months_default', '{"default":6}', '2026-01-01', 'RBI circular 2023 (Tarun Plus tier)', NULL),
('cgtmse',          'moratorium_months_default', '{"default":6}', '2026-01-01', 'CGTMSE scheme guidelines, standard bank practice', NULL)
ON CONFLICT (scheme_id, COALESCE(bank_name, ''), rule_key, effective_date) DO NOTHING;

-- ── Seed: MSME Promoter Floor % ─────────────────────────────────────────────
INSERT INTO public.loan_scheme_rules (scheme_id, rule_key, value, effective_date, source_reference, notes) VALUES
('msme_psu', 'promoter_floor_pct', '{"default":10}', '2026-01-01', 'CA-standard minimum promoter margin on fixed project cost for MSME bank finance', 'Floor applied even after capital subsidy is deducted')
ON CONFLICT (scheme_id, COALESCE(bank_name, ''), rule_key, effective_date) DO NOTHING;
