-- First, drop the existing insert policy
DROP POLICY IF EXISTS "Admins and inspectors can insert inspections" ON inspections;

-- Create a new insert policy that properly handles admin users
CREATE POLICY "Allow admins to insert inspections"
ON inspections FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'system_admin')
  )
);

-- Create a separate policy for inspectors
CREATE POLICY "Allow inspectors to insert own inspections"
ON inspections FOR INSERT
WITH CHECK (
  inspector_id = auth.uid()
);

-- Update the select policy for admins to see their own created inspections
DROP POLICY IF EXISTS "Admins can view assigned inspectors inspections" ON inspections;
CREATE POLICY "Admins can view all relevant inspections"
ON inspections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  AND (
    -- Admin can see inspections created by their inspectors
    EXISTS (
      SELECT 1 FROM public.users inspector
      WHERE inspector.id = inspections.user_id
      AND inspector.admin_id = auth.uid()
    )
    OR 
    -- Admin can see inspections where they are the admin
    inspections.admin_id = auth.uid()
  )
);

-- Update policy for admin updates
DROP POLICY IF EXISTS "Allow all updates temporarily" ON inspections;
CREATE POLICY "Allow admins to update inspections"
ON inspections FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'system_admin')
  )
);

-- Allow inspectors to update their own inspections
CREATE POLICY "Allow inspectors to update own inspections"
ON inspections FOR UPDATE
USING (
  inspector_id = auth.uid()
);