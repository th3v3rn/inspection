-- Drop all existing policies on inspections
DROP POLICY IF EXISTS "Inspectors can create inspections" ON inspections;
DROP POLICY IF EXISTS "Users can create inspections" ON inspections;
DROP POLICY IF EXISTS "Allow inspectors and admins to create inspections" ON inspections;
DROP POLICY IF EXISTS "Allow users to create inspections" ON inspections;

-- Create a simple policy that allows admins to insert with their admin_id
CREATE POLICY "Admins can create properties"
ON inspections FOR INSERT
WITH CHECK (
  admin_id IS NOT NULL 
  AND admin_id = auth.uid()
);

-- Create a policy for inspectors
CREATE POLICY "Inspectors can create inspections"
ON inspections FOR INSERT
WITH CHECK (
  inspector_id IS NOT NULL 
  AND inspector_id = auth.uid()
);
