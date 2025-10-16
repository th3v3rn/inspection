-- Disable RLS on properties table
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Admins can create properties" ON properties;
DROP POLICY IF EXISTS "Admins can view properties" ON properties;
DROP POLICY IF EXISTS "Admins can update properties" ON properties;
DROP POLICY IF EXISTS "Admins can delete properties" ON properties;
