-- Ensure user_roles row exists based on auth metadata after sign-in

CREATE OR REPLACE FUNCTION public.upsert_user_role_from_metadata()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  role_text TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT lower(coalesce(raw_user_meta_data->>'role', 'user'))
  INTO role_text
  FROM auth.users
  WHERE id = auth.uid();

  IF role_text NOT IN ('user', 'credit_analyst', 'consultant') THEN
    role_text := 'user';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), role_text::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_role_from_metadata() TO authenticated;
