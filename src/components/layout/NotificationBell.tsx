import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const getIcon = (action: string) => {
    switch (action) {
      case 'sla_breached': return <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />;
      case 'sla_warning': return <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />;
      case 'assignment_notification': return <Shield className="w-4 h-4 text-primary flex-shrink-0" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      markAllRead();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {notifications.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{notifications.length} recent</span>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                  )}
                  onClick={() => {
                    setOpen(false);
                    navigate(`/complaints/${n.complaint_id}`);
                  }}
                >
                  {getIcon(n.action)}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground leading-relaxed line-clamp-2">{n.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}