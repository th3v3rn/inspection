INSERT INTO storage.buckets (id, name, public)
VALUES ('Images', 'Images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Images');

DROP POLICY IF EXISTS "Allow public read access to images" ON storage.objects;
CREATE POLICY "Allow public read access to images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Images');

DROP POLICY IF EXISTS "Allow users to delete their own images" ON storage.objects;
CREATE POLICY "Allow users to delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Images');

DROP POLICY IF EXISTS "Allow users to update their own images" ON storage.objects;
CREATE POLICY "Allow users to update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Images');
