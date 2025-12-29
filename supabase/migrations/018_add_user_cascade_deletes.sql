-- Add cascading delete constraints for edms_users
-- When a user is deleted, related records are cleaned up properly

-- ============================================================================
-- 1. Add FK cascade for edms_documents.uploaded_by_id
-- ============================================================================

-- First drop if exists (in case partially applied)
ALTER TABLE public.edms_documents
  DROP CONSTRAINT IF EXISTS edms_documents_uploaded_by_fk;

-- Add FK with CASCADE - when user deleted, their documents are deleted
ALTER TABLE public.edms_documents
  ADD CONSTRAINT edms_documents_uploaded_by_fk
  FOREIGN KEY (uploaded_by_id)
  REFERENCES public.edms_users(id)
  ON DELETE CASCADE
  NOT VALID;

-- ============================================================================
-- 2. Add FK for edms_installations.commander_user_id (SET NULL on delete)
-- ============================================================================

-- First drop if exists
ALTER TABLE public.edms_installations
  DROP CONSTRAINT IF EXISTS edms_installations_commander_fk;

-- Add FK with SET NULL - when commander deleted, just clear the reference
ALTER TABLE public.edms_installations
  ADD CONSTRAINT edms_installations_commander_fk
  FOREIGN KEY (commander_user_id)
  REFERENCES public.edms_users(id)
  ON DELETE SET NULL
  NOT VALID;

-- ============================================================================
-- 3. Create function to clean up user references in arrays
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_user_references()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up hqmc_section_assignments reviewers and approvers arrays
  UPDATE public.hqmc_section_assignments
  SET
    reviewers = array_remove(reviewers, OLD.id),
    approvers = array_remove(approvers, OLD.id)
  WHERE OLD.id = ANY(reviewers) OR OLD.id = ANY(approvers);

  -- Clean up edms_installations section_assignments (JSONB with user ID arrays)
  -- This handles the section_assignments and command_section_assignments columns
  UPDATE public.edms_installations
  SET
    section_assignments = (
      SELECT jsonb_object_agg(
        key,
        (SELECT jsonb_agg(elem) FROM jsonb_array_elements_text(value) elem WHERE elem != OLD.id)
      )
      FROM jsonb_each(section_assignments)
    ),
    command_section_assignments = (
      SELECT jsonb_object_agg(
        key,
        (SELECT jsonb_agg(elem) FROM jsonb_array_elements_text(value) elem WHERE elem != OLD.id)
      )
      FROM jsonb_each(command_section_assignments)
    )
  WHERE
    section_assignments::text LIKE '%' || OLD.id || '%'
    OR command_section_assignments::text LIKE '%' || OLD.id || '%';

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Create trigger to run cleanup before user deletion
-- ============================================================================

DROP TRIGGER IF EXISTS cleanup_user_references_trigger ON public.edms_users;

CREATE TRIGGER cleanup_user_references_trigger
  BEFORE DELETE ON public.edms_users
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_user_references();

-- ============================================================================
-- 5. Add index to improve cascade delete performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_edms_documents_uploaded_by_id
  ON public.edms_documents(uploaded_by_id);

-- Add comment explaining the cascade behavior
COMMENT ON CONSTRAINT edms_documents_uploaded_by_fk ON public.edms_documents
  IS 'Cascade delete: when user is deleted, their uploaded documents are also deleted';

COMMENT ON CONSTRAINT edms_installations_commander_fk ON public.edms_installations
  IS 'Set null on delete: when commander user is deleted, the reference is cleared';

COMMENT ON FUNCTION public.cleanup_user_references()
  IS 'Cleans up user references in array columns when a user is deleted';
