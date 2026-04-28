-- Add optional usage deadline for controlled access to the system
ALTER TABLE public.usuarios_login
ADD COLUMN IF NOT EXISTS prazo_utilizacao_ate date;
