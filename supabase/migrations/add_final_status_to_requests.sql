-- Add final_status to edms_requests to support commander decisions and archival status
ALTER TABLE public.edms_requests
  ADD COLUMN IF NOT EXISTS final_status text;

-- No default; values are set by application logic ('Approved' | 'Rejected' | etc.)
