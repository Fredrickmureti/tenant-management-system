-- 2) admin_invites table to track invites of admins/clerks
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text,
  role public.user_role NOT NULL,
  invited_by uuid NOT NULL, -- no FK to auth.users to avoid recursive/RLS problems
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','accepted','failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

-- ensure only admin/clerk roles are allowed for invites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_invites_role_allowed'
  ) THEN
    ALTER TABLE public.admin_invites
      ADD CONSTRAINT admin_invites_role_allowed
      CHECK (role IN ('admin'::public.user_role, 'clerk'::public.user_role));
  END IF;
END $$;

-- RLS for admin_invites
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_invites' AND policyname='Admins can view admin_invites') THEN
    DROP POLICY "Admins can view admin_invites" ON public.admin_invites;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_invites' AND policyname='Admins can create admin_invites') THEN
    DROP POLICY "Admins can create admin_invites" ON public.admin_invites;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_invites' AND policyname='Admins can update admin_invites') THEN
    DROP POLICY "Admins can update admin_invites" ON public.admin_invites;
  END IF;
END $$;

CREATE POLICY "Admins can view admin_invites"
  ON public.admin_invites
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.user_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.user_role)
  );

CREATE POLICY "Admins can create admin_invites"
  ON public.admin_invites
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.user_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.user_role)
  );

CREATE POLICY "Admins can update admin_invites"
  ON public.admin_invites
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::public.user_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.user_role)
  );

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'admin_invites_set_updated_at'
  ) THEN
    CREATE TRIGGER admin_invites_set_updated_at
      BEFORE UPDATE ON public.admin_invites
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) audit_logs for tracking clerk changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_role public.user_role NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  table_name text NOT NULL,
  row_id uuid,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only superadmins can view
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='Superadmins can view audit_logs') THEN
    DROP POLICY "Superadmins can view audit_logs" ON public.audit_logs;
  END IF;
END $$;

CREATE POLICY "Superadmins can view audit_logs"
  ON public.audit_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'::public.user_role));

-- 4) Trigger function to log clerk changes
CREATE OR REPLACE FUNCTION public.log_clerk_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  act text;
  rowuuid uuid;
  payload jsonb;
BEGIN
  -- Only log when the current user is a clerk
  IF NOT public.has_role(auth.uid(), 'clerk'::public.user_role) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    act := 'INSERT';
    rowuuid := NEW.id;
    payload := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    act := 'UPDATE';
    rowuuid := NEW.id;
    payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    act := 'DELETE';
    rowuuid := OLD.id;
    payload := to_jsonb(OLD);
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, table_name, row_id, changes)
  VALUES (auth.uid(), 'clerk', act, TG_TABLE_NAME, rowuuid, payload);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 5) Attach logging triggers to key tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'log_clerk_changes_on_tenants') THEN
    CREATE TRIGGER log_clerk_changes_on_tenants
      AFTER INSERT OR UPDATE OR DELETE ON public.tenants
      FOR EACH ROW EXECUTE FUNCTION public.log_clerk_changes();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'log_clerk_changes_on_billing_cycles') THEN
    CREATE TRIGGER log_clerk_changes_on_billing_cycles
      AFTER INSERT OR UPDATE OR DELETE ON public.billing_cycles
      FOR EACH ROW EXECUTE FUNCTION public.log_clerk_changes();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'log_clerk_changes_on_payments') THEN
    CREATE TRIGGER log_clerk_changes_on_payments
      AFTER INSERT OR UPDATE OR DELETE ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.log_clerk_changes();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'log_clerk_changes_on_communication_logs') THEN
    CREATE TRIGGER log_clerk_changes_on_communication_logs
      AFTER INSERT OR UPDATE OR DELETE ON public.communication_logs
      FOR EACH ROW EXECUTE FUNCTION public.log_clerk_changes();
  END IF;
END $$;

-- 6) Add audit_logs to realtime publication
-- Inserts on audit_logs will stream to clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

-- 7) Tighten communication_logs RLS for DELETE and preserve existing behavior for other ops
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Drop permissive existing policies if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='communication_logs' AND policyname='Authenticated users can manage communication logs') THEN
    DROP POLICY "Authenticated users can manage communication logs" ON public.communication_logs;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='communication_logs' AND policyname='Authenticated users can view communication logs') THEN
    DROP POLICY "Authenticated users can view communication logs" ON public.communication_logs;
  END IF;
END $$;

-- Preserve current UX: allow authenticated users to view/insert/update
CREATE POLICY "Anyone authenticated can view communication logs"
  ON public.communication_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone authenticated can insert communication logs"
  ON public.communication_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update communication logs"
  ON public.communication_logs
  FOR UPDATE
  USING (true);

-- Restrict DELETE to admin/superadmin and only for failed messages
CREATE POLICY "Admins can delete failed communication logs"
  ON public.communication_logs
  FOR DELETE
  USING (
    (public.has_role(auth.uid(), 'admin'::public.user_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.user_role))
    AND status = 'failed'
  );