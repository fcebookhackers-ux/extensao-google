-- Fix linter: Function Search Path Mutable (WhatsApp integration functions)

CREATE OR REPLACE FUNCTION public.update_whatsapp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
