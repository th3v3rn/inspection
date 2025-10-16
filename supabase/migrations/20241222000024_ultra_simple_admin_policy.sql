-- Drop ALL existing policies on inspections
DROP POLICY IF EXISTS "Inspectors can create inspections" ON inspections;
DROP POLICY IF EXISTS "Users can create inspections" ON inspections;
DROP POLICY IF EXISTS "Allow inspectors and admins to create inspections" ON inspections;
DROP POLICY IF EXISTS "Allow users to create inspections" ON inspections;
DROP POLICY IF EXISTS "Admins can insert inspections" ON inspections;

-- Create the simplest possible policy for admins
CREATE POLICY "Admins can insert inspections"
ON inspections FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'system_admin')
  )
);
