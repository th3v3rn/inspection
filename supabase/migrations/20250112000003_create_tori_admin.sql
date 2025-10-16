INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'searchtori@gmail.com',
  crypt('QWer!@34', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  ''
) RETURNING id;

INSERT INTO public.users (id, email, role, organization_name)
SELECT 
  id,
  'searchtori@gmail.com',
  'admin',
  'Tori Organization'
FROM auth.users
WHERE email = 'searchtori@gmail.com';
