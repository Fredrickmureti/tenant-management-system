-- Fix the generated columns to include standing_charge properly
-- First, drop the existing generated columns
ALTER TABLE billing_cycles DROP COLUMN IF EXISTS units_used CASCADE;
ALTER TABLE billing_cycles DROP COLUMN IF EXISTS bill_amount CASCADE;
ALTER TABLE billing_cycles DROP COLUMN IF EXISTS current_balance CASCADE;

-- Recreate units_used as a generated column
ALTER TABLE billing_cycles ADD COLUMN units_used NUMERIC GENERATED ALWAYS AS (current_reading - previous_reading) STORED;

-- Recreate bill_amount to include standing_charge
ALTER TABLE billing_cycles ADD COLUMN bill_amount NUMERIC GENERATED ALWAYS AS ((current_reading - previous_reading) * rate_per_unit + standing_charge + previous_balance) STORED;

-- Recreate current_balance directly from base columns (not referencing bill_amount)
ALTER TABLE billing_cycles ADD COLUMN current_balance NUMERIC GENERATED ALWAYS AS ((current_reading - previous_reading) * rate_per_unit + standing_charge + previous_balance - paid_amount) STORED;