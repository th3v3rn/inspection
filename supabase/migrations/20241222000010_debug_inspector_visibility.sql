-- Let's check and fix the inspector assignment issue
-- First, ensure both users exist in auth.users (they should already be there from login)

-- Make sure both users exist in public.users with correct data
INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
SELECT 
    auth_user.id,
    auth_user.email,
    CASE 
        WHEN auth_user.email = 'clarkvsteph@gmail.com' THEN 'admin'
        WHEN auth_user.email = 'clarkvernonstephenson@gmail.com' THEN 'inspector'
        ELSE 'inspector'
    END,
    COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.email),
    NOW(),
    NOW()
FROM auth.users auth_user
WHERE auth_user.email IN ('clarkvsteph@gmail.com', 'clarkvernonstephenson@gmail.com')
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    updated_at = NOW();

-- Now ensure the assignment is correct
UPDATE public.users 
SET admin_id = (
    SELECT id FROM public.users 
    WHERE email = 'clarkvsteph@gmail.com'
),
updated_at = NOW()
WHERE email = 'clarkvernonstephenson@gmail.com';