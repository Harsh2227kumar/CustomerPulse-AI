import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AuditLogEntry } from '@/types/complaint';

export function useNotifications() {
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenAt, setLastSeenAt] = useState<string>(() => {
    return localStorage.getItem('notifications_last_seen') || new Date(0).toISOString();
  });

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .in('action', ['sla_warning', 'sla_breached', 'assignment_notification'])
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        complaint_id: row.complaint_id,
        actor_name: row.actor_name,
        action: row.action,
        description: row.description,
        created_at: row.created_at,
      })) as AuditLogEntry[];
    },
  });

  // Calculate unread count
  useEffect(() => {
    if (query.data) {
      const count = query.data.filter(n => n.created_at > lastSeenAt).length;
      setUnreadCount(count);
    }
  }, [query.data, lastSeenAt]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_log' },
        (payload) => {
          const action = payload.new?.action;
          if (['sla_warning', 'sla_breached', 'assignment_notification'].includes(action)) {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const markAllRead = () => {
    const now = new Date().toISOString();
    setLastSeenAt(now);
    setUnreadCount(0);
    localStorage.setItem('notifications_last_seen', now);
  };

  return {
    notifications: query.data || [],
    unreadCount,
    isLoading: query.isLoading,
    markAllRead,
  };
}