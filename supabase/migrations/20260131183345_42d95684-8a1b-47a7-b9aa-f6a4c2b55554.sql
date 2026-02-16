-- Fix linter: Function Search Path Mutable

CREATE OR REPLACE FUNCTION public.validate_invitation_expires_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  RETURN NEW;
END;
$$;