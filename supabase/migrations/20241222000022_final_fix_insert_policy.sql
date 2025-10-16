-- Drop ALL existing INSERT policies on inspections
DROP POLICY IF EXISTS "Inspectors can create inspections" ON inspections;
DROP POLICY IF EXISTS "Users can create inspections" ON inspections;
DROP POLICY IF EXISTS "Allow inspectors and admins to create inspections" ON inspections;

-- Create a single comprehensive INSERT policy
CREATE POLICY "Allow users to create inspections"
ON inspections FOR INSERT
WITH CHECK (
  -- Allow if user is an inspector and setting their own inspector_id
  (inspector_id = auth.uid() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'inspector')
  OR
  -- Allow if user is an admin and setting their own admin_id
  (admin_id = auth.uid() AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'system_admin'))
);
