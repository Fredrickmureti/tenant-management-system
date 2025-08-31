-- Add standing_charge column to billing_cycles table
ALTER TABLE public.billing_cycles 
ADD COLUMN standing_charge numeric NOT NULL DEFAULT 100.00;

-- Update existing billing cycles to have the standing charge
UPDATE public.billing_cycles 
SET standing_charge = 100.00 
WHERE standing_charge IS NULL;