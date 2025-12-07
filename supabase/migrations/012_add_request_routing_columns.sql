-- Add routing and external pending columns to edms_requests table
-- These columns support command section routing and external unit coordination

ALTER TABLE public.edms_requests
  ADD COLUMN IF NOT EXISTS route_section text,
  ADD COLUMN IF NOT EXISTS commander_approval_date text,
  ADD COLUMN IF NOT EXISTS external_pending_unit_name text,
  ADD COLUMN IF NOT EXISTS external_pending_unit_uic text,
  ADD COLUMN IF NOT EXISTS external_pending_stage text;

-- Create index for route_section to improve query performance
CREATE INDEX IF NOT EXISTS idx_edms_requests_route_section ON public.edms_requests(route_section);
