ALTER TABLE public.edms_users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.edms_users ALTER COLUMN id TYPE text USING id::text;
