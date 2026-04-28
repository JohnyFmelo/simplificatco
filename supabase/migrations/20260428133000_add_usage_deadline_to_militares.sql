-- Move o prazo de utilizacao para a tabela militares.
ALTER TABLE public.militares
ADD COLUMN IF NOT EXISTS prazo_utilizacao_ate date;

-- Copia os prazos ja cadastrados em usuarios_login para militares.
UPDATE public.militares m
SET prazo_utilizacao_ate = ul.prazo_utilizacao_ate
FROM public.usuarios_login ul
WHERE ul.rgpm = m.rgpm
  AND ul.prazo_utilizacao_ate IS NOT NULL
  AND (
    m.prazo_utilizacao_ate IS NULL
    OR m.prazo_utilizacao_ate <> ul.prazo_utilizacao_ate
  );
