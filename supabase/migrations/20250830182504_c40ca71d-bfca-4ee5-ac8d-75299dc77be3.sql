-- Add tenant role to existing user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tenant';

-- Create a function to link tenants table with user profiles
-- This allows tenants to have user accounts
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);

-- Update the handle_new_user function to support tenant role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'clerk'::user_role)
  );
  RETURN NEW;
END;
$function$;