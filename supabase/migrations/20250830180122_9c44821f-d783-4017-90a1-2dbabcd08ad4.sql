-- Fix the payments trigger function to only update paid_amount
-- current_balance is automatically calculated as: ((current_reading - previous_reading) * rate_per_unit + previous_balance) - paid_amount
CREATE OR REPLACE FUNCTION public.payments_sync_billing_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Recalculate paid_amount for the billing cycle
    UPDATE public.billing_cycles bc
    SET 
      paid_amount = COALESCE((
        SELECT SUM(amount) 
        FROM public.payments 
        WHERE billing_cycle_id = NEW.billing_cycle_id
      ), 0),
      updated_at = now()
    WHERE bc.id = NEW.billing_cycle_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle case where payment is moved to different billing cycle
    IF NEW.billing_cycle_id != OLD.billing_cycle_id THEN
      -- Update old billing cycle
      UPDATE public.billing_cycles bc
      SET 
        paid_amount = COALESCE((
          SELECT SUM(amount) 
          FROM public.payments 
          WHERE billing_cycle_id = OLD.billing_cycle_id
        ), 0),
        updated_at = now()
      WHERE bc.id = OLD.billing_cycle_id;
    END IF;
    
    -- Update new/current billing cycle
    UPDATE public.billing_cycles bc
    SET 
      paid_amount = COALESCE((
        SELECT SUM(amount) 
        FROM public.payments 
        WHERE billing_cycle_id = NEW.billing_cycle_id
      ), 0),
      updated_at = now()
    WHERE bc.id = NEW.billing_cycle_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Recalculate after deletion
    UPDATE public.billing_cycles bc
    SET 
      paid_amount = COALESCE((
        SELECT SUM(amount) 
        FROM public.payments 
        WHERE billing_cycle_id = OLD.billing_cycle_id
      ), 0),
      updated_at = now()
    WHERE bc.id = OLD.billing_cycle_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS payments_sync_billing_paid_amount_trigger ON public.payments;

CREATE TRIGGER payments_sync_billing_paid_amount_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.payments_sync_billing_paid_amount();

-- Recalculate all existing paid amounts to fix data
UPDATE public.billing_cycles bc
SET 
  paid_amount = COALESCE((
    SELECT SUM(amount) 
    FROM public.payments 
    WHERE billing_cycle_id = bc.id
  ), 0),
  updated_at = now();