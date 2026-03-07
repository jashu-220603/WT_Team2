
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('user', 'officer', 'admin');

-- Create complaint status enum
CREATE TYPE public.complaint_status AS ENUM ('submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected');

-- Create complaint category enum
CREATE TYPE public.complaint_category AS ENUM ('cybercrime', 'harassment', 'land_issues', 'infrastructure', 'other');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create officers table
CREATE TABLE public.officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  officer_code TEXT NOT NULL UNIQUE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number TEXT NOT NULL UNIQUE,
  citizen_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category complaint_category NOT NULL DEFAULT 'other',
  subcategory TEXT DEFAULT '',
  location TEXT DEFAULT '',
  description TEXT NOT NULL,
  status complaint_status NOT NULL DEFAULT 'submitted',
  assigned_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create complaint_evidence table
CREATE TABLE public.complaint_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create complaint_remarks table
CREATE TABLE public.complaint_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  remark TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to generate complaint number
CREATE OR REPLACE FUNCTION public.generate_complaint_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM public.complaints;
  NEW.complaint_number := 'CMP-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_complaint_number
  BEFORE INSERT ON public.complaints
  FOR EACH ROW
  WHEN (NEW.complaint_number IS NULL OR NEW.complaint_number = '')
  EXECUTE FUNCTION public.generate_complaint_number();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  -- Default role is 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_remarks ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- User roles RLS
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Departments RLS (public read)
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Officers RLS
CREATE POLICY "Officers can view own record" ON public.officers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage officers" ON public.officers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all officers" ON public.officers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Complaints RLS
CREATE POLICY "Citizens can view own complaints" ON public.complaints FOR SELECT TO authenticated USING (citizen_id = auth.uid());
CREATE POLICY "Citizens can create complaints" ON public.complaints FOR INSERT TO authenticated WITH CHECK (citizen_id = auth.uid());
CREATE POLICY "Officers can view assigned complaints" ON public.complaints FOR SELECT TO authenticated USING (assigned_officer_id IN (SELECT id FROM public.officers WHERE user_id = auth.uid()));
CREATE POLICY "Officers can update assigned complaints" ON public.complaints FOR UPDATE TO authenticated USING (assigned_officer_id IN (SELECT id FROM public.officers WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all complaints" ON public.complaints FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Evidence RLS
CREATE POLICY "Users can view evidence for own complaints" ON public.complaint_evidence FOR SELECT TO authenticated USING (complaint_id IN (SELECT id FROM public.complaints WHERE citizen_id = auth.uid()));
CREATE POLICY "Users can upload evidence" ON public.complaint_evidence FOR INSERT TO authenticated WITH CHECK (complaint_id IN (SELECT id FROM public.complaints WHERE citizen_id = auth.uid()));
CREATE POLICY "Officers can view evidence" ON public.complaint_evidence FOR SELECT TO authenticated USING (complaint_id IN (SELECT id FROM public.complaints WHERE assigned_officer_id IN (SELECT id FROM public.officers WHERE user_id = auth.uid())));
CREATE POLICY "Admins can view all evidence" ON public.complaint_evidence FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Remarks RLS
CREATE POLICY "Users can view remarks on own complaints" ON public.complaint_remarks FOR SELECT TO authenticated USING (complaint_id IN (SELECT id FROM public.complaints WHERE citizen_id = auth.uid()));
CREATE POLICY "Officers can add remarks" ON public.complaint_remarks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Officers can view remarks on assigned" ON public.complaint_remarks FOR SELECT TO authenticated USING (complaint_id IN (SELECT id FROM public.complaints WHERE assigned_officer_id IN (SELECT id FROM public.officers WHERE user_id = auth.uid())));
CREATE POLICY "Admins can manage all remarks" ON public.complaint_remarks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed departments
INSERT INTO public.departments (name, description) VALUES
  ('Roads & Infrastructure', 'Handles road repairs, potholes, and infrastructure complaints'),
  ('Water Supply', 'Manages water supply issues and drainage'),
  ('Electricity', 'Handles power outages and electrical issues'),
  ('Sanitation', 'Manages garbage collection and sanitation'),
  ('Cybercrime', 'Handles online fraud and cyber complaints'),
  ('Law & Order', 'General law enforcement complaints');

-- Create storage bucket for evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', true);

-- Storage RLS for evidence bucket
CREATE POLICY "Authenticated users can upload evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidence');
CREATE POLICY "Anyone can view evidence" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'evidence');
