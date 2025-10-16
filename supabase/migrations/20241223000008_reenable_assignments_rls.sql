-- Re-enable RLS on assignments table
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "View assignments" ON assignments;
DROP POLICY IF EXISTS "Admins can create assignments" ON assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON assignments;

-- Simple policy for viewing assignments
CREATE POLICY "View assignments"
ON assignments FOR SELECT
USING (
  inspector_id = auth.uid() OR
  admin_id = auth.uid()
);

-- Simple policy for creating assignments (just check admin_id matches)
CREATE POLICY "Admins can create assignments"
ON assignments FOR INSERT
WITH CHECK (admin_id = auth.uid());

-- Simple policy for updating assignments
CREATE POLICY "Admins can update assignments"
ON assignments FOR UPDATE
USING (admin_id = auth.uid());
