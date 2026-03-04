-- Enable RLS on the table to ensure security policies are active
ALTER TABLE public.militares ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone (including unauthenticated users) to read the table
-- This is required because the login page needs to query the table to verify credentials
-- before the user is authenticated.
-- WARN: This allows anyone to read the list of militares. For better security, consider using Supabase Auth.
DROP POLICY IF EXISTS "Public read access for login" ON public.militares;

CREATE POLICY "Public read access for login"
ON public.militares
FOR SELECT
TO anon, authenticated
USING (true);
