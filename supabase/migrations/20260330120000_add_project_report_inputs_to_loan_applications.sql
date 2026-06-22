ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS project_report_inputs JSONB NOT NULL DEFAULT '{}'::jsonb;
