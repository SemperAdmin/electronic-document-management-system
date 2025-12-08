-- HQMC section assignments for reviewers and approvers per branch

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'hqmc_section_assignments'
  ) THEN
    CREATE TABLE public.hqmc_section_assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      division_code text NOT NULL,
      branch text NOT NULL,
      reviewers text[] DEFAULT '{}'::text[],
      approvers text[] DEFAULT '{}'::text[],
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE (division_code, branch)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hqmc_assignments_div_branch ON public.hqmc_section_assignments(division_code, branch);

GRANT SELECT ON public.hqmc_section_assignments TO anon;
GRANT ALL PRIVILEGES ON public.hqmc_section_assignments TO authenticated;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_hqmc_section_assignments_updated_at ON public.hqmc_section_assignments;
CREATE TRIGGER update_hqmc_section_assignments_updated_at
BEFORE UPDATE ON public.hqmc_section_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

