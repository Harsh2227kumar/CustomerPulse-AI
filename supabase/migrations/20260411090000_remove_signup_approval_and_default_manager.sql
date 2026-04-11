-- Remove signup approval gating and make self-service signups manager accounts.

UPDATE public.profiles
SET is_approved = true,
    updated_at = now()
WHERE is_approved = false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    true
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'manager'::app_role);

  RETURN NEW;
END;
$function$;
