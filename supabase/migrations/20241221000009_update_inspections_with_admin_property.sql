ALTER TABLE inspections ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_admin_id ON inspections(admin_id);
