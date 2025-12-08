-- Add unit_uics array to installations and validate FKs

ALTER TABLE public.edms_installations
  ADD COLUMN IF NOT EXISTS unit_uics text[] DEFAULT '{}'::text[];

-- Backfill unit_uics from legacy unit_uic if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'edms_installations' AND column_name = 'unit_uic'
  ) THEN
    UPDATE public.edms_installations
    SET unit_uics = CASE
      WHEN unit_uics IS NULL OR unit_uics = '{}'::text[] THEN
        CASE WHEN unit_uic IS NOT NULL AND unit_uic <> '' THEN ARRAY[unit_uic] ELSE '{}'::text[] END
      ELSE unit_uics
    END;
  END IF;
END $$;

-- Validate foreign keys if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_edms_users_installation_id') THEN
    ALTER TABLE public.edms_users VALIDATE CONSTRAINT fk_edms_users_installation_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_edms_requests_installation_id') THEN
    ALTER TABLE public.edms_requests VALIDATE CONSTRAINT fk_edms_requests_installation_id;
  END IF;
END $$;

