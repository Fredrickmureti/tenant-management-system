-- Create trigger to automatically carry forward previous balance from last billing cycle
CREATE OR REPLACE FUNCTION public.auto_set_previous_balance()
RETURNS TRIGGER AS $$
DECLARE
  last_balance NUMERIC;
BEGIN
  -- Get the current_balance from the most recent billing cycle for this tenant
  SELECT current_balance INTO last_balance
  FROM public.billing_cycles
  WHERE tenant_id = NEW.tenant_id
    AND (year < NEW.year OR (year = NEW.year AND month < NEW.month))
  ORDER BY year DESC, month DESC
  LIMIT 1;
  
  -- Set previous_balance to the last current_balance, or 0 if no previous record
  NEW.previous_balance = COALESCE(last_balance, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger that runs before insert on billing_cycles
CREATE TRIGGER billing_cycles_auto_previous_balance
  BEFORE INSERT ON public.billing_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_previous_balance();

-- Update the existing trigger to also recalculate current_balance when bill_amount changes
CREATE OR REPLACE FUNCTION public.billing_cycles_update_current_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate units_used if readings are provided
  IF NEW.current_reading IS NOT NULL AND NEW.previous_reading IS NOT NULL THEN
    NEW.units_used = NEW.current_reading - NEW.previous_reading;
  END IF;
  
  -- Calculate bill_amount if we have the necessary data
  IF NEW.units_used IS NOT NULL AND NEW.rate_per_unit IS NOT NULL AND NEW.standing_charge IS NOT NULL THEN
    NEW.bill_amount = (NEW.units_used * NEW.rate_per_unit) + NEW.standing_charge;
  END IF;
  
  -- Calculate current_balance: (bill_amount + previous_balance) - paid_amount
  IF NEW.bill_amount IS NOT NULL AND NEW.previous_balance IS NOT NULL AND NEW.paid_amount IS NOT NULL THEN
    NEW.current_balance = (NEW.bill_amount + NEW.previous_balance) - NEW.paid_amount;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic calculations on INSERT and UPDATE
CREATE OR REPLACE TRIGGER billing_cycles_calculate_balance
  BEFORE INSERT OR UPDATE ON public.billing_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.billing_cycles_update_current_balance();