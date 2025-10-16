-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Inspectors can create inspections" ON inspections;

-- The "Allow inspectors and admins to create inspections" policy from the previous migration
-- should now be the only INSERT policy and will allow admins to create inspections
