ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'inspector' CHECK (role IN ('inspector', 'admin', 'system_admin'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.users(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_name TEXT;

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_admin_id ON public.users(admin_id);

alter publication supabase_realtime add table users;
