-- Check if property_outlines table exists and fix any issues
DO $$ 
BEGIN
  -- If the table doesn't exist, create it
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_outlines') THEN
    CREATE TABLE property_outlines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id UUID NOT NULL,
      structures JSONB NOT NULL DEFAULT '[]'::jsonb,
      satellite_image_url TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      zoom_level INTEGER DEFAULT 20,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_property_outlines_property_id ON property_outlines(property_id);
    ALTER TABLE property_outlines DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;
