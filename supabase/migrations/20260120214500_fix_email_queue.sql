-- 1. Habilita a extensão pg_net para fazer requisições HTTP (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Cria a tabela de fila de e-mails
CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'pending'
);

-- 3. Habilita segurança na tabela
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- 4. Permite que qualquer usuário (autenticado ou anônimo) insira na fila
CREATE POLICY "Permitir inserção pública na fila" 
ON public.email_queue 
FOR INSERT 
TO public 
WITH CHECK (true);

-- 5. Função que dispara o envio para o Google Apps Script
CREATE OR REPLACE FUNCTION public.trigger_send_email_tco()
RETURNS TRIGGER AS $$
DECLARE
    -- URL do seu Google Apps Script
    google_script_url TEXT := 'https://script.google.com/macros/s/AKfycbwLN_mMLX0Od6I8AMEunw1svXWisq29-J7O88pxX8pk08k3KMrCEdvC_qdA4Qiyvsrv/exec';
    request_id INTEGER;
BEGIN
    -- Envia a requisição POST assíncrona via pg_net
    -- O payload inserido na tabela é enviado como corpo JSON
    SELECT extensions.net_http_post(
        url := google_script_url,
        body := NEW.payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) INTO request_id;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro na extensão (ex: não instalada), não impede o insert, apenas loga
    RAISE WARNING 'Erro ao tentar enviar email via pg_net: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Gatilho (Trigger) para chamar a função após inserir na tabela
DROP TRIGGER IF EXISTS on_email_queue_insert ON public.email_queue;
CREATE TRIGGER on_email_queue_insert
AFTER INSERT ON public.email_queue
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_email_tco();
