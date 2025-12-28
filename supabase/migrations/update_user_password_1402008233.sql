-- Update password hash for user with EDIPI 1402008233
-- Using ID for reliability since edipi may not have been set initially
UPDATE public.edms_users
SET password_hash = 'a80bc8c014e2e777c7ce7f67e093c5c2e19b50f8f20e1cde8e81e14379957a53'
WHERE id = '5f1cd50c-e760-40de-be6a-0bcba9e20920'
   OR edipi = '1402008233';
