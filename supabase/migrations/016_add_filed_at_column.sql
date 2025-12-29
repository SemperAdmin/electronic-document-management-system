-- Add filed_at column to track when a record is filed/finalized
-- Records only appear in the Files dashboard once they have been filed

ALTER TABLE public.edms_requests
  ADD COLUMN IF NOT EXISTS filed_at timestamp with time zone;

-- Add index for efficient filtering of filed records
CREATE INDEX IF NOT EXISTS idx_edms_requests_filed_at
  ON public.edms_requests(filed_at)
  WHERE filed_at IS NOT NULL;

COMMENT ON COLUMN public.edms_requests.filed_at IS 'Timestamp when the record was filed/finalized for records management';
