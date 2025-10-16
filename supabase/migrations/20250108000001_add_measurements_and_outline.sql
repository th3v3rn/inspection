ALTER TABLE inspections 
ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS property_outline JSONB;

CREATE INDEX IF NOT EXISTS idx_inspections_measurements ON inspections USING GIN (measurements);
CREATE INDEX IF NOT EXISTS idx_inspections_property_outline ON inspections USING GIN (property_outline);
