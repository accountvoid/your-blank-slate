
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin_or_higher(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT json_build_object(
    'total_users',              (SELECT count(*) FROM auth.users),
    'active_users_7d',          (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '7 days'),
    'recent_registrations_7d',  (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'gates_completed',          (SELECT count(*) FROM public.user_quest_runs WHERE status = 'completed'),
    'side_missions_completed',  (SELECT count(*) FROM public.side_mission_progress WHERE status = 'completed'),
    'shop_items_total',         (SELECT count(*) FROM public.shop_items),
    'shop_items_active',        (SELECT count(*) FROM public.shop_items WHERE is_active = true),
    'gate_items_total',         (SELECT count(*) FROM public.gate_items),
    'gate_items_active',        (SELECT count(*) FROM public.gate_items WHERE is_active = true),
    'ads_total',                (SELECT count(*) FROM public.ads),
    'inventory_rows',           (SELECT count(*) FROM public.user_inventory),
    'total_payments_credited',  (SELECT count(*) FROM public.payments WHERE credited = true),
    'total_gold_sold',          (SELECT COALESCE(SUM(gold_amount),0) FROM public.payments WHERE credited = true),
    'total_audit_events',       (SELECT count(*) FROM public.audit_logs)
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;
