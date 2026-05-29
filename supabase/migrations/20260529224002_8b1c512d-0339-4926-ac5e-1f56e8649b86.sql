CREATE POLICY "militares_update_public"
ON public.militares
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "militares_insert_public"
ON public.militares
FOR INSERT
TO public
WITH CHECK (true);