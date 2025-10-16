-- Update existing inspections to set user_id equal to inspector_id
UPDATE inspections
SET user_id = inspector_id
WHERE user_id IS NULL AND inspector_id IS NOT NULL;

-- Update the assignments table to ensure inspection_id is properly linked
UPDATE assignments a
SET inspection_id = i.id
FROM inspections i
WHERE i.inspector_id = a.inspector_id
AND NOT EXISTS (
  SELECT 1 FROM inspections 
  WHERE id = a.inspection_id
);

-- Create a trigger to automatically set user_id when inspector_id is set
CREATE OR REPLACE FUNCTION set_inspection_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inspector_id IS NOT NULL AND NEW.user_id IS NULL THEN
    NEW.user_id := NEW.inspector_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspection_user_id_trigger ON inspections;

CREATE TRIGGER inspection_user_id_trigger
BEFORE INSERT OR UPDATE ON inspections
FOR EACH ROW
EXECUTE FUNCTION set_inspection_user_id();