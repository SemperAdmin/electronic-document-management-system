-- Add installation-level permissions: map sections to user IDs
ALTER TABLE public.edms_installations
  ADD COLUMN IF NOT EXISTS section_assignments jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS command_section_assignments jsonb DEFAULT '{}'::jsonb;

UPDATE public.edms_installations
SET section_assignments = COALESCE(section_assignments, '{}'::jsonb),
    command_section_assignments = COALESCE(command_section_assignments, '{}'::jsonb);
