-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Inspectors can view own data" ON public.users;
DROP POLICY IF EXISTS "Admins can create inspectors" ON public.users;
DROP POLICY IF EXISTS "Admins can view their inspectors" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admins can update inspectors" ON public.users;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own record"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can view their admin's inspectors"
ON public.users FOR SELECT
USING (admin_id = auth.uid());

CREATE POLICY "Users can insert own record"
ON public.users FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own record"
ON public.users FOR UPDATE
USING (auth.uid() = id);
