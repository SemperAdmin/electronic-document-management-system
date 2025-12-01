ALTER TABLE public.edms_users
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS edipi_hash text;

CREATE INDEX IF NOT EXISTS idx_edms_users_email ON public.edms_users(email);
