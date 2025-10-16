INSERT INTO public.users (id, email, role, organization_name)
SELECT 
  id,
  email,
  'admin',
  'Tori Organization'
FROM auth.users
WHERE email = 'searchtori@gmail.com'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  organization_name = 'Tori Organization',
  email = 'searchtori@gmail.com';
