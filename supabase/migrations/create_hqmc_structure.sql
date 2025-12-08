-- Create HQMC structure table capturing Division, Branch/Section, and Description

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'hqmc_structure'
  ) THEN
    CREATE TABLE public.hqmc_structure (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      division_name text NOT NULL,
      division_code text,
      branch text NOT NULL,
      description text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hqmc_structure_division_code ON public.hqmc_structure(division_code);
CREATE INDEX IF NOT EXISTS idx_hqmc_structure_branch ON public.hqmc_structure(branch);

GRANT SELECT ON public.hqmc_structure TO anon;
GRANT ALL PRIVILEGES ON public.hqmc_structure TO authenticated;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_hqmc_structure_updated_at ON public.hqmc_structure;
CREATE TRIGGER update_hqmc_structure_updated_at
BEFORE UPDATE ON public.hqmc_structure
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Manpower Management (MM)
INSERT INTO public.hqmc_structure (division_name, division_code, branch, description) VALUES
  ('Manpower Management (MM)', 'MM', 'MM (Division Director)', 'Manpower Management Division Oversight and Direction'),
  ('Manpower Management (MM)', 'MM', 'MMEA', 'Enlisted Personnel Assignments (General oversight)'),
  ('Manpower Management (MM)', 'MM', 'MMEA-1', 'Enlisted Retention & Special Duty Assignments'),
  ('Manpower Management (MM)', 'MM', 'MMEA-2', 'General Enlisted Assignments (Monitor Section)'),
  ('Manpower Management (MM)', 'MM', 'MMEA-21', 'Headquarters & Service Support Assignments'),
  ('Manpower Management (MM)', 'MM', 'MMEA-22', 'Infantry & Combat Support Assignments'),
  ('Manpower Management (MM)', 'MM', 'MMOA', 'Officer Personnel Assignments (General oversight)'),
  ('Manpower Management (MM)', 'MM', 'MMOA-1', 'Ground Officer Assignments'),
  ('Manpower Management (MM)', 'MM', 'MMOA-3', 'Officer Plans, Programs, and Support'),
  ('Manpower Management (MM)', 'MM', 'MMIB', 'Manpower Management Integration Branch (General)'),
  ('Manpower Management (MM)', 'MM', 'MMIB-1', 'PCS Entitlements & Fiscal Management'),
  ('Manpower Management (MM)', 'MM', 'MMPB', 'Performance Branch (General oversight)'),
  ('Manpower Management (MM)', 'MM', 'MMPB-1', 'Records and Performance (Official Military Personnel File - OMPF Management)'),
  ('Manpower Management (MM)', 'MM', 'MMPB-2', 'Promotion Section (Officer & Enlisted boards processing)'),
  ('Manpower Management (MM)', 'MM', 'MMPB-3', 'Military Awards (Decorations & Medals Processing)'),
  ('Manpower Management (MM)', 'MM', 'MMSR', 'Separations and Retirements Branch (General oversight)'),
  ('Manpower Management (MM)', 'MM', 'MMSR-4', 'Disability Separations & Limited Duty'),
  ('Manpower Management (MM)', 'MM', 'MMSL', 'Senior Leader Management (General Officer / SES Management)');

-- Seed Manpower Plans and Policy (MP)
INSERT INTO public.hqmc_structure (division_name, division_code, branch, description) VALUES
  ('Manpower Plans and Policy (MP)', 'MP', 'MP (Division Director)', 'Manpower Plans and Policy Division Oversight'),
  ('Manpower Plans and Policy (MP)', 'MP', 'MPP', 'Manpower Plans, Programs, and Budget'),
  ('Manpower Plans and Policy (MP)', 'MP', 'MPO', 'Manpower Military Policy (General)'),
  ('Manpower Plans and Policy (MP)', 'MP', 'MPO', 'Military Compensation Policy (Pay, Allowances, & Benefits)'),
  ('Manpower Plans and Policy (MP)', 'MP', 'MPO', 'Uniform, Grooming, Leave, and Religious Accommodations Policy'),
  ('Manpower Plans and Policy (MP)', 'MP', 'MPA', 'Manpower Analysis (Studies, Analysis, and Force Structure Planning)'),
  ('Manpower Plans and Policy (MP)', 'MP', 'MPC', 'Civilian Workforce Management Policy'),
  ('Manpower Plans and Policy (MP)', 'MP', 'MPE', 'Manpower Equal Opportunity (Military EO Policy)'),
  ('Manpower Plans and Policy (MP)', 'MP', 'EEO', 'Civilian Equal Employment Opportunity Office');

-- Seed Reserve Affairs (RA)
INSERT INTO public.hqmc_structure (division_name, division_code, branch, description) VALUES
  ('Reserve Affairs (RA)', 'RA', 'RA (Division Director)', 'Reserve Affairs Division Oversight'),
  ('Reserve Affairs (RA)', 'RA', 'RAP', 'Reserve Affairs Policy, Plans, & Programming'),
  ('Reserve Affairs (RA)', 'RA', 'RAM', 'Reserve Affairs Management (Personnel Assignments)'),
  ('Reserve Affairs (RA)', 'RA', 'RAM-2', 'Active Reserve (AR) Assignments'),
  ('Reserve Affairs (RA)', 'RA', 'RAM-5', 'Reserve Education & ADOS Management (Active Duty for Operational Support)'),
  ('Reserve Affairs (RA)', 'RA', 'CMT', 'Reserve Career Management Team (Counseling)');

-- Seed Marine and Family Programs (MF)
INSERT INTO public.hqmc_structure (division_name, division_code, branch, description) VALUES
  ('Marine and Family Programs (MF)', 'MF', 'MF (Division Director)', 'Marine and Family Programs Division Oversight'),
  ('Marine and Family Programs (MF)', 'MF', 'MFPC', 'Casualty Assistance (Casualty & Mortuary Affairs)'),
  ('Marine and Family Programs (MF)', 'MF', 'Behavioral Programs', 'Community Counseling, Family Advocacy, and Suicide Prevention'),
  ('Marine and Family Programs (MF)', 'MF', 'Family Care Branch', 'Child and Youth Programs (CYP) & EFMP (Exceptional Family Member Program)'),
  ('Marine and Family Programs (MF)', 'MF', 'Readiness Branch', 'Transition, Education, & Financial Management'),
  ('Marine and Family Programs (MF)', 'MF', 'Semper Fit', 'Morale, Welfare, and Recreation (MWR)');

-- Seed Manpower Information (MI)
INSERT INTO public.hqmc_structure (division_name, division_code, branch, description) VALUES
  ('Manpower Information (MI)', 'MI', 'MI (Division Director)', 'Manpower Information Division Oversight'),
  ('Manpower Information (MI)', 'MI', 'MIT', 'Technology Branch (IT System Support & MIP)'),
  ('Manpower Information (MI)', 'MI', 'MID', 'Data Branch (Data Fidelity, Warehousing, & Reporting)'),
  ('Manpower Information (MI)', 'MI', 'MIO', 'Operations Branch (MCTFS, MOL, & System Operations)'),
  ('Manpower Information (MI)', 'MI', 'MISSA', 'Systems Support Activity (Application Development & Technical Support)');

