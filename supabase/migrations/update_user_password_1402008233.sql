-- Update password hash for user with EDIPI 1402008233
-- Password: TTrreewwwq11!!1 (SHA-256 hash)
UPDATE public.edms_users
SET password_hash = 'f689039737b6f4ace8b465a760fdc3cb8cc72860cd556f0e03107a93361dbf2f'
WHERE edipi = '1402008233';
