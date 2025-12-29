-- Enable RLS on edms_users table with policies for app-based authentication
-- Users authenticate via email/edipi + password stored in this table, not Supabase Auth
-- The app uses the anon key for client operations and handles authorization in application layer

-- Enable Row Level Security
ALTER TABLE public.edms_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT Policies
-- ============================================================================

-- The app needs to read users for:
-- - Login lookup (by email or edipi)
-- - User lists and name lookups
-- - Assignment dropdowns and routing displays
-- Since the app handles auth internally, allow anonymous read access
CREATE POLICY "Allow read access for app operations"
  ON public.edms_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role (backend/migrations) can always select
CREATE POLICY "Service role can select all users"
  ON public.edms_users
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================================================
-- INSERT Policies
-- ============================================================================

-- App needs to create user records during registration
-- Authorization (who can create users) is handled in application layer
CREATE POLICY "Allow insert for user registration"
  ON public.edms_users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Service role can insert any user
CREATE POLICY "Service role can insert any user"
  ON public.edms_users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- UPDATE Policies
-- ============================================================================

-- App needs to update user records for:
-- - Profile updates
-- - Admin role changes
-- - Password changes
-- Authorization (who can update whom) is handled in application layer
CREATE POLICY "Allow update for app operations"
  ON public.edms_users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Service role can update any user
CREATE POLICY "Service role can update any user"
  ON public.edms_users
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DELETE Policies
-- ============================================================================

-- App may need to delete users (admin only - enforced in application layer)
CREATE POLICY "Allow delete for app operations"
  ON public.edms_users
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Service role can delete any user
CREATE POLICY "Service role can delete any user"
  ON public.edms_users
  FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.edms_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edms_users TO authenticated;
GRANT ALL PRIVILEGES ON public.edms_users TO service_role;

-- Add helpful comment
COMMENT ON TABLE public.edms_users IS 'User profiles for EDMS with app-based authentication. RLS enabled with open policies - authorization enforced in application layer.';
