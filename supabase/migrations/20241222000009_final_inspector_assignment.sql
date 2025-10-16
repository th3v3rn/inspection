-- Debug: Check current state and fix assignment
-- First ensure both users exist and have correct roles
INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'clarkvsteph@gmail.com',
    'admin',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'clarkvsteph@gmail.com');

INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'clarkvernonstephenson@gmail.com',
    'inspector',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'clarkvernonstephenson@gmail.com');

-- Update roles to be sure
UPDATE public.users 
SET role = 'admin', updated_at = NOW()
WHERE email = 'clarkvsteph@gmail.com';

UPDATE public.users 
SET role = 'inspector', updated_at = NOW()
WHERE email = 'clarkvernonstephenson@gmail.com';

-- Final assignment
UPDATE public.users 
SET admin_id = (
    SELECT id FROM public.users 
    WHERE email = 'clarkvsteph@gmail.com'
),
updated_at = NOW()
WHERE email = 'clarkvernonstephenson@gmail.com';