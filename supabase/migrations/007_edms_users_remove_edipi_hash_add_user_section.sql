ALTER TABLE public.edms_users
  DROP COLUMN IF EXISTS edipi_hash,
  ADD COLUMN IF NOT EXISTS user_section text;

CREATE INDEX IF NOT EXISTS idx_edms_users_user_section ON public.edms_users(user_section);
