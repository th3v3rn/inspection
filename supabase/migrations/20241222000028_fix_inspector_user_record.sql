-- First, check if there's a user with this email but different ID
-- If so, update the auth user ID to match the public.users record

-- Get the existing user record
DO $$
DECLARE
  existing_user_id uuid;
  auth_user_id uuid := '603c8bcd-31de-4e09-85e1-ead01239ebe1'::uuid;
  user_email text := 'clarkvernonstephenson@gmail.com';
BEGIN
  -- Find existing user record by email
  SELECT id INTO existing_user_id
  FROM public.users
  WHERE email = user_email
  LIMIT 1;

  -- If user exists with different ID, update it to match auth ID
  IF existing_user_id IS NOT NULL AND existing_user_id != auth_user_id THEN
    -- Delete the old record
    DELETE FROM public.users WHERE id = existing_user_id;
    
    -- Insert with correct auth ID
    INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
    VALUES (
      auth_user_id,
      user_email,
      'inspector',
      'Clark Vernon Stephenson',
      NOW(),
      NOW()
    );
  ELSIF existing_user_id IS NULL THEN
    -- No existing record, create new one
    INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
    VALUES (
      auth_user_id,
      user_email,
      'inspector',
      'Clark Vernon Stephenson',
      NOW(),
      NOW()
    );
  END IF;

  -- Update admin_id from invitation if exists
  UPDATE public.users
  SET admin_id = (
    SELECT admin_id 
    FROM inspector_invitations 
    WHERE email = user_email
    AND status = 'pending'
    LIMIT 1
  )
  WHERE id = auth_user_id
  AND admin_id IS NULL;
END $$;