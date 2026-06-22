-- Create user_roles table 
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Role check function 
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policy (create only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Users can view own roles'
  ) THEN
    CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add new enum values 
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'credit_analyst'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'credit_analyst';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'consultant'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'consultant';
  END IF;
END $$;
-- sql to run thes migration
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES
--   ('<user-uuid-1>', 'credit_analyst'), 
--   ('<user-uuid-2>', 'consultant')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- add proper uuids to the placehoders
