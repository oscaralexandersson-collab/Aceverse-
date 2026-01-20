-- Function to sync email updates from auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email,
      updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger ensuring profiles table stays in sync when auth email changes (after confirmation)
DROP TRIGGER IF EXISTS on_auth_user_email_update ON auth.users;
CREATE TRIGGER on_auth_user_email_update
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_user_email_update();