ALTER TABLE public.edms_users
  RENAME COLUMN company TO user_company;

ALTER TABLE public.edms_users
  RENAME COLUMN section TO user_section;

ALTER TABLE public.edms_users
  ADD COLUMN IF NOT EXISTS role_company text,
  ADD COLUMN IF NOT EXISTS role_section text;

CREATE INDEX IF NOT EXISTS idx_edms_users_user_company ON public.edms_users(user_company);
CREATE INDEX IF NOT EXISTS idx_edms_users_user_section ON public.edms_users(user_section);
CREATE INDEX IF NOT EXISTS idx_edms_users_role_company ON public.edms_users(role_company);
CREATE INDEX IF NOT EXISTS idx_edms_users_role_section ON public.edms_users(role_section);
