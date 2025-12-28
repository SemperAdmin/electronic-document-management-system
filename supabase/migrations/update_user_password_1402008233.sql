-- Update password hash for user with EDIPI 1402008233
UPDATE public.edms_users
SET password_hash = 'a80bc8c014e2e777c7ce7f67e093c5c2e19b50f8f20e1cde8e81e14379957a53'
WHERE edipi = '1402008233';
