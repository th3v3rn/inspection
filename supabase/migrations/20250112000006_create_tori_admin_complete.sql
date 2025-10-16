DO $$
DECLARE
  new_user_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'searchtori@gmail.com',
    crypt('QWer!@34', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  INSERT INTO public.users (id, email, role, organization_name)
  VALUES (new_user_id, 'searchtori@gmail.com', 'admin', 'Tori Organization');
END $$;
