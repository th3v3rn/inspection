CREATE TABLE IF NOT EXISTS inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('complete', 'incomplete')) DEFAULT 'incomplete',
  sync_status TEXT NOT NULL CHECK (sync_status IN ('synced', 'not-synced')) DEFAULT 'not-synced',
  categories JSONB NOT NULL DEFAULT '{
    "exterior": false,
    "interior": false,
    "hvac": false,
    "plumbing": false,
    "electrical": false,
    "hazards": false,
    "other": false
  }'::jsonb,
  inspector_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(date);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);

alter publication supabase_realtime add table inspections;