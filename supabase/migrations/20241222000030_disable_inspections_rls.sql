ALTER TABLE inspections DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can insert inspections" ON inspections;
DROP POLICY IF EXISTS "Inspectors can view assigned inspections" ON inspections;
DROP POLICY IF EXISTS "Inspectors can update assigned inspections" ON inspections;
DROP POLICY IF EXISTS "Users can view own inspections" ON inspections;
DROP POLICY IF EXISTS "Users can insert own inspections" ON inspections;
DROP POLICY IF EXISTS "Users can update own inspections" ON inspections;
