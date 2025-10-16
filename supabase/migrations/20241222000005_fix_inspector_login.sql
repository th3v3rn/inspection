-- First, create the missing user record for clarkvernonstephenson@gmail.com
INSERT INTO public.users (id, email, role, organization_name, created_at, updated_at)
VALUES (
    '603c8bcd-31de-4e09-85e1-ead01239ebe1'::uuid,
    'clarkvernonstephenson@gmail.com',
    'inspector',
    'Default Organization',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Update RLS policies to allow users to insert their own records
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
CREATE POLICY "Users can insert their own record"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- Update RLS policies to allow users to read their own records
DROP POLICY IF EXISTS "Users can view their own record" ON users;
CREATE POLICY "Users can view their own record"
ON users FOR SELECT
USING (auth.uid() = id);

-- Allow admins to view all users
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'system_admin')
    )
);