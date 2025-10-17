-- Revert the RLS policy changes from 20250115000005

-- Remove the users table RLS policies we added
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Disable RLS on users table (reverting to previous state)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Revert inspections policy back to user_id
DROP POLICY IF EXISTS "Users can view own inspections" ON inspections;
CREATE POLICY "Users can view own inspections"
ON inspections FOR SELECT
USING (auth.uid() = user_id);
