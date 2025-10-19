ALTER TABLE inspections ADD COLUMN IF NOT EXISTS property_metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE inspections ALTER COLUMN property_id DROP NOT NULL;

COMMENT ON COLUMN inspections.property_metadata IS 'Stores property identification form data (acres, parcel info, sqft, year built, stories, etc.)';
