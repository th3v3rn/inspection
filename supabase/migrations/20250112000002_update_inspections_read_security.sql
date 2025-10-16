DROP POLICY IF EXISTS "Admins can view all inspections" ON inspections;

DROP POLICY IF EXISTS "System admins can view all inspections" ON inspections;
CREATE POLICY "System admins can view all inspections"
ON inspections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'system_admin'
  )
);

DROP POLICY IF EXISTS "Admins can view assigned inspectors inspections" ON inspections;
CREATE POLICY "Admins can view assigned inspectors inspections"
ON inspections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  AND
  EXISTS (
    SELECT 1 FROM public.users inspector
    WHERE inspector.id = inspections.user_id
    AND inspector.admin_id = auth.uid()
  )
);
