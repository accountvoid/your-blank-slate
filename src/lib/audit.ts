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
  | 'give_reward'
  | 'settings_update';

interface AuditInput {
  action: AuditAction;
  table: string;
  recordId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  /** When true, an email alert is sent to setvoid.app@gmail.com. Defaults to true. */
  sensitive?: boolean;
}

/**
 * Records an admin action via the `admin-notify` edge function, which:
 *   1. verifies the caller's JWT + admin role SERVER-SIDE,
 *   2. inserts into `audit_logs` via `record_admin_action` (SECURITY DEFINER, re-checks admin),
 *   3. emails setvoid.app@gmail.com when `sensitive` is true.
 *
 * Never throws — auditing failures must NOT block a mutation that already succeeded.
 * The client CANNOT bypass authorization by editing this file: the edge function
 * re-validates the JWT and role against `user_roles` before writing.
 */
export const logAudit = async ({
  action,
  table,
  recordId,
  oldValue,
  newValue,
  sensitive = true,
}: AuditInput) => {
  try {
    const { error } = await supabase.functions.invoke('admin-notify', {
      body: {
        action,
        table,
        record_id: recordId ?? null,
        before: oldValue ?? null,
        after: newValue ?? null,
        sensitive,
      },
    });
    if (error) console.warn('logAudit: admin-notify failed', error);
  } catch (e) {
    console.warn('logAudit: unexpected error', e);
  }
};
