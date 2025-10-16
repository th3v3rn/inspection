-- Temporarily disable RLS on inspections to debug
ALTER TABLE inspections DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Inspectors can create inspections" ON inspections;
DROP POLICY IF EXISTS "Users can create inspections" ON inspections;
DROP POLICY IF EXISTS "Allow inspectors and admins to create inspections" ON inspections;
DROP POLICY IF EXISTS "Allow users to create inspections" ON inspections;
DROP POLICY IF EXISTS "Admins can insert inspections" ON inspections;
