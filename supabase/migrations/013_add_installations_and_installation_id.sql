-- Create installations table and add installation_id to users/requests

-- Installations catalog
CREATE TABLE IF NOT EXISTS public.edms_installations (
  id text PRIMARY KEY,
  name text NOT NULL,
  unit_uic text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edms_installations_name ON public.edms_installations(name);
CREATE INDEX IF NOT EXISTS idx_edms_installations_unit_uic ON public.edms_installations(unit_uic);

-- Add installation_id to edms_users if missing
ALTER TABLE public.edms_users
  ADD COLUMN IF NOT EXISTS installation_id text;

CREATE INDEX IF NOT EXISTS idx_edms_users_installation_id ON public.edms_users(installation_id);

-- Add installation_id to edms_requests if missing
ALTER TABLE public.edms_requests
  ADD COLUMN IF NOT EXISTS installation_id text;

CREATE INDEX IF NOT EXISTS idx_edms_requests_installation_id ON public.edms_requests(installation_id);

-- Optional: Foreign key constraints (not validated to avoid failures on existing data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_edms_users_installation_id'
  ) THEN
    ALTER TABLE public.edms_users
      ADD CONSTRAINT fk_edms_users_installation_id
      FOREIGN KEY (installation_id)
      REFERENCES public.edms_installations(id)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_edms_requests_installation_id'
  ) THEN
    ALTER TABLE public.edms_requests
      ADD CONSTRAINT fk_edms_requests_installation_id
      FOREIGN KEY (installation_id)
      REFERENCES public.edms_installations(id)
      NOT VALID;
  END IF;
END $$;

