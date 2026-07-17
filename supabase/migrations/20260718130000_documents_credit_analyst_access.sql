-- Documents for credit appraisal:
--   1. New document types a CA/banker asks for (CIBIL, quotations, Udyam,
--      GST returns, net-worth certificate, pollution NOC, implementation plan).
--   2. Let credit analysts VIEW uploaded documents (table) and DOWNLOAD the
--      underlying files (storage) — previously only the owner and admins could,
--      so the Credit Analyst page could never show a borrower's documents.
--
-- Apply in Supabase → SQL Editor.

-- ── 1. New loan_document_type enum values ───────────────────────────────────
ALTER TYPE public.loan_document_type ADD VALUE IF NOT EXISTS 'udyam_registration';
ALTER TYPE public.loan_document_type ADD VALUE IF NOT EXISTS 'gst_returns';
ALTER TYPE public.loan_document_type ADD VALUE IF NOT EXISTS 'cibil_report';
ALTER TYPE public.loan_document_type ADD VALUE IF NOT EXISTS 'project_quotation';
ALTER TYPE public.loan_document_type ADD VALUE IF NOT EXISTS 'machinery_quotation';
ALTER TYPE public.loan_document_type ADD VALUE IF NOT EXISTS 'net_worth_certificate';
ALTER TYPE public.loan_document_type ADD VALUE IF NOT EXISTS 'pollution_noc';
ALTER TYPE public.loan_document_type ADD VALUE IF NOT EXISTS 'implementation_schedule';

-- ── 2a. Credit analysts can read the document records ───────────────────────
CREATE POLICY "Credit analysts can view all loan documents"
ON public.user_loan_documents FOR SELECT
USING (
  public.has_role(auth.uid(), 'credit_analyst'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- ── 2b. Credit analysts (and admins) can DOWNLOAD the files from storage ────
-- The loan-documents bucket is private and was owner-only; this lets the
-- reviewing analyst read (download / sign) any file in that bucket.
CREATE POLICY "Analysts and admins can read loan documents storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'loan-documents'
  AND (
    public.has_role(auth.uid(), 'credit_analyst'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
