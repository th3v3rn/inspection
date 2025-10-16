ALTER TABLE inspection_images 
ADD COLUMN IF NOT EXISTS ai_detected_category TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_inspection_images_ai_category ON inspection_images(ai_detected_category);