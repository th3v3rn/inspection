DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data"
ON public.users FOR SELECT
USING (
  auth.uid() = id OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'system_admin' OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' AND admin_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data"
ON public.users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view their properties" ON properties;
CREATE POLICY "Admins can view their properties"
ON properties FOR SELECT
USING (
  admin_id = auth.uid() OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'system_admin'
);

DROP POLICY IF EXISTS "Admins can create properties" ON properties;
CREATE POLICY "Admins can create properties"
ON properties FOR INSERT
WITH CHECK (
  admin_id = auth.uid() AND
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'system_admin')
);

DROP POLICY IF EXISTS "Admins can update their properties" ON properties;
CREATE POLICY "Admins can update their properties"
ON properties FOR UPDATE
USING (
  admin_id = auth.uid() OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'system_admin'
);

DROP POLICY IF EXISTS "View assignments" ON assignments;
CREATE POLICY "View assignments"
ON assignments FOR SELECT
USING (
  inspector_id = auth.uid() OR
  admin_id = auth.uid() OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'system_admin'
);

DROP POLICY IF EXISTS "Admins can create assignments" ON assignments;
CREATE POLICY "Admins can create assignments"
ON assignments FOR INSERT
WITH CHECK (
  admin_id = auth.uid() AND
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'system_admin')
);

DROP POLICY IF EXISTS "Admins can update assignments" ON assignments;
CREATE POLICY "Admins can update assignments"
ON assignments FOR UPDATE
USING (
  admin_id = auth.uid() OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'system_admin'
);

DROP POLICY IF EXISTS "View inspections" ON inspections;
CREATE POLICY "View inspections"
ON inspections FOR SELECT
USING (
  inspector_id = auth.uid() OR
  admin_id = auth.uid() OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'system_admin'
);

DROP POLICY IF EXISTS "Inspectors can create inspections" ON inspections;
CREATE POLICY "Inspectors can create inspections"
ON inspections FOR INSERT
WITH CHECK (
  inspector_id = auth.uid()
);

DROP POLICY IF EXISTS "Inspectors can update their inspections" ON inspections;
CREATE POLICY "Inspectors can update their inspections"
ON inspections FOR UPDATE
USING (
  inspector_id = auth.uid() OR
  admin_id = auth.uid() OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'system_admin'
);