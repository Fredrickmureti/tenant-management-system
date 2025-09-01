-- Enable proper deletion for profiles table
-- First, add policy to allow admins to delete profiles
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'superadmin'::user_role)
);

-- Update existing insert policy to allow system user creation
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "System can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);