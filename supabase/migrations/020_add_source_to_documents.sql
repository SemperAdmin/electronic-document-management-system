-- ============================================================================
-- Migration: Add source column to edms_documents
-- Description: Enables tracking document origin (e.g., naval-letter-formatter)
-- ============================================================================

-- Add source column to track where documents came from
ALTER TABLE edms_documents
ADD COLUMN IF NOT EXISTS source VARCHAR(50);

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_edms_documents_source
ON edms_documents(source);

-- Add comment for documentation
COMMENT ON COLUMN edms_documents.source IS 'Origin of the document (e.g., naval-letter-formatter, upload, etc.)';
