-- Promote specific users to superadmin role
UPDATE public.profiles 
SET role = 'superadmin'::user_role, updated_at = now()
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('fredrickmureti612@gmail.com', 'dominicmugendi9@gmail.com')
);