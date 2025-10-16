DROP POLICY IF EXISTS "Allow all deletes temporarily" ON inspections;

CREATE POLICY "System admins can delete inspections"
ON inspections FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'system_admin'
  )
);

CREATE POLICY "Admins can delete their inspections"
ON inspections FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  AND (
    inspector_id IN (
      SELECT inspector_id FROM assignments
      WHERE admin_id = auth.uid()
    )
    OR admin_id = auth.uid()
  )
);

CREATE POLICY "Inspectors can delete own inspections"
ON inspections FOR DELETE
USING (inspector_id = auth.uid());
