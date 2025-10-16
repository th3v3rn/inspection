-- Use the actual admin user ID from the console log
-- First ensure the admin user exists with the correct ID
INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
VALUES (
    '4362edc7-d89e-4ee0-9665-1a309e32be98',
    'clarkvsteph@gmail.com',
    'admin',
    'clarkvsteph@gmail.com',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    email = 'clarkvsteph@gmail.com',
    updated_at = NOW();

-- Create or update the inspector user and assign to the correct admin
INSERT INTO public.users (id, email, role, admin_id, full_name, created_at, updated_at)
SELECT 
    COALESCE(
        (SELECT id FROM auth.users WHERE email = 'clarkvernonstephenson@gmail.com'),
        gen_random_uuid()
    ),
    'clarkvernonstephenson@gmail.com',
    'inspector',
    '4362edc7-d89e-4ee0-9665-1a309e32be98',
    'clarkvernonstephenson@gmail.com',
    NOW(),
    NOW()
ON CONFLICT (email) DO UPDATE SET
    role = 'inspector',
    admin_id = '4362edc7-d89e-4ee0-9665-1a309e32be98',
    updated_at = NOW();