ALTER TABLE public.edms_users
  RENAME COLUMN user_company TO company;

DROP INDEX IF EXISTS idx_edms_users_user_company;
CREATE INDEX IF NOT EXISTS idx_edms_users_company ON public.edms_users(company);
