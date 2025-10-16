-- First, let's check if there are any assignments with missing inspections
CREATE OR REPLACE FUNCTION debug_assignments_inspections() RETURNS TABLE (
  assignment_id UUID,
  inspection_id UUID,
  inspection_exists BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id AS assignment_id,
    a.inspection_id,
    (EXISTS (SELECT 1 FROM inspections i WHERE i.id = a.inspection_id)) AS inspection_exists
  FROM 
    assignments a;
END;
$$ LANGUAGE plpgsql;

-- Create a view to help debug the relationship
CREATE OR REPLACE VIEW assignments_with_inspections AS
SELECT 
  a.id AS assignment_id,
  a.inspection_id,
  a.inspector_id,
  a.status AS assignment_status,
  i.id AS inspection_id_actual,
  i.address,
  i.status AS inspection_status
FROM 
  assignments a
LEFT JOIN 
  inspections i ON a.inspection_id = i.id;

-- Update the assignments table to properly link to inspections
-- This will create inspections for assignments that don't have one
INSERT INTO inspections (
  id,
  address,
  date,
  status,
  inspector_id,
  admin_id
)
SELECT 
  gen_random_uuid(),
  'New Property ' || a.id::text,
  NOW(),
  'incomplete',
  a.inspector_id,
  a.admin_id
FROM 
  assignments a
WHERE 
  NOT EXISTS (SELECT 1 FROM inspections i WHERE i.id = a.inspection_id);

-- Update assignments to point to the newly created inspections
UPDATE assignments a
SET inspection_id = (
  SELECT i.id 
  FROM inspections i 
  WHERE i.inspector_id = a.inspector_id 
  ORDER BY i.created_at DESC 
  LIMIT 1
)
WHERE NOT EXISTS (
  SELECT 1 
  FROM inspections i 
  WHERE i.id = a.inspection_id
);

-- Make sure the foreign key constraint is properly set
ALTER TABLE assignments 
DROP CONSTRAINT IF EXISTS assignments_inspection_id_fkey;

ALTER TABLE assignments 
ADD CONSTRAINT assignments_inspection_id_fkey 
FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE;