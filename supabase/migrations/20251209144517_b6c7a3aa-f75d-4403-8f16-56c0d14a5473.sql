-- Criar tabela de heartbeat para manter o banco ativo
CREATE TABLE IF NOT EXISTS public.system_heartbeat (
  id integer PRIMARY KEY DEFAULT 1,
  last_ping timestamp with time zone NOT NULL DEFAULT now(),
  ping_count integer NOT NULL DEFAULT 0
);

-- Inserir registro inicial
INSERT INTO public.system_heartbeat (id, last_ping, ping_count) 
VALUES (1, now(), 0)
ON CONFLICT (id) DO NOTHING;

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job que roda todo dia à meia-noite
SELECT cron.schedule(
  'daily-heartbeat',
  '0 0 * * *',
  $$UPDATE public.system_heartbeat SET last_ping = now(), ping_count = ping_count + 1 WHERE id = 1$$
);