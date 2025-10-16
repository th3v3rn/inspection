-- Temporarily disable RLS to insert the inspector
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Delete any existing inspector with this email to avoid conflicts
DELETE FROM public.users WHERE email = 'clarkvernonstephenson@gmail.com';

-- Insert the inspector user
INSERT INTO public.users (id, email, role, admin_id, full_name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'clarkvernonstephenson@gmail.com',
    'inspector',
    '4362edc7-d89e-4ee0-9665-1a309e32be98',
    'Clark Vernon Stephenson',
    NOW(),
    NOW()
);

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add a policy that allows admins to insert inspectors
DROP POLICY IF EXISTS "Admins can create inspectors" ON public.users;
CREATE POLICY "Admins can create inspectors"
ON public.users FOR INSERT
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'system_admin')
  AND role = 'inspector'
  AND admin_id = auth.uid()
);
