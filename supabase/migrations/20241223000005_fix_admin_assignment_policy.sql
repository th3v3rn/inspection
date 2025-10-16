DROP POLICY IF EXISTS "Admins can create assignments" ON assignments;

CREATE POLICY "Admins can create assignments"
ON assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'system_admin')
  )
  AND admin_id = auth.uid()
);
