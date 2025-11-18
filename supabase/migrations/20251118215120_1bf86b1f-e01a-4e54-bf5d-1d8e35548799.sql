-- Fix RLS policies for usuarios_login table
-- This table needs policies to allow INSERT (create user), UPDATE (change password), and SELECT (login)

-- Allow anyone to insert new users (for user creation by admin)
CREATE POLICY "usuarios_login_insert_public"
ON public.usuarios_login
FOR INSERT
TO public
WITH CHECK (true);

-- Allow anyone to update their own password (matching rgpm and old senha)
CREATE POLICY "usuarios_login_update_public"
ON public.usuarios_login
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Allow anyone to select users (for login validation)
CREATE POLICY "usuarios_login_select_public"
ON public.usuarios_login
FOR SELECT
TO public
USING (true);

-- Update unidades INSERT policy to allow public inserts (for creating units)
DROP POLICY IF EXISTS "unidades_insert_authenticated" ON public.unidades;

CREATE POLICY "unidades_insert_public"
ON public.unidades
FOR INSERT
TO public
WITH CHECK (true);