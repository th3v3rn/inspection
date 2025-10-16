-- Create trigger function to auto-generate property_number
CREATE OR REPLACE FUNCTION auto_generate_property_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_number IS NULL THEN
    NEW.property_number := get_next_property_number(NEW.admin_id, EXTRACT(YEAR FROM NOW())::INTEGER);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_generate_property_number ON properties;

-- Create trigger
CREATE TRIGGER trigger_auto_generate_property_number
  BEFORE INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_property_number();
