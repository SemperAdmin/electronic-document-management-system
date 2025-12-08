ALTER TABLE public.edms_users
  ADD COLUMN IF NOT EXISTS is_installation_admin boolean DEFAULT false;

UPDATE public.edms_users SET is_installation_admin = COALESCE(is_installation_admin, false);
