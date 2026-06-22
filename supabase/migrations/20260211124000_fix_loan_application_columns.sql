-- Ensure loan_applications has credit/decision fields used by dashboards

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_decision') THEN
    CREATE TYPE public.application_decision AS ENUM (
      'pending', 'under_review', 'documents_required', 'approved', 'rejected', 'disbursed'
    );
  END IF;
END $$;

ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS decision_status public.application_decision DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS credit_score INTEGER,
  ADD COLUMN IF NOT EXISTS risk_assessment TEXT,
  ADD COLUMN IF NOT EXISTS ai_recommendation TEXT,
  ADD COLUMN IF NOT EXISTS bank_formatted_report TEXT;
