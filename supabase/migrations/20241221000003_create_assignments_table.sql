CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.users(id) NOT NULL,
  inspector_id UUID REFERENCES public.users(id) NOT NULL,
  property_id UUID REFERENCES properties(id) NOT NULL,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assignments_admin_id ON assignments(admin_id);
CREATE INDEX idx_assignments_inspector_id ON assignments(inspector_id);
CREATE INDEX idx_assignments_property_id ON assignments(property_id);
CREATE INDEX idx_assignments_status ON assignments(status);

alter publication supabase_realtime add table assignments;