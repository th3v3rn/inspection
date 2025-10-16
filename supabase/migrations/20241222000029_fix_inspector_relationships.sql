-- Fix the inspector's admin_id relationship
UPDATE public.users
SET admin_id = (
  SELECT id FROM public.users 
  WHERE email = 'clarkvsteph@gmail.com' 
  LIMIT 1
)
WHERE email = 'clarkvernonstephenson@gmail.com';

-- Update any assignments that might be pointing to an old inspector ID
-- This will update assignments to use the current inspector ID
UPDATE assignments
SET inspector_id = (
  SELECT id FROM public.users 
  WHERE email = 'clarkvernonstephenson@gmail.com'
  LIMIT 1
)
WHERE inspector_id IN (
  SELECT id FROM public.users 
  WHERE email = 'clarkvernonstephenson@gmail.com'
)
OR inspector_id NOT IN (
  SELECT id FROM public.users
);
