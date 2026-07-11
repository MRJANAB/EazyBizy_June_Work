-- Allow credit analysts (and admins) to DELETE loan applications.
--
-- Bug fixed: deleting an application/CMA in the Credit Analyst portal appeared
-- to succeed but the row reappeared on refresh. Root cause: RLS had only a
-- SELECT policy for the credit_analyst role and no DELETE policy, so the delete
-- silently affected 0 rows (Postgres returns success, 0 rows) and the optimistic
-- UI removal was reverted on the next fetch.

CREATE POLICY "Credit analysts can delete loan applications"
ON public.loan_applications FOR DELETE
USING (
  public.has_role(auth.uid(), 'credit_analyst'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
