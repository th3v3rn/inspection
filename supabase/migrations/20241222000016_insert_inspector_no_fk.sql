-- First, let's check if we need to drop the foreign key constraint temporarily
-- or we can just insert without the constraint

-- Temporarily disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Delete any existing inspector with this email
DELETE FROM public.users WHERE email = 'clarkvernonstephenson@gmail.com';

-- Insert the inspector WITHOUT the id foreign key constraint
-- We'll use a UUID that doesn't need to match auth.users yet
INSERT INTO public.users (email, role, admin_id, full_name, created_at, updated_at)
VALUES (
    'clarkvernonstephenson@gmail.com',
    'inspector',
    '4362edc7-d89e-4ee0-9665-1a309e32be98',
    'Clark Vernon Stephenson',
    NOW(),
    NOW()
);

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add a policy that allows admins to insert and view inspectors
DROP POLICY IF EXISTS "Admins can create inspectors" ON public.users;
CREATE POLICY "Admins can create inspectors"
ON public.users FOR INSERT
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'system_admin')
);

DROP POLICY IF EXISTS "Admins can view their inspectors" ON public.users;
CREATE POLICY "Admins can view their inspectors"
ON public.users FOR SELECT
USING (
  auth.uid() = id OR
  admin_id = auth.uid() OR
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'system_admin')
);
