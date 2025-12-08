-- Create edms_installations table and seed installation/command data

-- Ensure table exists and add necessary columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'edms_installations'
  ) THEN
    CREATE TABLE public.edms_installations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL
    );
  END IF;
END $$;

ALTER TABLE public.edms_installations
  ADD COLUMN IF NOT EXISTS base_type text,
  ADD COLUMN IF NOT EXISTS command text,
  ADD COLUMN IF NOT EXISTS acronym text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS unit_uics text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sections text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS command_sections text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS section_assignments jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS command_section_assignments jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS commander_user_id text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_edms_installations_name ON public.edms_installations(name);
CREATE INDEX IF NOT EXISTS idx_edms_installations_acronym ON public.edms_installations(acronym);

GRANT SELECT ON public.edms_installations TO anon;
GRANT ALL PRIVILEGES ON public.edms_installations TO authenticated;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_edms_installations_updated_at ON public.edms_installations;
CREATE TRIGGER update_edms_installations_updated_at
BEFORE UPDATE ON public.edms_installations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Installations (United States)
INSERT INTO public.edms_installations (id, name, base_type, acronym, location)
VALUES
  (gen_random_uuid(), 'Marine Corps Air Station Yuma', 'MCAS', 'MCAS Yuma', 'Arizona'),
  (gen_random_uuid(), 'Marine Corps Base Camp Pendleton', 'MCB', 'MCB Camp Pendleton', 'California'),
  (gen_random_uuid(), 'Marine Corps Air Station Camp Pendleton', 'MCAS', 'MCAS Camp Pendleton', 'California'),
  (gen_random_uuid(), 'Marine Corps Air Station Miramar', 'MCAS', 'MCAS Miramar', 'California'),
  (gen_random_uuid(), 'Marine Corps Air Ground Combat Center', 'MCAGCC', '29 Palms', 'California'),
  (gen_random_uuid(), 'Marine Corps Recruit Depot San Diego', 'MCRD', 'MCRD San Diego', 'California'),
  (gen_random_uuid(), 'Marine Corps Logistics Base Barstow', 'MCLB', 'MCLB Barstow', 'California'),
  (gen_random_uuid(), 'Mountain Warfare Training Center', 'MWTC', 'MWTC Bridgeport', 'California'),
  (gen_random_uuid(), 'Marine Corps Logistics Base Albany', 'MCLB', 'MCLB Albany', 'Georgia'),
  (gen_random_uuid(), 'Marine Corps Base Camp Lejeune', 'MCB', 'MCB Camp Lejeune', 'North Carolina'),
  (gen_random_uuid(), 'Marine Corps Air Station Cherry Point', 'MCAS', 'MCAS Cherry Point', 'North Carolina'),
  (gen_random_uuid(), 'Marine Corps Air Station New River', 'MCAS', 'MCAS New River', 'North Carolina'),
  (gen_random_uuid(), 'Marine Corps Recruit Depot Parris Island', 'MCRD', 'MCRD Parris Island', 'South Carolina'),
  (gen_random_uuid(), 'Marine Corps Air Station Beaufort', 'MCAS', 'MCAS Beaufort', 'South Carolina'),
  (gen_random_uuid(), 'Marine Corps Base Quantico', 'MCB', 'MCB Quantico', 'Virginia'),
  (gen_random_uuid(), 'Henderson Hall', 'Barracks', 'MCHH', 'Virginia'),
  (gen_random_uuid(), 'Marine Barracks, Washington, D.C.', 'Barracks', '8th & I', 'Washington, D.C.');

-- Seed Installations (Overseas)
INSERT INTO public.edms_installations (id, name, base_type, acronym, location)
VALUES
  (gen_random_uuid(), 'Marine Corps Base Hawaii', 'MCB', 'MCBH', 'Hawaii'),
  (gen_random_uuid(), 'Camp H. M. Smith', 'Base', 'Camp Smith', 'Hawaii'),
  (gen_random_uuid(), 'Marine Corps Air Station Iwakuni', 'MCAS', 'MCAS Iwakuni', 'Japan'),
  (gen_random_uuid(), 'Camp Smedley D. Butler (Okinawa)', 'MCB', 'MCB Butler', 'Japan');

-- Seed Major Marine Force Commands (MARFORs)
INSERT INTO public.edms_installations (id, name, base_type, command, acronym, location)
VALUES
  (gen_random_uuid(), 'Marine Forces Europe and Africa', 'MARFOR', 'MARFOREUR/AF', 'MARFOREUR/AF', 'Stuttgart, Germany (HQ)'),
  (gen_random_uuid(), 'Marine Forces Pacific', 'MARFOR', 'MARFORPAC', 'MARFORPAC', 'Camp H. M. Smith, Hawaii'),
  (gen_random_uuid(), 'Marine Forces Central Command', 'MARFOR', 'MARFORCENT', 'MARFORCENT', 'Tampa, Florida (HQ)'),
  (gen_random_uuid(), 'Marine Forces Command (Atlantic)', 'MARFOR', 'MARFORCOM', 'MARFORCOM', 'Norfolk, Virginia (HQ)'),
  (gen_random_uuid(), 'Marine Forces Reserve', 'MARFOR', 'MARFORRES', 'MARFORRES', 'New Orleans, Louisiana (HQ)'),
  (gen_random_uuid(), 'Marine Forces Special Operations Command', 'MARFOR', 'MARFORSOC', 'MARFORSOC', 'Camp Lejeune, North Carolina (HQ)');
