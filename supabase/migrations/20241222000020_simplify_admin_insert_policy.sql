-- Drop the existing policy
DROP POLICY IF EXISTS "Users can create inspections" ON inspections;

-- Create a simpler policy that checks user role directly
CREATE POLICY "Allow inspectors and admins to create inspections"
ON inspections FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('inspector', 'admin', 'system_admin')
  )
);
