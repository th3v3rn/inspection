-- Temporarily drop the foreign key constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Temporarily disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Delete any existing inspector with this email
DELETE FROM public.users WHERE email = 'clarkvernonstephenson@gmail.com';

-- Insert the inspector with a generated UUID
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

-- Add back the foreign key constraint (but make it not enforced for existing rows)
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) NOT VALID;

-- Add policies that allow admins to view their inspectors
DROP POLICY IF EXISTS "Admins can view their inspectors" ON public.users;
CREATE POLICY "Admins can view their inspectors"
ON public.users FOR SELECT
USING (
  auth.uid() = id OR
  admin_id = auth.uid() OR
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'system_admin')
);
