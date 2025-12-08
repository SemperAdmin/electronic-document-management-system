ALTER TABLE public.edms_users
  ADD COLUMN IF NOT EXISTS hqmc_division text;
