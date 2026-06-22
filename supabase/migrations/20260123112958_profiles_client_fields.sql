-- Add new columns to profiles table for loan application client details
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS client_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS collateral_details TEXT,
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Create a function to generate client IDs
CREATE OR REPLACE FUNCTION public.generate_client_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := 'FF-' || LPAD(nextval('client_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create sequence for client IDs
CREATE SEQUENCE IF NOT EXISTS client_id_seq START 100001;

-- Create trigger to auto-generate client ID
DROP TRIGGER IF EXISTS generate_client_id_trigger ON public.profiles;
CREATE TRIGGER generate_client_id_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_client_id();

-- Update existing profiles with client IDs
UPDATE public.profiles 
SET client_id = 'FF-' || LPAD(nextval('client_id_seq')::text, 6, '0')
WHERE client_id IS NULL;