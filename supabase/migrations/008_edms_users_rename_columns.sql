ALTER TABLE public.edms_users
  RENAME COLUMN user_section TO section;

ALTER TABLE public.edms_users
  RENAME COLUMN company TO user_company;

CREATE INDEX IF NOT EXISTS idx_edms_users_section ON public.edms_users(section);
CREATE INDEX IF NOT EXISTS idx_edms_users_user_company ON public.edms_users(user_company);
