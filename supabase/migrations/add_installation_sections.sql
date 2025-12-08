-- Add installation-level sections similar to battalion and command sections
ALTER TABLE public.edms_installations
  ADD COLUMN IF NOT EXISTS sections text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS command_sections text[] DEFAULT '{}'::text[];

-- Ensure NULLs are set to empty arrays
UPDATE public.edms_installations
  SET sections = COALESCE(sections, '{}'::text[]),
      command_sections = COALESCE(command_sections, '{}'::text[]);
