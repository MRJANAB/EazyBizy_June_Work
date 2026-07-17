-- Let credit analysts DOWNLOAD the documents applicants uploaded, so the
-- Credit Analyst "Documents" tab can show and download them.
--
-- This deployment stores documents in loan_applications.project_report_inputs
-- .uploaded_documents (JSON) with the files in the private storage buckets
-- 'loan-documents' / 'profile-documents'. The CA already has SELECT on
-- loan_applications, so the ONLY thing missing is read access to the storage
-- objects. (The optional user_loan_documents table policy below is applied only
-- if that table exists — some deployments don't have it and use JSON instead.)
--
-- NOTE: the loan_document_type enum is NOT required in JSON mode — document
-- types are plain string keys there — so no ALTER TYPE is needed here.
--
-- Apply in Supabase → SQL Editor.

-- ── Storage: analysts & admins can read (download / sign) uploaded files ─────
DROP POLICY IF EXISTS "Analysts and admins can read loan documents storage" ON storage.objects;
CREATE POLICY "Analysts and admins can read loan documents storage"
ON storage.objects FOR SELECT
USING (
  bucket_id IN ('loan-documents', 'profile-documents')
  AND (
    public.has_role(auth.uid(), 'credit_analyst'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- ── Table (only if user_loan_documents exists): analysts can read records ────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_loan_documents'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Credit analysts can view all loan documents" ON public.user_loan_documents';
    EXECUTE $p$
      CREATE POLICY "Credit analysts can view all loan documents"
      ON public.user_loan_documents FOR SELECT
      USING (
        public.has_role(auth.uid(), 'credit_analyst'::app_role)
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    $p$;
  END IF;
END $$;
