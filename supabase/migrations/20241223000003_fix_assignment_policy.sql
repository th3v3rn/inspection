DROP POLICY IF EXISTS "Admins can create assignments" ON assignments;
CREATE POLICY "Admins can create assignments"
ON assignments FOR INSERT
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'system_admin')
);
