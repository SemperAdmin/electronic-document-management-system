-- ============================================================================
-- Migration: Create Naval Letter Attachments Table and Storage Bucket
-- Description: Adds support for Naval Letter Formatter (NLF) integration
-- ============================================================================

-- ============================================================================
-- 1. Create Storage Bucket for Naval Letters
-- ============================================================================

-- Create the naval-letters bucket (run via Supabase dashboard or CLI)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'naval-letters',
--   'naval-letters',
--   false,
--   52428800,  -- 50MB limit
--   ARRAY['application/json']::text[]
-- )
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Create Naval Letter Attachments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS naval_letter_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES edms_requests(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  content_type VARCHAR(100) DEFAULT 'application/json',
  source VARCHAR(50) DEFAULT 'naval-letter-formatter',
  file_size INTEGER,
  ssic VARCHAR(20),
  subject VARCHAR(500),
  letter_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES edms_users(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_naval_letter_attachments_request_id
  ON naval_letter_attachments(request_id);
CREATE INDEX IF NOT EXISTS idx_naval_letter_attachments_created_at
  ON naval_letter_attachments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_naval_letter_attachments_ssic
  ON naval_letter_attachments(ssic);

-- Add comments for documentation
COMMENT ON TABLE naval_letter_attachments IS 'Stores metadata for naval letters created via the Naval Letter Formatter (NLF) integration';
COMMENT ON COLUMN naval_letter_attachments.request_id IS 'The EDMS request this letter is attached to';
COMMENT ON COLUMN naval_letter_attachments.storage_path IS 'Path to the JSON file in Supabase Storage (naval-letters bucket)';
COMMENT ON COLUMN naval_letter_attachments.source IS 'Source of the attachment, defaults to naval-letter-formatter';
COMMENT ON COLUMN naval_letter_attachments.ssic IS 'Standard Subject Identification Code from the letter';
COMMENT ON COLUMN naval_letter_attachments.letter_type IS 'Type of naval letter (e.g., BASIC, ENDORSEMENT, MEMORANDUM)';

-- ============================================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE naval_letter_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attachments for requests they have access to
CREATE POLICY "Users can view naval letter attachments"
ON naval_letter_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM edms_requests r
    WHERE r.id = naval_letter_attachments.request_id
    AND (
      r.uploaded_by_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM edms_users u
        WHERE u.id = auth.uid()
        AND (
          u.is_app_admin = true
          OR u.is_installation_admin = true
          OR u.is_unit_admin = true
          OR u.unit_uic = r.unit_uic
        )
      )
    )
  )
);

-- Policy: Users can insert attachments for requests they own or have access to
CREATE POLICY "Users can insert naval letter attachments"
ON naval_letter_attachments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM edms_requests r
    WHERE r.id = request_id
    AND (
      r.uploaded_by_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM edms_users u
        WHERE u.id = auth.uid()
        AND (
          u.is_app_admin = true
          OR u.is_installation_admin = true
          OR u.is_unit_admin = true
          OR u.unit_uic = r.unit_uic
        )
      )
    )
  )
);

-- Policy: Users can delete their own attachments
CREATE POLICY "Users can delete own naval letter attachments"
ON naval_letter_attachments FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM edms_users u
    WHERE u.id = auth.uid()
    AND (u.is_app_admin = true OR u.is_installation_admin = true)
  )
);

-- ============================================================================
-- 4. Storage Policies (run via Supabase dashboard or with appropriate permissions)
-- ============================================================================

-- These policies should be created for the naval-letters bucket:
--
-- Policy: Users can upload to their own requests
-- CREATE POLICY "Users can upload naval letters"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'naval-letters' AND
--   EXISTS (
--     SELECT 1 FROM edms_requests r
--     WHERE r.id = (storage.foldername(name))[1]::uuid
--     AND (
--       r.uploaded_by_id = auth.uid()
--       OR EXISTS (
--         SELECT 1 FROM edms_users u
--         WHERE u.id = auth.uid()
--         AND (u.is_app_admin = true OR u.is_installation_admin = true OR u.is_unit_admin = true OR u.unit_uic = r.unit_uic)
--       )
--     )
--   )
-- );
--
-- Policy: Users can read attachments for their requests
-- CREATE POLICY "Users can read naval letters"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'naval-letters' AND
--   EXISTS (
--     SELECT 1 FROM edms_requests r
--     WHERE r.id = (storage.foldername(name))[1]::uuid
--     AND (
--       r.uploaded_by_id = auth.uid()
--       OR EXISTS (
--         SELECT 1 FROM edms_users u
--         WHERE u.id = auth.uid()
--         AND (u.is_app_admin = true OR u.is_installation_admin = true OR u.is_unit_admin = true OR u.unit_uic = r.unit_uic)
--       )
--     )
--   )
-- );

-- ============================================================================
-- 5. Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, DELETE ON naval_letter_attachments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
