-- Allow users to assign themselves allowed roles on signup

CREATE POLICY "Users can insert own roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('user', 'credit_analyst', 'consultant')
);
