-- Get the actual admin user ID and assign inspector properly
WITH admin_user AS (
    SELECT id, email FROM public.users WHERE email = 'clarkvsteph@gmail.com'
),
inspector_user AS (
    SELECT id, email FROM public.users WHERE email = 'clarkvernonstephenson@gmail.com'
)
UPDATE public.users 
SET 
    admin_id = admin_user.id,
    role = 'inspector',
    updated_at = NOW()
FROM admin_user, inspector_user
WHERE public.users.id = inspector_user.id;

-- Also ensure the admin has the correct role
UPDATE public.users 
SET role = 'admin', updated_at = NOW()
WHERE email = 'clarkvsteph@gmail.com';