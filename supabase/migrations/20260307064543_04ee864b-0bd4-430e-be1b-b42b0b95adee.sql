
-- Seed departments
INSERT INTO public.departments (name, description) VALUES
  ('Cybercrime Division', 'Handles all cybercrime-related complaints'),
  ('Public Safety', 'Handles harassment and public safety issues'),
  ('Land & Revenue', 'Handles land disputes and revenue matters'),
  ('Infrastructure & Works', 'Handles road, water, electricity, sanitation'),
  ('General Administration', 'Handles miscellaneous complaints')
ON CONFLICT DO NOTHING;

-- Create a SECURITY DEFINER function for officer registration
CREATE OR REPLACE FUNCTION public.register_officer(
  _user_id uuid,
  _officer_code text,
  _department_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_roles SET role = 'officer' WHERE user_id = _user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'officer');
  END IF;
  INSERT INTO public.officers (user_id, officer_code, department_id)
  VALUES (_user_id, _officer_code, _department_id);
END;
$$;

-- Create a SECURITY DEFINER function for admin registration
CREATE OR REPLACE FUNCTION public.register_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_roles SET role = 'admin' WHERE user_id = _user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin');
  END IF;
END;
$$;
