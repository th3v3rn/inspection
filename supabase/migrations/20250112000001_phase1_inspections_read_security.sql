ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own inspections" ON inspections;
CREATE POLICY "Users can view own inspections"
ON inspections FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all inspections" ON inspections;
CREATE POLICY "Admins can view all inspections"
ON inspections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Allow all inserts temporarily" ON inspections;
CREATE POLICY "Allow all inserts temporarily"
ON inspections FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates temporarily" ON inspections;
CREATE POLICY "Allow all updates temporarily"
ON inspections FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Allow all deletes temporarily" ON inspections;
CREATE POLICY "Allow all deletes temporarily"
ON inspections FOR DELETE
USING (true);
