DO $$
DECLARE
  user_uuid UUID;
  user_exists_in_public BOOLEAN;
BEGIN
  SELECT id INTO user_uuid FROM auth.users WHERE email = 'th3v3rn@gmail.com';
  
  IF user_uuid IS NULL THEN
    user_uuid := gen_random_uuid();
    
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
      user_uuid,
      '00000000-0000-0000-0000-000000000000',
      'th3v3rn@gmail.com',
      crypt('Admin123!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      'authenticated',
      'authenticated'
    );
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('Admin123!', gen_salt('bf')),
        updated_at = NOW()
    WHERE id = user_uuid;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_uuid) INTO user_exists_in_public;
  
  IF NOT user_exists_in_public THEN
    INSERT INTO public.users (
      id,
      email,
      role,
      organization_name,
      created_at
    ) VALUES (
      user_uuid,
      'th3v3rn@gmail.com',
      'system_admin',
      'System Administration',
      NOW()
    );
  ELSE
    UPDATE public.users
    SET role = 'system_admin',
        organization_name = 'System Administration',
        updated_at = NOW()
    WHERE id = user_uuid;
  END IF;
END $$;