-- Move EazyBizy application data into loan_applications

-- Ensure EazyBizy enums exist (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gtab_gender') THEN
    CREATE TYPE public.gtab_gender AS ENUM ('male', 'female', 'undisclosed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gtab_education') THEN
    CREATE TYPE public.gtab_education AS ENUM ('post_graduate', 'graduate', 'plus_two', 'tenth');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gtab_social_category') THEN
    CREATE TYPE public.gtab_social_category AS ENUM ('general', 'obc', 'minority', 'sc', 'st', 'undisclosed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gtab_registration_type') THEN
    CREATE TYPE public.gtab_registration_type AS ENUM ('proprietorship', 'partnership', 'llp', 'private_limited');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gtab_business_type') THEN
    CREATE TYPE public.gtab_business_type AS ENUM ('new_business', 'existing_business');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gtab_industry_type') THEN
    CREATE TYPE public.gtab_industry_type AS ENUM ('manufacturing', 'service', 'trading', 'agriculture', 'others');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gtab_loan_scheme') THEN
    CREATE TYPE public.gtab_loan_scheme AS ENUM ('mudra', 'pmegp', 'normal_msme', 'other_scheme');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gtab_loan_purpose') THEN
    CREATE TYPE public.gtab_loan_purpose AS ENUM ('term_loan', 'working_capital', 'term_and_working_capital');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gtab_working_capital_period') THEN
    CREATE TYPE public.gtab_working_capital_period AS ENUM ('monthly', 'annual');
  END IF;
END $$;

ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS middle_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS gender public.gtab_gender,
  ADD COLUMN IF NOT EXISTS education public.gtab_education,
  ADD COLUMN IF NOT EXISTS social_category public.gtab_social_category,
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS registration_type public.gtab_registration_type,
  ADD COLUMN IF NOT EXISTS contact_mobile TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS business_type public.gtab_business_type,
  ADD COLUMN IF NOT EXISTS business_duration_months INTEGER,
  ADD COLUMN IF NOT EXISTS business_entity_name TEXT,
  ADD COLUMN IF NOT EXISTS type_of_business TEXT,
  ADD COLUMN IF NOT EXISTS industry_type public.gtab_industry_type,
  ADD COLUMN IF NOT EXISTS industry_other TEXT,
  ADD COLUMN IF NOT EXISTS loan_scheme public.gtab_loan_scheme,
  ADD COLUMN IF NOT EXISTS loan_scheme_other TEXT,
  ADD COLUMN IF NOT EXISTS loan_purpose public.gtab_loan_purpose,
  ADD COLUMN IF NOT EXISTS business_description TEXT,
  ADD COLUMN IF NOT EXISTS products_services TEXT,
  ADD COLUMN IF NOT EXISTS target_market TEXT,
  ADD COLUMN IF NOT EXISTS expected_monthly_revenue NUMERIC,
  ADD COLUMN IF NOT EXISTS expected_employment INTEGER,
  ADD COLUMN IF NOT EXISTS competitive_advantage TEXT,
  ADD COLUMN IF NOT EXISTS promoter_experience TEXT,
  ADD COLUMN IF NOT EXISTS land_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS shed_building_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS plant_machinery JSONB,
  ADD COLUMN IF NOT EXISTS computers_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS furniture_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS electrification_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS racks_storage_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS transportation_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS machinery_installation_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS other_initial_expenditure NUMERIC,
  ADD COLUMN IF NOT EXISTS total_project_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS margin_money NUMERIC,
  ADD COLUMN IF NOT EXISTS eligible_loan_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC,
  ADD COLUMN IF NOT EXISTS employee_count INTEGER,
  ADD COLUMN IF NOT EXISTS salary_per_employee NUMERIC,
  ADD COLUMN IF NOT EXISTS total_monthly_salary NUMERIC,
  ADD COLUMN IF NOT EXISTS raw_material_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS stationery_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS electricity_water_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS repair_maintenance_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS transport_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS telephone_internet_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS marketing_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS miscellaneous_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS total_monthly_expenses NUMERIC,
  ADD COLUMN IF NOT EXISTS working_capital_required NUMERIC,
  ADD COLUMN IF NOT EXISTS working_capital_period public.gtab_working_capital_period,
  ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Ensure a EazyBizy loan type exists for linking EazyBizy applications
INSERT INTO public.loan_types (
  name,
  description,
  min_amount,
  max_amount,
  interest_rate,
  tenure_months_min,
  tenure_months_max,
  icon
)
SELECT
  'EazyBizy MSME',
  'EazyBizy MSME loan application',
  10000,
  5000000,
  10.5,
  12,
  120,
  'briefcase'
WHERE NOT EXISTS (
  SELECT 1 FROM public.loan_types WHERE name = 'EazyBizy MSME'
);
