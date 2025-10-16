ALTER TABLE inspections 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON inspections(user_id);
