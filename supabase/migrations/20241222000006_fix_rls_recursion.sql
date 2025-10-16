-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Public access" ON users;

-- Disable RLS temporarily to avoid recursion issues
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "Allow authenticated users to read their own data"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to insert their own data"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow authenticated users to update their own data"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);