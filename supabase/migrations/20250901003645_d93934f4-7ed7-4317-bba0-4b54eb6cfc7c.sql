-- Step 1: Add superadmin role to enum (must be done separately)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'superadmin';