-- Create EazyBizy Application comprehensive schema

-- Enum for gender
CREATE TYPE public.gtab_gender AS ENUM ('male', 'female', 'undisclosed');

-- Enum for education
CREATE TYPE public.gtab_education AS ENUM ('post_graduate', 'graduate', 'plus_two', 'tenth');

-- Enum for social category
CREATE TYPE public.gtab_social_category AS ENUM ('general', 'obc', 'minority', 'sc', 'st', 'undisclosed');

-- Enum for registration type
CREATE TYPE public.gtab_registration_type AS ENUM ('proprietorship', 'partnership', 'llp', 'private_limited');

-- Enum for business type
CREATE TYPE public.gtab_business_type AS ENUM ('new_business', 'existing_business');

-- Enum for industry type
CREATE TYPE public.gtab_industry_type AS ENUM ('manufacturing', 'service', 'trading', 'agriculture', 'others');

-- Enum for loan scheme
CREATE TYPE public.gtab_loan_scheme AS ENUM ('mudra', 'pmegp', 'normal_msme', 'other_scheme');

-- Enum for loan purpose
CREATE TYPE public.gtab_loan_purpose AS ENUM ('term_loan', 'working_capital', 'term_and_working_capital');

-- Enum for application status
CREATE TYPE public.gtab_application_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'disbursed');

-- Main EazyBizy Applications table
CREATE TABLE public.gtab_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Page 1: Personal Information
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  gender public.gtab_gender NOT NULL,
  education public.gtab_education NOT NULL,
  social_category public.gtab_social_category NOT NULL,
  
  -- Page 2: Business Information
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  registration_type public.gtab_registration_type,
  contact_mobile TEXT,
  contact_email TEXT,
  
  -- Page 3: Business & Loan Details
  business_type public.gtab_business_type,
  business_duration_months INTEGER,
  business_entity_name TEXT,
  type_of_business TEXT,
  industry_type public.gtab_industry_type,
  industry_other TEXT,
  loan_scheme public.gtab_loan_scheme,
  loan_scheme_other TEXT,
  loan_purpose public.gtab_loan_purpose,
  
  -- Page 4: Project Requirements (stored as JSONB)
  land_cost NUMERIC DEFAULT 0,
  shed_building_cost NUMERIC DEFAULT 0,
  plant_machinery JSONB DEFAULT '[]'::jsonb,
  computers_cost NUMERIC DEFAULT 0,
  furniture_cost NUMERIC DEFAULT 0,
  electrification_cost NUMERIC DEFAULT 0,
  racks_storage_cost NUMERIC DEFAULT 0,
  transportation_cost NUMERIC DEFAULT 0,
  machinery_installation_cost NUMERIC DEFAULT 0,
  other_initial_expenditure NUMERIC DEFAULT 0,
  
  -- Page 5: Calculated fields
  total_project_cost NUMERIC DEFAULT 0,
  margin_money NUMERIC DEFAULT 0,
  eligible_loan_amount NUMERIC DEFAULT 0,
  
  -- Page 6: Monthly Expenses
  monthly_rent NUMERIC DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  salary_per_employee NUMERIC DEFAULT 0,
  total_monthly_salary NUMERIC DEFAULT 0,
  raw_material_cost NUMERIC DEFAULT 0,
  stationery_cost NUMERIC DEFAULT 0,
  electricity_water_cost NUMERIC DEFAULT 0,
  repair_maintenance_cost NUMERIC DEFAULT 0,
  transport_cost NUMERIC DEFAULT 0,
  telephone_internet_cost NUMERIC DEFAULT 0,
  marketing_cost NUMERIC DEFAULT 0,
  miscellaneous_cost NUMERIC DEFAULT 0,
  total_monthly_expenses NUMERIC DEFAULT 0,
  
  -- Page 7: Working Capital
  working_capital_required NUMERIC DEFAULT 0,
  working_capital_period TEXT DEFAULT 'monthly',
  
  -- Status and metadata
  current_step INTEGER DEFAULT 1,
  status public.gtab_application_status DEFAULT 'draft',
  ai_recommendation TEXT,
  bank_formatted_report TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  approval_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gtab_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own EazyBizy applications"
ON public.gtab_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own EazyBizy applications"
ON public.gtab_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own EazyBizy applications"
ON public.gtab_applications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all EazyBizy applications"
ON public.gtab_applications FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all EazyBizy applications"
ON public.gtab_applications FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_gtab_applications_updated_at
BEFORE UPDATE ON public.gtab_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();