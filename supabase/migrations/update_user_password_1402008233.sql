-- Update password hash for user with EDIPI 1402008233
-- Password: TTrreewwqq11!!1 (SHA-256 hash)
UPDATE public.edms_users
SET password_hash = '2d28cb6f443afd91857cc234b94e315321b80c7091228268646053484422bc35'
WHERE edipi = '1402008233';
