DROP POLICY IF EXISTS "Users can insert their own inspection images" ON inspection_images;
CREATE POLICY "Users can insert their own inspection images"
ON inspection_images FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own inspection images" ON inspection_images;
CREATE POLICY "Users can view their own inspection images"
ON inspection_images FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can update their own inspection images" ON inspection_images;
CREATE POLICY "Users can update their own inspection images"
ON inspection_images FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Users can delete their own inspection images" ON inspection_images;
CREATE POLICY "Users can delete their own inspection images"
ON inspection_images FOR DELETE
USING (true);
