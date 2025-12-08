ALTER TABLE public.edms_users
  ADD COLUMN IF NOT EXISTS is_hqmc_admin boolean DEFAULT false;

UPDATE public.edms_users SET is_hqmc_admin = COALESCE(is_hqmc_admin, false);
