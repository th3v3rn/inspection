ALTER TABLE inspections ADD COLUMN IF NOT EXISTS inspection_complete BOOLEAN DEFAULT false;
