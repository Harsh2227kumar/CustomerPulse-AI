import { Search, Menu, LogOut } from 'lucide-react';
import NotificationBell from '@/components/layout/NotificationBell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

const roleBadgeStyles: Record<AppRole, string> = {
  admin: 'bg-severity-critical-bg text-severity-critical border-severity-critical/20',
  manager: 'bg-severity-high-bg text-severity-high border-severity-high/20',
  supervisor: 'bg-severity-medium-bg text-severity-medium border-severity-medium/20',
  agent: 'bg-primary/10 text-primary border-primary/20',
};

export default function Topbar({ onMenuClick, title = 'Dashboard' }: TopbarProps) {
  const { profile, signOut, primaryRole } = useAuth();
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-card border-b border-border">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <div className="hidden md:flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-severity-low-bg">
          <span className="w-2 h-2 rounded-full bg-severity-low animate-pulse" />
          <span className="text-[11px] font-medium text-severity-low">Live</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search complaints..." className="pl-9 w-64 h-9 text-sm bg-background" />
        </div>
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground leading-tight">{profile?.full_name || 'User'}</span>
                <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4 capitalize', roleBadgeStyles[primaryRole])}>
                  {primaryRole}
                </Badge>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground capitalize">Role: {primaryRole}</p>
              {profile?.department && (
                <p className="text-xs text-muted-foreground">Dept: {profile.department}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
