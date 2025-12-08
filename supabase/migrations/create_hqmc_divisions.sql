-- Create HQMC divisions table with main options only

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'hqmc_divisions'
  ) THEN
    CREATE TABLE public.hqmc_divisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      code text NOT NULL UNIQUE,
      description text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hqmc_divisions_code ON public.hqmc_divisions(code);
CREATE INDEX IF NOT EXISTS idx_hqmc_divisions_name ON public.hqmc_divisions(name);

GRANT SELECT ON public.hqmc_divisions TO anon;
GRANT ALL PRIVILEGES ON public.hqmc_divisions TO authenticated;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_hqmc_divisions_updated_at ON public.hqmc_divisions;
CREATE TRIGGER update_hqmc_divisions_updated_at
BEFORE UPDATE ON public.hqmc_divisions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed main HQMC divisions
INSERT INTO public.hqmc_divisions (id, name, code, description) VALUES
  (gen_random_uuid(), 'Manpower Management', 'MM', 'Manpower Management Division'),
  (gen_random_uuid(), 'Manpower Plans and Policy', 'MP', 'Manpower Plans and Policy Division'),
  (gen_random_uuid(), 'Reserve Affairs', 'RA', 'Reserve Affairs Division'),
  (gen_random_uuid(), 'Marine and Family Programs', 'MF', 'Marine and Family Programs Division'),
  (gen_random_uuid(), 'Manpower Information', 'MI', 'Manpower Information Division');

