-- Add business description fields to gtab_applications
ALTER TABLE public.gtab_applications
ADD COLUMN IF NOT EXISTS business_description text,
ADD COLUMN IF NOT EXISTS products_services text,
ADD COLUMN IF NOT EXISTS target_market text,
ADD COLUMN IF NOT EXISTS expected_monthly_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_employment integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS competitive_advantage text,
ADD COLUMN IF NOT EXISTS promoter_experience text;