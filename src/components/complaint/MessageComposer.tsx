import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Lock, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Complaint } from '@/types/complaint';

interface MessageComposerProps {
  complaint: Complaint;
}

export default function MessageComposer({ complaint }: MessageComposerProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [useAiDraft, setUseAiDraft] = useState(false);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const senderName = profile?.full_name || 'Agent';
      const { error } = await supabase.from('messages').insert({
        complaint_id: complaint.id,
        direction: isInternalNote ? 'inbound' : 'outbound',
        channel: complaint.channel,
        sender_name: senderName,
        sender_type: isInternalNote ? 'agent' : 'agent',
        content,
        is_internal_note: isInternalNote,
        is_ai_drafted: useAiDraft,
      } as any);
      if (error) throw error;

      // If it's a reply (not internal note) and no first_response_at, set it
      if (!isInternalNote && !complaint.first_response_at) {
        await supabase
          .from('complaints')
          .update({ first_response_at: new Date().toISOString() } as any)
          .eq('id', complaint.id);
      }

      // Log to audit
      await supabase.from('audit_log').insert({
        complaint_id: complaint.id,
        actor_name: senderName,
        action: isInternalNote ? 'internal_note' : 'reply_sent',
        description: isInternalNote
          ? `Internal note added by ${senderName}`
          : `Reply sent to customer by ${senderName}`,
      } as any);
    },
    onSuccess: () => {
      setContent('');
      setUseAiDraft(false);
      queryClient.invalidateQueries({ queryKey: ['messages', complaint.id] });
      queryClient.invalidateQueries({ queryKey: ['complaint', complaint.id] });
      queryClient.invalidateQueries({ queryKey: ['audit_log', complaint.id] });
      toast.success(isInternalNote ? 'Internal note added' : 'Reply sent');
    },
    onError: () => toast.error('Failed to send message'),
  });

  const handleUseAiDraft = () => {
    if (complaint.ai_draft_response) {
      setContent(complaint.ai_draft_response);
      setUseAiDraft(true);
      setIsInternalNote(false);
    }
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setIsInternalNote(false)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            !isInternalNote ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          <Send className="w-3 h-3" /> Reply
        </button>
        <button
          onClick={() => setIsInternalNote(true)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            isInternalNote ? 'bg-severity-medium text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          <Lock className="w-3 h-3" /> Internal Note
        </button>
        {complaint.ai_draft_response && (
          <button
            onClick={handleUseAiDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            <Sparkles className="w-3 h-3" /> Use AI Draft
          </button>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isInternalNote ? 'Add an internal note (not visible to customer)...' : 'Type your reply to the customer...'}
          className={cn(
            'min-h-[100px] text-sm pr-20 resize-none',
            isInternalNote && 'border-severity-medium/30 bg-severity-medium-bg/20'
          )}
        />
        {isInternalNote && (
          <Badge variant="outline" className="absolute top-2 right-2 text-[9px] text-severity-medium border-severity-medium/30">
            <Lock className="w-3 h-3 mr-0.5" /> Internal
          </Badge>
        )}
        {useAiDraft && (
          <Badge variant="outline" className="absolute top-2 right-14 text-[9px] text-primary border-primary/30">
            <Sparkles className="w-3 h-3 mr-0.5" /> AI Draft
          </Badge>
        )}
      </div>

      {/* Send */}
      <div className="flex justify-end mt-3">
        <Button
          size="sm"
          disabled={!content.trim() || sendMessage.isPending}
          onClick={() => sendMessage.mutate()}
          className={cn(isInternalNote && 'bg-severity-medium hover:bg-severity-medium/90')}
        >
          {sendMessage.isPending ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : isInternalNote ? (
            <Lock className="w-3 h-3 mr-1" />
          ) : (
            <Send className="w-3 h-3 mr-1" />
          )}
          {isInternalNote ? 'Add Note' : 'Send Reply'}
        </Button>
      </div>
    </div>
  );
}
