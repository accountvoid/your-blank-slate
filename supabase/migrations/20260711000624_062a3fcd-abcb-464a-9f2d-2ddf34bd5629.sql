
-- 1. Add owner enum value.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- 2. Restore/ensure EXECUTE for role-check helpers actually used by RLS policies.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 3. is_owner()
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'owner'
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated;

-- 4. Ensure is_admin recognizes owner.
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('owner','super_admin','admin','moderator')
  )
$$;

-- 5. Protect owner rows: only Owner (or service_role) can add/change/remove owner role.
CREATE OR REPLACE FUNCTION public.protect_owner_rows()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role::text = 'owner' AND auth.uid() IS NOT NULL AND NOT public.is_owner(auth.uid()) THEN
      RAISE EXCEPTION 'Only the Owner can remove the Owner role';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.role::text = 'owner' OR NEW.role::text = 'owner')
       AND auth.uid() IS NOT NULL AND NOT public.is_owner(auth.uid()) THEN
      RAISE EXCEPTION 'Only the Owner can modify Owner-role rows';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.role::text = 'owner'
       AND auth.uid() IS NOT NULL AND NOT public.is_owner(auth.uid()) THEN
      RAISE EXCEPTION 'Only the Owner can grant the Owner role';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS protect_owner_rows_trg ON public.user_roles;
CREATE TRIGGER protect_owner_rows_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_owner_rows();

-- 6. Audit log: add ip_address column (user_agent already exists).
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address text;

-- 7. record_admin_action(): server-side audit writer. Admin-only.
CREATE OR REPLACE FUNCTION public.record_admin_action(
  _action text,
  _table text,
  _record_id text,
  _before jsonb,
  _after jsonb,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO public.audit_logs(actor_id, action, table_name, record_id, before, after, ip_address, user_agent)
  VALUES (auth.uid(), _action, _table, _record_id, _before, _after, _ip, _user_agent)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.record_admin_action(text,text,text,jsonb,jsonb,text,text) TO authenticated;
