ALTER TABLE public.edms_users
  RENAME COLUMN user_section TO user_platoon;

ALTER TABLE public.edms_users
  RENAME COLUMN role_section TO role_platoon;

DROP INDEX IF EXISTS idx_edms_users_user_section;
DROP INDEX IF EXISTS idx_edms_users_role_section;

CREATE INDEX IF NOT EXISTS idx_edms_users_user_platoon ON public.edms_users(user_platoon);
CREATE INDEX IF NOT EXISTS idx_edms_users_role_platoon ON public.edms_users(role_platoon);
