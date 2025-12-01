ALTER TABLE public.edms_users
  ADD COLUMN IF NOT EXISTS is_app_admin boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_edms_users_role ON public.edms_users(role);
