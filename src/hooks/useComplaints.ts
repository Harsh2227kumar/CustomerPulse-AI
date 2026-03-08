import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Complaint, Message, AuditLogEntry, Agent } from '@/types/complaint';

// Map DB row to frontend Complaint type
function mapComplaint(row: any): Complaint {
  return {
    id: row.id,
    ticket_id: row.ticket_id,
    customer_id: row.customer_id || '',
    customer_name: row.customer_name,
    customer_email: row.customer_email || '',
    customer_phone: row.customer_phone || '',
    account_number: row.account_number || '',
    channel: row.channel,
    status: row.status,
    priority: row.priority,
    category: row.category,
    sub_category: row.sub_category || '',
    product: row.product || '',
    subject: row.subject,
    body: row.body,
    sentiment: row.sentiment || 'neutral',
    sentiment_score: Number(row.sentiment_score) || 0,
    severity_score: row.severity_score || 0,
    ai_summary: row.ai_summary || '',
    ai_key_issues: row.ai_key_issues || [],
    ai_draft_response: row.ai_draft_response,
    assigned_to: row.assigned_to,
    assigned_agent_name: row.assigned_agent_name,
    sla_deadline: row.sla_deadline || '',
    sla_status: row.sla_status || 'on_track',
    sla_hours_remaining: Number(row.sla_hours_remaining) || 0,
    first_response_at: row.first_response_at,
    resolved_at: row.resolved_at,
    closed_at: row.closed_at,
    resolution_notes: row.resolution_notes,
    tags: row.tags || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapMessage(row: any): Message {
  return {
    id: row.id,
    complaint_id: row.complaint_id,
    direction: row.direction,
    channel: row.channel,
    sender_name: row.sender_name,
    sender_type: row.sender_type,
    content: row.content,
    is_internal_note: row.is_internal_note,
    is_ai_drafted: row.is_ai_drafted,
    sent_at: row.sent_at,
  };
}

function mapAgent(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department || '',
    avatar_url: row.avatar_url,
    is_active: row.is_active,
    current_load: row.current_load,
    max_complaints: row.max_complaints,
  };
}

export function useComplaints() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('complaints-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['complaints'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapComplaint);
    },
  });
}

export function useComplaint(id: string | undefined) {
  return useQuery({
    queryKey: ['complaint', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return mapComplaint(data);
    },
    enabled: !!id,
  });
}

export function useComplaintMessages(complaintId: string | undefined) {
  return useQuery({
    queryKey: ['messages', complaintId],
    queryFn: async () => {
      if (!complaintId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('complaint_id', complaintId)
        .order('sent_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapMessage);
    },
    enabled: !!complaintId,
  });
}

export function useAuditLog(complaintId: string | undefined) {
  return useQuery({
    queryKey: ['audit_log', complaintId],
    queryFn: async () => {
      if (!complaintId) return [];
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('complaint_id', complaintId)
        .order('created_at', { ascending: true });
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
    enabled: !!complaintId,
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []).map(mapAgent);
    },
  });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (complaint: {
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      account_number: string;
      channel: string;
      category: string;
      priority: string;
      subject: string;
      body: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('complaints')
        .insert({
          ...complaint,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Trigger AI analysis in background
      supabase.functions.invoke('analyze-complaint', {
        body: {
          complaint_id: data.id,
          subject: complaint.subject,
          body: complaint.body,
          category: complaint.category,
          priority: complaint.priority,
          customer_name: complaint.customer_name,
        },
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['complaints'] });
      }).catch(err => console.error('AI analysis failed:', err));

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('complaints')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // If assigning to an agent, trigger notification
      if (updates.assigned_to && updates.assigned_agent_name) {
        supabase.functions.invoke('sla-notifications', {
          body: {
            type: 'assignment',
            complaint_id: id,
            agent_name: updates.assigned_agent_name,
            agent_email: updates.agent_email || '',
            ticket_id: data.ticket_id,
            subject: data.subject,
            customer_name: data.customer_name,
          },
        }).catch(err => console.error('Assignment notification failed:', err));
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaint', variables.id] });
    },
  });
}

export function useTriggerSlaCheck() {
  return useMutation({
    mutationFn: async (complaint: {
      id: string;
      ticket_id: string;
      subject: string;
      customer_name: string;
      assigned_agent_name?: string;
      sla_hours_remaining: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('sla-notifications', {
        body: {
          type: 'sla_warning',
          complaint_id: complaint.id,
          ticket_id: complaint.ticket_id,
          subject: complaint.subject,
          customer_name: complaint.customer_name,
          agent_name: complaint.assigned_agent_name || 'Unassigned',
          sla_hours_remaining: complaint.sla_hours_remaining,
        },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useSlaRules() {
  return useQuery({
    queryKey: ['sla_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_rules')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}
