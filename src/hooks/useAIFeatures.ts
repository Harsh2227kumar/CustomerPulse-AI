import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// AI Response Generation with tone adjustment
export function useGenerateResponse() {
  return useMutation({
    mutationFn: async (params: {
      complaint_id: string;
      subject: string;
      body: string;
      category: string;
      customer_name: string;
      tone: 'formal' | 'empathetic' | 'escalation';
      conversation_history?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-response', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        success: boolean;
        response_text: string;
        subject_line: string;
        key_actions: string[];
      };
    },
  });
}

// Duplicate detection
export function useDetectDuplicates() {
  return useMutation({
    mutationFn: async (params: {
      complaint_id: string;
      subject: string;
      body: string;
      category: string;
      customer_name: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('detect-duplicates', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        success: boolean;
        duplicates: Array<{
          complaint_id: string;
          ticket_id: string;
          subject: string;
          customer_name: string;
          category: string;
          status: string;
          similarity_score: number;
          match_type: 'duplicate' | 'related' | 'pattern';
          reason: string;
        }>;
      };
    },
  });
}

// Predictive SLA breach
export function usePredictSlaBreach() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('predict-sla', {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        success: boolean;
        predictions: Array<{
          ticket_id: string;
          complaint_id: string;
          subject: string;
          assigned_agent_name: string;
          sla_hours_remaining: number;
          category: string;
          priority: string;
          breach_probability: number;
          risk_level: 'low' | 'medium' | 'high' | 'critical';
          risk_factors: string[];
          recommended_action: string;
        }>;
        summary: string;
      };
    },
  });
}
