DROP TABLE IF EXISTS property_outlines;

CREATE TABLE IF NOT EXISTS property_outlines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  structures JSONB NOT NULL DEFAULT '[]'::jsonb,
  satellite_image_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  zoom_level INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_outlines_inspection_id ON property_outlines(inspection_id);

alter publication supabase_realtime add table property_outlines;
