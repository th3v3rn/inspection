-- Create a temporary table to see what users exist
CREATE TEMP TABLE debug_users AS
SELECT 
    id,
    email,
    role,
    admin_id,
    full_name,
    created_at
FROM public.users
WHERE email IN ('clarkvsteph@gmail.com', 'clarkvernonstephenson@gmail.com');

-- If no users exist, create them from auth.users
INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    CASE 
        WHEN au.email = 'clarkvsteph@gmail.com' THEN 'admin'
        ELSE 'inspector'
    END as role,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email IN ('clarkvsteph@gmail.com', 'clarkvernonstephenson@gmail.com')
AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.email = au.email
);

-- Force update the inspector's admin_id using the admin's actual ID
UPDATE public.users 
SET admin_id = (
    SELECT id FROM public.users WHERE email = 'clarkvsteph@gmail.com' LIMIT 1
)
WHERE email = 'clarkvernonstephenson@gmail.com';