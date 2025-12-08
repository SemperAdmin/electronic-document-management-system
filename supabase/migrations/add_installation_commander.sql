ALTER TABLE public.edms_installations
  ADD COLUMN IF NOT EXISTS commander_user_id text;
