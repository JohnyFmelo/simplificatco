-- Registra quando o prazo de utilizacao foi definido para permitir alertas de renovacao.
ALTER TABLE public.militares
ADD COLUMN IF NOT EXISTS prazo_utilizacao_definido_em timestamptz;
