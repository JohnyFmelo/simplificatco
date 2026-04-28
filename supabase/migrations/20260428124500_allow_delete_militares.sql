-- Permite excluir registros da tabela militares pelo app.
-- Necessario para remover completamente o perfil exibido na listagem.

DROP TRIGGER IF EXISTS prevent_deletion_trigger ON public.militares;

GRANT DELETE ON public.militares TO public, anon, authenticated;

DROP POLICY IF EXISTS "militares_delete_public" ON public.militares;

CREATE POLICY "militares_delete_public"
ON public.militares
FOR DELETE
TO public
USING (true);
