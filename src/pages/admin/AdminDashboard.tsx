import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, UserPlus, Activity, Swords, Coins, ScrollText, ShoppingBag, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stats {
  total_users: number;
  today_registrations: number;
  today_logins: number;
  total_gold: number;
  total_gates: number;
  total_main_quests: number;
  total_side_quests: number;
  total_events: number;
  total_purchases: number;
  revenue_usd: number;
}

interface Card {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('admin_dashboard_stats');
      if (error) setError(error.message);
      else setStats(data as Stats);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading stats…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load dashboard stats: {error}
      </div>
    );
  }

  const cards: Card[] = stats
    ? [
        { label: 'Total Users', value: stats.total_users ?? 0, icon: Users, accent: 'text-primary' },
        { label: 'Today Logins', value: stats.today_logins ?? 0, icon: Activity, accent: 'text-emerald-400' },
        { label: 'Today Signups', value: stats.today_registrations ?? 0, icon: UserPlus, accent: 'text-cyan-400' },
        { label: 'Total Gold', value: (stats.total_gold ?? 0).toLocaleString(), icon: Coins, accent: 'text-yellow-400' },
        { label: 'Gates', value: stats.total_gates ?? 0, icon: Swords, accent: 'text-orange-400' },
        { label: 'Main Quests', value: stats.total_main_quests ?? 0, icon: ScrollText, accent: 'text-primary' },
        { label: 'Side Quests', value: stats.total_side_quests ?? 0, icon: ScrollText, accent: 'text-sky-400' },
        { label: 'Events', value: stats.total_events ?? 0, icon: Megaphone },
        { label: 'Purchases', value: stats.total_purchases ?? 0, icon: ShoppingBag, accent: 'text-fuchsia-400' },
        { label: 'Revenue (USD)', value: (stats.revenue_usd ?? 0).toLocaleString(), icon: Coins, accent: 'text-yellow-400' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-wide">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of the SETVOID platform.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-border/50 bg-card/40 backdrop-blur p-4 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] uppercase tracking-widest">{c.label}</span>
              <c.icon className={cn('h-4 w-4', c.accent ?? 'text-muted-foreground')} />
            </div>
            <div className={cn('mt-2 text-2xl font-semibold', c.accent ?? 'text-foreground')}>
              {c.value}
            </div>
            {c.hint && <div className="text-[10px] text-muted-foreground mt-0.5">{c.hint}</div>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur p-6">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Next up</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li>CRUD modules for Shop Items, Gate Items, Ads, Missions, Users.</li>
          <li>Broadcast notifications and redeem codes.</li>
          <li>Global settings (multipliers, drop rates, maintenance mode).</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
