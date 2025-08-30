
-- Make user_id nullable and remove the foreign key constraint that's causing issues
-- We'll handle user relationships differently to avoid blocking tenant creation
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_user_id_fkey;

-- Ensure user_id can be null (it should already be nullable based on the schema)
ALTER TABLE public.tenants ALTER COLUMN user_id DROP NOT NULL;
