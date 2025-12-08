-- Add is_hqmc_admin column to auth.users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_hqmc_admin BOOLEAN DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_auth_users_is_hqmc_admin ON auth.users(is_hqmc_admin);