-- Create user role row on signup based on auth metadata

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_text TEXT;
BEGIN
  role_text := lower(coalesce(NEW.raw_user_meta_data->>'role', 'user'));

  IF role_text NOT IN ('user', 'credit_analyst', 'consultant') THEN
    role_text := 'user';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, role_text::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_role();
