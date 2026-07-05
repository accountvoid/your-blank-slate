import { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Gem,
  Users,
  ClipboardList,
  Swords,
  Sparkles,
  Megaphone,
  ScrollText,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  superOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: '/admin/shop-items', label: 'Shop Items', icon: <ShoppingBag className="h-4 w-4" /> },
  { to: '/admin/gate-items', label: 'Gate Items', icon: <Gem className="h-4 w-4" /> },
  { to: '/admin/users', label: 'Users', icon: <Users className="h-4 w-4" /> },
  { to: '/admin/side-missions', label: 'Side Missions', icon: <ClipboardList className="h-4 w-4" /> },
  { to: '/admin/main-quests', label: 'Main Quests', icon: <Swords className="h-4 w-4" /> },
  { to: '/admin/ads', label: 'Ads', icon: <Megaphone className="h-4 w-4" /> },
  { to: '/admin/audit', label: 'Audit Logs', icon: <ScrollText className="h-4 w-4" /> },
  { to: '/admin/settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, superOnly: true },
];

export const AdminLayout = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useUserRole();

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground flex">
      <aside className="hidden md:flex w-60 flex-col border-r border-border/50 bg-card/50 backdrop-blur">
        <div className="px-5 py-6 border-b border-border/40 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm font-semibold tracking-widest">SETVOID</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Admin</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV.filter((n) => !n.superOnly || isSuperAdmin).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/admin'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                )
              }
            >
              {n.icon}
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-4 py-3 mx-2 mb-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-border/40"
        >
          <LogOut className="h-4 w-4" />
          Back to app
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-border/50 bg-card/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold tracking-widest">SETVOID · Admin</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Exit
          </button>
        </header>
        <div className="md:hidden overflow-x-auto border-b border-border/40 bg-card/40">
          <nav className="flex gap-1 px-2 py-2 min-w-max">
            {NAV.filter((n) => !n.superOnly || isSuperAdmin).map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/admin'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent',
                  )
                }
              >
                {n.icon}
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
