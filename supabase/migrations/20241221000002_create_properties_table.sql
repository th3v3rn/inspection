CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.users(id) NOT NULL,
  property_number TEXT NOT NULL,
  address TEXT NOT NULL,
  property_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(admin_id, property_number)
);

CREATE INDEX idx_properties_admin_id ON properties(admin_id);
CREATE INDEX idx_properties_property_number ON properties(property_number);

CREATE OR REPLACE FUNCTION get_next_property_number(p_admin_id UUID, p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  property_num TEXT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(property_number, '-', 2) AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM properties
  WHERE admin_id = p_admin_id
    AND property_number LIKE p_year || '-%';
  
  property_num := p_year || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN property_num;
END;
$$ LANGUAGE plpgsql;

alter publication supabase_realtime add table properties;