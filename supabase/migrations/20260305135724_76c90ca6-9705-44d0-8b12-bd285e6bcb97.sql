CREATE POLICY "militares_select_public"
ON public.militares
FOR SELECT
TO anon, authenticated
USING (true);