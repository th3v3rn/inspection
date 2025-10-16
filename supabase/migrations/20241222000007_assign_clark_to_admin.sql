UPDATE public.users 
SET admin_id = (
    SELECT id FROM public.users 
    WHERE email = 'clarkvsteph@gmail.com' AND role = 'admin'
),
updated_at = NOW()
WHERE email = 'clarkvernonstephenson@gmail.com' AND role = 'inspector';