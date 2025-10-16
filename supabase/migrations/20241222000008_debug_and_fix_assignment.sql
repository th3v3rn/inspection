-- First, let's ensure clarkvsteph@gmail.com is an admin
UPDATE public.users 
SET role = 'admin', updated_at = NOW()
WHERE email = 'clarkvsteph@gmail.com';

-- Then, let's ensure clarkvernonstephenson@gmail.com is an inspector
UPDATE public.users 
SET role = 'inspector', updated_at = NOW()
WHERE email = 'clarkvernonstephenson@gmail.com';

-- Now assign the inspector to the admin
UPDATE public.users 
SET admin_id = (
    SELECT id FROM public.users 
    WHERE email = 'clarkvsteph@gmail.com' AND role = 'admin'
),
updated_at = NOW()
WHERE email = 'clarkvernonstephenson@gmail.com' AND role = 'inspector';