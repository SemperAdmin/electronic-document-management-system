-- Convert ARCHIVED records to filed records
-- Records with currentStage = 'ARCHIVED' should have filedAt set so they appear in Files tab

-- Update records that have ARCHIVED status but no filedAt date
-- Set filedAt to the last activity timestamp or updatedAt or createdAt
UPDATE public.edms_requests
SET
  filed_at = COALESCE(
    -- Try to get the last activity timestamp from the activity JSONB array
    (
      SELECT (elem->>'timestamp')::timestamptz
      FROM jsonb_array_elements(activity) AS elem
      ORDER BY (elem->>'timestamp')::timestamptz DESC
      LIMIT 1
    ),
    -- Fall back to updated_at
    updated_at,
    -- Fall back to created_at
    created_at,
    -- Last resort: current timestamp
    NOW()
  )
WHERE current_stage = 'ARCHIVED'
  AND filed_at IS NULL;

-- Add a comment explaining this migration
COMMENT ON TABLE public.edms_requests IS 'Records management requests. Records with filed_at are considered filed/archived.';
