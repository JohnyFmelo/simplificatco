-- Permite excluir apenas o perfil de acesso na tabela usuarios_login.
-- Observacao: isso nao cria validacao real de "Administrador" no banco,
-- porque o projeto atual nao usa Supabase Auth para identificar o usuario logado.

-- Remove o trigger que bloqueia delete somente desta tabela.
DROP TRIGGER IF EXISTS prevent_deletion_trigger ON public.usuarios_login;

-- Libera permissao de DELETE para as roles usadas pelo app.
GRANT DELETE ON public.usuarios_login TO public, anon, authenticated;

-- Libera RLS de DELETE para a tabela de login.
DROP POLICY IF EXISTS "usuarios_login_delete_public" ON public.usuarios_login;

CREATE POLICY "usuarios_login_delete_public"
ON public.usuarios_login
FOR DELETE
TO public
USING (true);
