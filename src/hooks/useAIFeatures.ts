import { useState, useCallback } from 'react';
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

// AI Insights - Trend analysis & root cause identification
export function useAIInsights() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-insights', {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        success: boolean;
        insights: {
          executive_summary: string;
          trends: Array<{
            title: string;
            description: string;
            severity: 'info' | 'warning' | 'critical';
            metric: string;
          }>;
          root_causes: Array<{
            issue: string;
            cause: string;
            affected_count: number;
            recommendation: string;
          }>;
          recommendations: Array<{
            action: string;
            impact: 'high' | 'medium' | 'low';
            effort: 'high' | 'medium' | 'low';
            rationale: string;
          }>;
          risk_alerts: Array<{
            alert: string;
            severity: 'warning' | 'critical';
            details: string;
          }>;
          workload_suggestions: string;
        } | null;
      };
    },
  });
}

// AI Chat - Streaming assistant
type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(async (input: string) => {
    const userMsg: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    let assistantContent = '';

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed: ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${errorMsg}` }]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, sendMessage, clearChat };
}
