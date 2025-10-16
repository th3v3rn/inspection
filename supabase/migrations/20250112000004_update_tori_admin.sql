UPDATE auth.users
SET 
  encrypted_password = crypt('QWer!@34', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'searchtori@gmail.com';

UPDATE public.users
SET 
  role = 'admin',
  organization_name = 'Tori Organization'
WHERE email = 'searchtori@gmail.com';
