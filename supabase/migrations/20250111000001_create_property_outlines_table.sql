CREATE TABLE IF NOT EXISTS property_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  structures JSONB NOT NULL DEFAULT '[]'::jsonb,
  satellite_image_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  zoom_level INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_outlines_property_id ON property_outlines(property_id);

alter publication supabase_realtime add table property_outlines;
