BEGIN;

-- Function to sync billing_cycles.paid_amount when payments change
CREATE OR REPLACE FUNCTION public.payments_sync_billing_paid_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.billing_cycles bc
    SET paid_amount = LEAST(
      ((bc.current_reading - bc.previous_reading) * bc.rate_per_unit) + bc.previous_balance,
      bc.paid_amount + NEW.amount
    ),
    updated_at = now()
    WHERE bc.id = NEW.billing_cycle_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.billing_cycle_id = OLD.billing_cycle_id THEN
      UPDATE public.billing_cycles bc
      SET paid_amount = LEAST(
        ((bc.current_reading - bc.previous_reading) * bc.rate_per_unit) + bc.previous_balance,
        bc.paid_amount - OLD.amount + NEW.amount
      ),
      updated_at = now()
      WHERE bc.id = NEW.billing_cycle_id;
    ELSE
      -- Moved payment to a different billing cycle
      UPDATE public.billing_cycles bc
      SET paid_amount = GREATEST(0, bc.paid_amount - OLD.amount),
          updated_at = now()
      WHERE bc.id = OLD.billing_cycle_id;

      UPDATE public.billing_cycles bc
      SET paid_amount = LEAST(
        ((bc.current_reading - bc.previous_reading) * bc.rate_per_unit) + bc.previous_balance,
        bc.paid_amount + NEW.amount
      ),
      updated_at = now()
      WHERE bc.id = NEW.billing_cycle_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.billing_cycles bc
    SET paid_amount = GREATEST(0, bc.paid_amount - OLD.amount),
        updated_at = now()
    WHERE bc.id = OLD.billing_cycle_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Triggers for payments table
DROP TRIGGER IF EXISTS trg_payments_sync_billing_ins ON public.payments;
CREATE TRIGGER trg_payments_sync_billing_ins
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.payments_sync_billing_paid_amount();

DROP TRIGGER IF EXISTS trg_payments_sync_billing_upd ON public.payments;
CREATE TRIGGER trg_payments_sync_billing_upd
AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.payments_sync_billing_paid_amount();

DROP TRIGGER IF EXISTS trg_payments_sync_billing_del ON public.payments;
CREATE TRIGGER trg_payments_sync_billing_del
AFTER DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.payments_sync_billing_paid_amount();

-- Backfill paid amounts from existing payments
WITH sums AS (
  SELECT billing_cycle_id, COALESCE(SUM(amount), 0)::numeric(10,2) AS total
  FROM public.payments
  GROUP BY billing_cycle_id
)
UPDATE public.billing_cycles bc
SET paid_amount = s.total,
    updated_at = now()
FROM sums s
WHERE bc.id = s.billing_cycle_id;

-- Clamp paid_amount to avoid negative current_balance
WITH sums AS (
  SELECT billing_cycle_id, COALESCE(SUM(amount), 0)::numeric(10,2) AS total
  FROM public.payments
  GROUP BY billing_cycle_id
)
UPDATE public.billing_cycles bc
SET paid_amount = LEAST(
  s.total,
  ((bc.current_reading - bc.previous_reading) * bc.rate_per_unit) + bc.previous_balance
),
updated_at = now()
FROM sums s
WHERE bc.id = s.billing_cycle_id;

COMMIT;
