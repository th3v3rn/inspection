DROP POLICY IF EXISTS "Admins can create assignments" ON assignments;
CREATE POLICY "Admins can create assignments"
ON assignments FOR INSERT
WITH CHECK (
  admin_id = auth.uid()
);
