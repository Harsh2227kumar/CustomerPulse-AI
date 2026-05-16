-- Fix auth trigger to ensure profiles and roles are created on signup
-- This trigger runs as SECURITY DEFINER so it bypasses RLS policies

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_full_name text;
BEGIN
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  -- Create profile (always approved now for self-service signup)
  INSERT INTO public.profiles (user_id, full_name, is_approved)
  VALUES (NEW.id, user_full_name, true)
  ON CONFLICT (user_id) DO UPDATE
  SET full_name = EXCLUDED.full_name, is_approved = true;

  -- Create user role as 'manager' (from metadata or default)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'manager'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger exists
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;