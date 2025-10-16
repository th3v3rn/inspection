DROP POLICY IF EXISTS "Allow public read access to inspection images" ON inspection_images;
DROP POLICY IF EXISTS "Allow public insert access to inspection images" ON inspection_images;
DROP POLICY IF EXISTS "Allow public update access to inspection images" ON inspection_images;
DROP POLICY IF EXISTS "Allow public delete access to inspection images" ON inspection_images;

CREATE POLICY "Inspectors can view their own inspection images"
ON inspection_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM inspections
    WHERE inspections.id = inspection_images.inspection_id
    AND inspections.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view images from assigned inspectors"
ON inspection_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_images.inspection_id
      AND inspections.admin_id = auth.uid()
    )
  )
);

CREATE POLICY "System admins can view all inspection images"
ON inspection_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'system_admin'
  )
);

CREATE POLICY "Inspectors can insert images to their own inspections"
ON inspection_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM inspections
    WHERE inspections.id = inspection_images.inspection_id
    AND inspections.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can insert images to assigned inspections"
ON inspection_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_images.inspection_id
      AND inspections.admin_id = auth.uid()
    )
  )
);

CREATE POLICY "System admins can insert any inspection images"
ON inspection_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'system_admin'
  )
);

CREATE POLICY "Inspectors can update their own inspection images"
ON inspection_images FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM inspections
    WHERE inspections.id = inspection_images.inspection_id
    AND inspections.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update images from assigned inspections"
ON inspection_images FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_images.inspection_id
      AND inspections.admin_id = auth.uid()
    )
  )
);

CREATE POLICY "System admins can update any inspection images"
ON inspection_images FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'system_admin'
  )
);

CREATE POLICY "Inspectors can delete their own inspection images"
ON inspection_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM inspections
    WHERE inspections.id = inspection_images.inspection_id
    AND inspections.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can delete images from assigned inspections"
ON inspection_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_images.inspection_id
      AND inspections.admin_id = auth.uid()
    )
  )
);

CREATE POLICY "System admins can delete any inspection images"
ON inspection_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'system_admin'
  )
);