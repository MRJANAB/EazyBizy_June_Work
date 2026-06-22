-- Add working_capital_period enum to match frontend type definitions
-- Only runs when gtab_applications table exists (e.g. after 20260131101523_gtab_application_schema.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gtab_applications') THEN
    -- Create enum if not exists (PostgreSQL 9.1+)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gtab_working_capital_period' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
      CREATE TYPE public.gtab_working_capital_period AS ENUM ('monthly', 'annual');
    END IF;

    -- Alter column to use enum (existing 'monthly'/'annual' values convert; null/invalid -> monthly)
    ALTER TABLE public.gtab_applications
      ALTER COLUMN working_capital_period TYPE public.gtab_working_capital_period
      USING (
        CASE
          WHEN working_capital_period IS NULL THEN 'monthly'::public.gtab_working_capital_period
          WHEN working_capital_period::text IN ('monthly', 'annual') THEN working_capital_period::text::public.gtab_working_capital_period
          ELSE 'monthly'::public.gtab_working_capital_period
        END
      ),
      ALTER COLUMN working_capital_period SET DEFAULT 'monthly'::public.gtab_working_capital_period;
  END IF;
END $$;
