-- Allow credit analysts (and admins) to UPDATE loan applications.
--
-- Bug fixed: a credit analyst approving/rejecting an application, or saving a
-- CMA draft, appeared to succeed but the change reverted on refresh. Root
-- cause: RLS on loan_applications granted credit analysts SELECT (all rows) but
-- NO UPDATE policy — only admins and the row owner could update. A credit
-- analyst's UPDATE therefore matched no policy, affected 0 rows, and Postgres
-- returned success (0 rows) rather than an error, so the optimistic UI update
-- was silently lost. Same class as the missing DELETE policy.
--
-- This grants credit analysts UPDATE on any loan application (needed to record
-- decisions: decision_status / reviewed_at / reviewed_by, and to save CMA drafts
-- into cma_data / project_report_inputs). Admins keep their existing policy.

CREATE POLICY "Credit analysts can update loan applications"
ON public.loan_applications FOR UPDATE
USING (
  public.has_role(auth.uid(), 'credit_analyst'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'credit_analyst'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
