CREATE TABLE IF NOT EXISTS public.inspector_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES public.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invitation_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspector_invitations_email ON public.inspector_invitations(email);
CREATE INDEX IF NOT EXISTS idx_inspector_invitations_admin_id ON public.inspector_invitations(admin_id);
CREATE INDEX IF NOT EXISTS idx_inspector_invitations_status ON public.inspector_invitations(status);

alter publication supabase_realtime add table inspector_invitations;