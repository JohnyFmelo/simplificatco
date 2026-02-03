-- Create a function to prevent deletion
CREATE OR REPLACE FUNCTION prevent_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'A exclusão de dados não é permitida. Os dados devem ser mantidos.';
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables

-- avaliacoes
DROP TRIGGER IF EXISTS prevent_deletion_trigger ON public.avaliacoes;
CREATE TRIGGER prevent_deletion_trigger
BEFORE DELETE ON public.avaliacoes
FOR EACH ROW EXECUTE FUNCTION prevent_deletion();

-- email_queue
DROP TRIGGER IF EXISTS prevent_deletion_trigger ON public.email_queue;
CREATE TRIGGER prevent_deletion_trigger
BEFORE DELETE ON public.email_queue
FOR EACH ROW EXECUTE FUNCTION prevent_deletion();

-- photo_captions
DROP TRIGGER IF EXISTS prevent_deletion_trigger ON public.photo_captions;
CREATE TRIGGER prevent_deletion_trigger
BEFORE DELETE ON public.photo_captions
FOR EACH ROW EXECUTE FUNCTION prevent_deletion();

-- police_officers
DROP TRIGGER IF EXISTS prevent_deletion_trigger ON public.police_officers;
CREATE TRIGGER prevent_deletion_trigger
BEFORE DELETE ON public.police_officers
FOR EACH ROW EXECUTE FUNCTION prevent_deletion();

-- system_heartbeat
DROP TRIGGER IF EXISTS prevent_deletion_trigger ON public.system_heartbeat;
CREATE TRIGGER prevent_deletion_trigger
BEFORE DELETE ON public.system_heartbeat
FOR EACH ROW EXECUTE FUNCTION prevent_deletion();

-- unidades
DROP TRIGGER IF EXISTS prevent_deletion_trigger ON public.unidades;
CREATE TRIGGER prevent_deletion_trigger
BEFORE DELETE ON public.unidades
FOR EACH ROW EXECUTE FUNCTION prevent_deletion();

-- usuarios_login
DROP TRIGGER IF EXISTS prevent_deletion_trigger ON public.usuarios_login;
CREATE TRIGGER prevent_deletion_trigger
BEFORE DELETE ON public.usuarios_login
FOR EACH ROW EXECUTE FUNCTION prevent_deletion();

-- Revoke DELETE permissions from standard roles for tables
REVOKE DELETE ON public.avaliacoes FROM public, anon, authenticated;
REVOKE DELETE ON public.email_queue FROM public, anon, authenticated;
REVOKE DELETE ON public.photo_captions FROM public, anon, authenticated;
REVOKE DELETE ON public.police_officers FROM public, anon, authenticated;
REVOKE DELETE ON public.system_heartbeat FROM public, anon, authenticated;
REVOKE DELETE ON public.unidades FROM public, anon, authenticated;
REVOKE DELETE ON public.usuarios_login FROM public, anon, authenticated;

-- Revoke DELETE permissions for Storage objects (files)
REVOKE DELETE ON storage.objects FROM public, anon, authenticated;

-- Attempt to remove any scheduled cron jobs that delete from police_officers
-- This handles the case where a pg_cron job was set up to delete old records
DO $$
BEGIN
    -- Check if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Delete jobs that contain deletion logic for police_officers
        DELETE FROM cron.job 
        WHERE command ILIKE '%DELETE FROM%police_officers%';
    END IF;
END
$$;
