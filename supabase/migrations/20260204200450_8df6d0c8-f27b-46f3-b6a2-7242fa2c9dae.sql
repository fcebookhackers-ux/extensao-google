-- Create function to ensure every profile becomes a member of the primary workspace
CREATE OR REPLACE FUNCTION public.ensure_primary_workspace_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_primary_workspace_id uuid := 'e3946d71-98ec-4c08-9adb-9b6ed0e28e2d';
BEGIN
  -- Add the user as a member of the primary workspace if not already
  INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (v_primary_workspace_id, NEW.user_id, 'user', now())
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger: whenever a profile is created, ensure membership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_profiles_ensure_primary_workspace_membership'
  ) THEN
    CREATE TRIGGER trg_profiles_ensure_primary_workspace_membership
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_primary_workspace_membership();
  END IF;
END;
$$;