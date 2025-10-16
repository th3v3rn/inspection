-- Create the inspector user directly in public.users table
-- This will work even if they haven't signed up to auth yet
INSERT INTO public.users (id, email, role, admin_id, full_name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'clarkvernonstephenson@gmail.com',
    'inspector',
    '4362edc7-d89e-4ee0-9665-1a309e32be98',
    'Clark Vernon Stephenson',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    role = 'inspector',
    admin_id = '4362edc7-d89e-4ee0-9665-1a309e32be98',
    updated_at = NOW();