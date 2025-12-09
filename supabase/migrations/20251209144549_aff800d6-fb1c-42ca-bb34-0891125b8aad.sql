-- Habilitar RLS na tabela system_heartbeat
ALTER TABLE public.system_heartbeat ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública (apenas para verificar status)
CREATE POLICY "system_heartbeat_select_public" 
ON public.system_heartbeat 
FOR SELECT 
USING (true);