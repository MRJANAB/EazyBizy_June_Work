-- Create enums if not exists (idempotent for re-runs)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_document_type') THEN
    CREATE TYPE public.loan_document_type AS ENUM (
      'pan_card', 'aadhaar_card', 'voter_id', 'passport', 'driving_license',
      'salary_slip', 'bank_statement', 'itr', 'form_16', 'business_registration',
      'gst_certificate', 'balance_sheet', 'property_documents', 'land_records',
      'gold_valuation', 'vehicle_rc', 'employment_letter', 'address_proof',
      'photo', 'other'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
    CREATE TYPE public.document_status AS ENUM ('pending', 'verified', 'rejected', 'reupload_required');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_decision') THEN
    CREATE TYPE public.application_decision AS ENUM (
      'pending', 'under_review', 'documents_required', 'approved', 'rejected', 'disbursed'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'credit_analyst', 'consultant');
  END IF;
END $$;

-- Table for required documents per loan type
CREATE TABLE public.loan_type_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_type_id UUID REFERENCES public.loan_types(id) ON DELETE CASCADE NOT NULL,
  document_type loan_document_type NOT NULL,
  document_name TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(loan_type_id, document_type)
);

ALTER TABLE public.loan_type_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view required documents"
ON public.loan_type_documents FOR SELECT
USING (true);

-- Table for user uploaded loan documents
CREATE TABLE public.user_loan_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_application_id UUID REFERENCES public.loan_applications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  document_type loan_document_type NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  status document_status DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_loan_documents ENABLE ROW LEVEL SECURITY;

-- Add decision fields to loan_applications
ALTER TABLE public.loan_applications 
ADD COLUMN decision_status application_decision DEFAULT 'pending',
ADD COLUMN reviewed_by UUID,
ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN rejection_reason TEXT,
ADD COLUMN approval_notes TEXT,
ADD COLUMN credit_score INTEGER,
ADD COLUMN risk_assessment TEXT,
ADD COLUMN ai_recommendation TEXT,
ADD COLUMN bank_formatted_report TEXT;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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

-- RLS Policies
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own loan docs"
ON public.user_loan_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload own loan docs"
ON public.user_loan_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loan docs"
ON public.user_loan_documents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all loan docs"
ON public.user_loan_documents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all loan docs"
ON public.user_loan_documents FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all applications"
ON public.loan_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all applications"
ON public.loan_applications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for loan documents
INSERT INTO storage.buckets (id, name, public) VALUES ('loan-documents', 'loan-documents', false);

CREATE POLICY "Users upload loan docs storage"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view loan docs storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins view all loan docs storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'loan-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_loan_documents_updated_at
BEFORE UPDATE ON public.user_loan_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();