-- Allow credit analysts to view all loan applications and profiles

CREATE POLICY "Credit analysts can view all loan applications"
ON public.loan_applications FOR SELECT
USING (public.has_role(auth.uid(), 'credit_analyst'::app_role));

CREATE POLICY "Credit analysts can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'credit_analyst'::app_role));

CREATE POLICY "Credit analysts can view all EazyBizy applications"
ON public.gtab_applications FOR SELECT
USING (public.has_role(auth.uid(), 'credit_analyst'::app_role));
