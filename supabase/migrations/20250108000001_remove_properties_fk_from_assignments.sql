ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_property_id_fkey;

DELETE FROM assignments 
WHERE property_id NOT IN (SELECT id FROM inspections);

ALTER TABLE assignments 
RENAME COLUMN property_id TO inspection_id;

ALTER TABLE assignments 
ADD CONSTRAINT assignments_inspection_id_fkey 
FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE;