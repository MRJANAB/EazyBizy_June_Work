-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create loan_types table
CREATE TABLE public.loan_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  min_amount NUMERIC NOT NULL DEFAULT 10000,
  max_amount NUMERIC NOT NULL DEFAULT 5000000,
  interest_rate NUMERIC NOT NULL DEFAULT 10.5,
  tenure_months_min INTEGER NOT NULL DEFAULT 6,
  tenure_months_max INTEGER NOT NULL DEFAULT 60,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create loan_applications table
CREATE TABLE public.loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  loan_type_id UUID REFERENCES public.loan_types(id) NOT NULL,
  amount NUMERIC NOT NULL,
  tenure_months INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Loan types policies (public read)
CREATE POLICY "Anyone can view loan types"
ON public.loan_types FOR SELECT
TO authenticated
USING (true);

-- Loan applications policies
CREATE POLICY "Users can view own applications"
ON public.loan_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own applications"
ON public.loan_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
ON public.loan_applications FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loan_applications_updated_at
BEFORE UPDATE ON public.loan_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default loan types
INSERT INTO public.loan_types (name, description, min_amount, max_amount, interest_rate, tenure_months_min, tenure_months_max, icon) VALUES
('Personal Loan', 'Quick personal loans for your immediate needs', 10000, 500000, 10.5, 6, 60, 'user'),
('Business Loan', 'Grow your business with flexible financing', 50000, 5000000, 12.0, 12, 84, 'briefcase'),
('Home Loan', 'Make your dream home a reality', 500000, 10000000, 8.5, 60, 360, 'home'),
('Education Loan', 'Invest in your future with education financing', 50000, 2000000, 9.0, 12, 120, 'graduation-cap'),
('Vehicle Loan', 'Drive your dream car today', 100000, 3000000, 11.0, 12, 84, 'car');