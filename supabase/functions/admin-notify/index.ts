// admin-notify — records an admin action to audit_logs (server-side, admin-only)
// and emails setvoid.app@gmail.com when the action is flagged sensitive.
// The client CANNOT fake identity: the function verifies the caller's JWT and
// re-checks admin role via public.is_admin() before doing anything.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const NOTIFY_TO = 'setvoid.app@gmail.com';
// Verified sender or Resend's test sender; the user must have this verified in Resend.
const NOTIFY_FROM = Deno.env.get('RESEND_FROM') ?? 'SETVOID Admin <onboarding@resend.dev>';

interface Payload {
  action: string;
  table: string;
  record_id?: string | null;
  before?: unknown;
  after?: unknown;
  sensitive?: boolean; // if true, email is sent
}

function escape(s: unknown): string {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}

async function sendEmail(subject: string, html: string): Promise<void> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) {
    console.warn('RESEND_API_KEY missing — skipping email');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: NOTIFY_FROM, to: [NOTIFY_TO], subject, html }),
  });
  if (!res.ok) {
    console.error(`Resend failed [${res.status}]: ${await res.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const actor = userData.user;

  // Server-side role check — never trust the client.
  const { data: isAdmin, error: roleErr } = await supabase.rpc('is_admin', { _user_id: actor.id });
  if (roleErr || !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: Payload;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!body?.action || !body?.table) {
    return new Response(JSON.stringify({ error: 'action and table required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const fwd = req.headers.get('x-forwarded-for') ?? '';
  const ip = fwd.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || null;
  const ua = req.headers.get('user-agent') || null;

  // Write to audit_logs through the SECURITY DEFINER helper (which re-checks admin).
  const { data: auditId, error: auditErr } = await supabase.rpc('record_admin_action', {
    _action: body.action,
    _table: body.table,
    _record_id: body.record_id ?? null,
    _before: body.before ?? null,
    _after: body.after ?? null,
    _ip: ip,
    _user_agent: ua,
  });
  if (auditErr) {
    console.error('record_admin_action failed:', auditErr);
    return new Response(JSON.stringify({ error: 'audit_failed', details: auditErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (body.sensitive) {
    const subject = `[SETVOID] ${body.action.toUpperCase()} on ${body.table}`;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:640px">
        <h2 style="color:#111">Admin action recorded</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td><b>Admin</b></td><td>${escape(actor.email)} <code>${escape(actor.id)}</code></td></tr>
          <tr><td><b>Action</b></td><td>${escape(body.action)}</td></tr>
          <tr><td><b>Table</b></td><td>${escape(body.table)}</td></tr>
          <tr><td><b>Record</b></td><td>${escape(body.record_id ?? '-')}</td></tr>
          <tr><td><b>Time</b></td><td>${new Date().toISOString()}</td></tr>
          <tr><td><b>IP</b></td><td>${escape(ip ?? '-')}</td></tr>
          <tr><td><b>Device</b></td><td>${escape(ua ?? '-')}</td></tr>
        </table>
        <h3>Before</h3>
        <pre style="background:#f5f5f5;padding:8px;overflow:auto">${escape(JSON.stringify(body.before ?? null, null, 2))}</pre>
        <h3>After</h3>
        <pre style="background:#f5f5f5;padding:8px;overflow:auto">${escape(JSON.stringify(body.after ?? null, null, 2))}</pre>
      </div>`;
    await sendEmail(subject, html);
  }

  return new Response(JSON.stringify({ ok: true, audit_id: auditId }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});