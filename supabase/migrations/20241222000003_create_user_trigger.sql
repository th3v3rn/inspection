CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, organization_name, admin_id, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'inspector'),
    COALESCE(new.raw_user_meta_data->>'organization_name', 'Default Organization'),
    CASE 
      WHEN new.raw_user_meta_data->>'admin_id' IS NOT NULL 
      THEN (new.raw_user_meta_data->>'admin_id')::uuid 
      ELSE NULL 
    END,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();