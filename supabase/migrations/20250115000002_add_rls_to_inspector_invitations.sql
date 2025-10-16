-- Enable RLS on inspector_invitations table
ALTER TABLE inspector_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can insert their own invitations
DROP POLICY IF EXISTS "Admins can create invitations" ON inspector_invitations;
CREATE POLICY "Admins can create invitations"
ON inspector_invitations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = admin_id
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy: Admins can view their own invitations
DROP POLICY IF EXISTS "Admins can view their invitations" ON inspector_invitations;
CREATE POLICY "Admins can view their invitations"
ON inspector_invitations FOR SELECT
TO authenticated
USING (
  auth.uid() = admin_id
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy: Admins can update their own invitations
DROP POLICY IF EXISTS "Admins can update their invitations" ON inspector_invitations;
CREATE POLICY "Admins can update their invitations"
ON inspector_invitations FOR UPDATE
TO authenticated
USING (
  auth.uid() = admin_id
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy: Users can view invitations sent to their email
DROP POLICY IF EXISTS "Users can view invitations to their email" ON inspector_invitations;
CREATE POLICY "Users can view invitations to their email"
ON inspector_invitations FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy: Users can accept invitations sent to their email
DROP POLICY IF EXISTS "Users can accept their invitations" ON inspector_invitations;
CREATE POLICY "Users can accept their invitations"
ON inspector_invitations FOR UPDATE
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
)
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status IN ('accepted', 'expired')
);
