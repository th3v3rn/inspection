ALTER TABLE assignments ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);

CREATE INDEX IF NOT EXISTS idx_assignments_property_id ON assignments(property_id);
