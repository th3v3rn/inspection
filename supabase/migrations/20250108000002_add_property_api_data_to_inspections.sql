ALTER TABLE inspections 
ADD COLUMN IF NOT EXISTS property_api_data JSONB;

CREATE INDEX IF NOT EXISTS idx_inspections_property_api_data 
ON inspections USING gin(property_api_data);
