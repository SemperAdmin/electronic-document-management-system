-- Add SSIC/Retention columns to edms_requests table
-- These fields store the SSIC classification and retention schedule information

ALTER TABLE public.edms_requests
  ADD COLUMN IF NOT EXISTS ssic text,
  ADD COLUMN IF NOT EXISTS ssic_nomenclature text,
  ADD COLUMN IF NOT EXISTS ssic_bucket text,
  ADD COLUMN IF NOT EXISTS ssic_bucket_title text,
  ADD COLUMN IF NOT EXISTS is_permanent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_value integer,
  ADD COLUMN IF NOT EXISTS retention_unit text,
  ADD COLUMN IF NOT EXISTS cutoff_trigger text,
  ADD COLUMN IF NOT EXISTS cutoff_description text,
  ADD COLUMN IF NOT EXISTS disposal_action text,
  ADD COLUMN IF NOT EXISTS dau text;

-- Add index on SSIC for efficient lookups
CREATE INDEX IF NOT EXISTS idx_edms_requests_ssic
  ON public.edms_requests(ssic);

-- Add index on is_permanent for filtering permanent vs temporary records
CREATE INDEX IF NOT EXISTS idx_edms_requests_is_permanent
  ON public.edms_requests(is_permanent);

-- Comment the columns for documentation
COMMENT ON COLUMN public.edms_requests.ssic IS 'Standard Subject Identification Code (e.g., 1000, 5000)';
COMMENT ON COLUMN public.edms_requests.ssic_nomenclature IS 'Human-readable SSIC name/description';
COMMENT ON COLUMN public.edms_requests.ssic_bucket IS 'Category bucket identifier within the SSIC';
COMMENT ON COLUMN public.edms_requests.ssic_bucket_title IS 'Human-readable bucket title';
COMMENT ON COLUMN public.edms_requests.is_permanent IS 'Whether this record has permanent retention';
COMMENT ON COLUMN public.edms_requests.retention_value IS 'Numeric retention period value';
COMMENT ON COLUMN public.edms_requests.retention_unit IS 'Retention period unit (years, months, days)';
COMMENT ON COLUMN public.edms_requests.cutoff_trigger IS 'Event that triggers retention countdown (CALENDAR_YEAR, FISCAL_YEAR, CASE_CLOSURE, etc.)';
COMMENT ON COLUMN public.edms_requests.cutoff_description IS 'Human-readable description of cutoff trigger';
COMMENT ON COLUMN public.edms_requests.disposal_action IS 'Action to take after retention period (DESTROY, TRANSFER, etc.)';
COMMENT ON COLUMN public.edms_requests.dau IS 'Disposition Authority Number';
