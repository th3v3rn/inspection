UPDATE public.users 
SET role = 'admin', 
    updated_at = NOW()
WHERE email = 'clarkvsteph@gmail.com';

INSERT INTO public.users (id, email, role, organization_name, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'clarkvsteph@gmail.com',
    'admin',
    'Clark Admin Organization',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'clarkvsteph@gmail.com'
);