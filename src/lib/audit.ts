import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'enable'
  | 'disable'
  | 'duplicate'
  | 'grant_role'
  | 'revoke_role'
  | 'reset_user'
  | 'ban_user'
  | 'unban_user'
  | 'give_reward';

interface AuditInput {
  action: AuditAction;
  table: string;
  recordId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Records an admin action in `audit_logs`. Never throws — auditing failures
 * must NOT block the mutation that succeeded. RLS restricts inserts to admins.
 */
export const logAudit = async ({ action, table, recordId, oldValue, newValue }: AuditInput) => {
  try {
    const { data: u } = await supabase.auth.getUser();
    const adminId = u.user?.id;
    if (!adminId) return;
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      action,
      affected_table: table,
      affected_record: recordId ?? null,
      old_value: (oldValue ?? null) as never,
      new_value: (newValue ?? null) as never,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch {
    // swallow — auditing is best-effort
  }
};
