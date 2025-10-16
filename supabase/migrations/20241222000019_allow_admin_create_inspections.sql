DROP POLICY IF EXISTS "Inspectors can create inspections" ON inspections;

CREATE POLICY "Users can create inspections"
ON inspections FOR INSERT
WITH CHECK (
  inspector_id = auth.uid() OR
  admin_id = auth.uid() OR
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'system_admin')
);
