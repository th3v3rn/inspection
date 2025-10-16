ALTER TABLE inspections 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id),
ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id);

CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_admin_id ON inspections(admin_id);
CREATE INDEX IF NOT EXISTS idx_inspections_assignment_id ON inspections(assignment_id);