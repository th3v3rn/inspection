DROP POLICY IF EXISTS "Allow all inserts temporarily" ON inspections;

CREATE POLICY "Admins and inspectors can insert inspections"
ON inspections FOR INSERT
WITH CHECK (
  -- Allow if the user is the inspector for this inspection
  inspector_id = auth.uid() OR
  -- Allow if the user is the admin for this inspection
  admin_id = auth.uid() OR
  -- Allow if the user is an admin or system_admin
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'system_admin')
  )
);