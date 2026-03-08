import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth, AppRole } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  requiredRole?: AppRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics', requiredRole: ['admin', 'manager', 'supervisor'] },
  { label: 'Performance', icon: Users, path: '/performance', requiredRole: ['admin', 'manager', 'supervisor'] },
  { label: 'Reports', icon: FileText, path: '/reports', requiredRole: ['admin', 'manager', 'supervisor'] },
  { label: 'Admin', icon: Settings, path: '/admin', requiredRole: ['admin', 'manager'] },
];

export default function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const { hasAnyRole, primaryRole } = useAuth();

  const visibleItems = navItems.filter(item =>
    !item.requiredRole || hasAnyRole(...item.requiredRole)
  );

  const roleColors: Record<AppRole, string> = {
    admin: 'bg-severity-critical text-white',
    manager: 'bg-severity-high text-white',
    supervisor: 'bg-severity-medium text-white',
    agent: 'bg-primary text-primary-foreground',
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Shield className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">BankComplain</span>
            <span className="text-[10px] font-medium text-primary opacity-80">AI</span>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider', roleColors[primaryRole])}>
            {primaryRole}
          </span>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center py-3 border-b border-sidebar-border">
          <span className={cn('w-2 h-2 rounded-full', roleColors[primaryRole])} title={primaryRole} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-2 rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
