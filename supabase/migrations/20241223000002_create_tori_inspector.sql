DO $$
DECLARE
  admin_user_id UUID;
  inspector_user_id UUID := 'b8e7c3d2-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
BEGIN
  SELECT id INTO admin_user_id FROM public.users WHERE email = 'clarkvsteph@gmail.com';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user clarkvsteph@gmail.com not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'clarkvsteph1@gmail.com') THEN
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
      aud
    ) VALUES (
      inspector_user_id,
      '00000000-0000-0000-0000-000000000000',
      'clarkvsteph1@gmail.com',
      crypt('TempPassword123!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Tori Steph"}',
      false,
      'authenticated',
      'authenticated'
    );
  END IF;

  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    admin_id
  ) VALUES (
    inspector_user_id,
    'clarkvsteph1@gmail.com',
    'Tori Steph',
    'inspector',
    admin_user_id
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    admin_id = EXCLUDED.admin_id;
    
END $$;