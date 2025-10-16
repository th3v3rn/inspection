ALTER TABLE inspection_images
ADD COLUMN IF NOT EXISTS ai_detected_objects JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_suggested_fields JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_description TEXT;

COMMENT ON COLUMN inspection_images.ai_detected_objects IS 'Array of detected objects with details: name, type, material, condition, confidence, notes';
COMMENT ON COLUMN inspection_images.ai_suggested_fields IS 'AI-suggested form field values based on image analysis';
COMMENT ON COLUMN inspection_images.ai_description IS 'Overall AI-generated description of the image';
