-- Remove moderator from app_role enum
-- Migrates existing moderator users to user, then recreates enum without moderator

DO $$
BEGIN
  -- Only run if app_role exists and has moderator
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'moderator'
  ) THEN
    -- 1. Migrate moderator users to user
    UPDATE public.user_roles SET role = 'user'::public.app_role WHERE role = 'moderator'::public.app_role;

    -- 2. Create new enum without moderator (include credit_analyst, consultant if 20260208 ran)
    CREATE TYPE public.app_role_new AS ENUM ('admin', 'user', 'credit_analyst', 'consultant');

    -- 3. Alter user_roles to use new type (map existing values)
    ALTER TABLE public.user_roles
      ALTER COLUMN role TYPE public.app_role_new
      USING (
        CASE role::text
          WHEN 'moderator' THEN 'user'::public.app_role_new
          ELSE role::text::public.app_role_new
        END
      );

    -- 4. Drop has_role (references app_role), then old enum, rename new one
    DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
    DROP TYPE public.app_role;
    ALTER TYPE public.app_role_new RENAME TO app_role;

    -- 5. Recreate has_role function (invalidated by type drop)
    CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $func$
      SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
      )
    $func$;
  END IF;
END $$;
