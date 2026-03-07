
-- Fix search_path for generate_complaint_number
CREATE OR REPLACE FUNCTION public.generate_complaint_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM public.complaints;
  NEW.complaint_number := 'CMP-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Fix search_path for update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
