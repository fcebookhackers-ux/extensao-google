-- Fix linter: RLS enabled but no policies on app_encryption_keys

CREATE POLICY "Service role can manage encryption keys"
ON public.app_encryption_keys
FOR ALL
TO authenticated
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Also explicitly deny anon access (defense-in-depth)
REVOKE ALL ON TABLE public.app_encryption_keys FROM anon;