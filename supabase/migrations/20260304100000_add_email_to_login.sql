-- Add email column to usuarios_login table
ALTER TABLE public.usuarios_login ADD COLUMN IF NOT EXISTS email text;

-- Add unique constraint to email
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_login_email_key') THEN
        ALTER TABLE public.usuarios_login ADD CONSTRAINT usuarios_login_email_key UNIQUE (email);
    END IF;
END $$;
