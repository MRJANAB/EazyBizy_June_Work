INSERT INTO public.loan_types (
  name,
  description,
  min_amount,
  max_amount,
  interest_rate,
  tenure_months_min,
  tenure_months_max,
  icon
)
SELECT
  'EazyBizy MSME',
  'EazyBizy CMA/DPR loan application',
  10000,
  50000000,
  10.5,
  12,
  120,
  'briefcase'
WHERE NOT EXISTS (
  SELECT 1 FROM public.loan_types WHERE name = 'EazyBizy MSME'
);

ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS project_report_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dpr_api_payload JSONB,
  ADD COLUMN IF NOT EXISTS dpr_calculation_result JSONB,
  ADD COLUMN IF NOT EXISTS dpr_report_id TEXT,
  ADD COLUMN IF NOT EXISTS dpr_download_url TEXT,
  ADD COLUMN IF NOT EXISTS dpr_generated_at TIMESTAMPTZ;
