import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Search, Loader2, Clock, CheckCircle2, AlertTriangle, XCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  new: { label: 'Received', icon: Clock, className: 'text-status-new bg-status-new-bg' },
  assigned: { label: 'Under Review', icon: Clock, className: 'text-status-assigned bg-status-assigned-bg' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'text-status-in-progress bg-status-in-progress-bg' },
  pending_customer: { label: 'Awaiting Your Response', icon: AlertTriangle, className: 'text-status-pending bg-status-pending-bg' },
  resolved: { label: 'Resolved', icon: CheckCircle2, className: 'text-status-resolved bg-status-resolved-bg' },
  closed: { label: 'Closed', icon: XCircle, className: 'text-status-closed bg-status-closed-bg' },
};

const steps = ['new', 'assigned', 'in_progress', 'resolved', 'closed'];

export default function TrackComplaintPage() {
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complaint, setComplaint] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = ticketId.trim().toUpperCase();
    if (!formatted) return;
    
    setLoading(true);
    setError('');
    setComplaint(null);
    setMessages([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('track-complaint', {
        body: { ticket_id: formatted },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error === 'Complaint not found' ? 'No complaint found with this ticket ID. Please check and try again.' : data.error);
        return;
      }
      setComplaint(data.complaint);
      setMessages(data.messages || []);
    } catch (err: any) {
      setError('Unable to look up complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = complaint ? steps.indexOf(complaint.status) : -1;
  const statusInfo = complaint ? statusConfig[complaint.status] || statusConfig.new : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">BankComplain AI</h1>
            <p className="text-xs text-muted-foreground">Complaint Tracking Portal</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Search */}
        <Card className="p-6 border border-border mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Track Your Complaint</h2>
          <p className="text-sm text-muted-foreground mb-4">Enter your ticket ID to view the current status of your complaint.</p>
          <form onSubmit={handleTrack} className="flex gap-3">
            <Input
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="e.g. CMP-2026-000001"
              className="flex-1 font-mono"
            />
            <Button type="submit" disabled={loading || !ticketId.trim()}>
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
              Track
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </Card>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        )}

        {complaint && statusInfo && (
          <>
            {/* Status Card */}
            <Card className="p-6 border border-border mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs text-muted-foreground">Ticket ID</span>
                  <p className="text-lg font-mono font-bold text-primary">{complaint.ticket_id}</p>
                </div>
                <Badge variant="outline" className={cn('text-sm px-3 py-1', statusInfo.className)}>
                  <statusInfo.icon className="w-4 h-4 mr-1.5" />
                  {statusInfo.label}
                </Badge>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-0 mb-6">
                {steps.map((step, i) => {
                  const isComplete = i <= currentStepIndex;
                  const isCurrent = i === currentStepIndex;
                  return (
                    <div key={step} className="flex-1 flex items-center">
                      <div className={cn(
                        'w-3 h-3 rounded-full border-2 flex-shrink-0',
                        isComplete ? 'bg-primary border-primary' : 'bg-background border-border',
                        isCurrent && 'ring-4 ring-primary/20'
                      )} />
                      {i < steps.length - 1 && (
                        <div className={cn(
                          'flex-1 h-0.5 mx-1',
                          i < currentStepIndex ? 'bg-primary' : 'bg-border'
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider -mt-2 mb-4">
                <span>Received</span>
                <span>Review</span>
                <span>Progress</span>
                <span>Resolved</span>
                <span>Closed</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Customer</span>
                  <p className="font-medium text-foreground">{complaint.customer_name}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Category</span>
                  <p className="font-medium text-foreground capitalize">{complaint.category}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Subject</span>
                  <p className="font-medium text-foreground">{complaint.subject}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Filed On</span>
                  <p className="font-medium text-foreground">{format(new Date(complaint.created_at), 'dd MMM yyyy, HH:mm')}</p>
                </div>
                {complaint.resolved_at && (
                  <div>
                    <span className="text-xs text-muted-foreground">Resolved On</span>
                    <p className="font-medium text-status-resolved">{format(new Date(complaint.resolved_at), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">Priority</span>
                  <p className="font-medium text-foreground capitalize">{complaint.priority}</p>
                </div>
              </div>
            </Card>

            {/* Messages */}
            {messages.length > 0 && (
              <Card className="p-6 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Communication History</h3>
                </div>
                <div className="space-y-4">
                  {messages.map((msg: any, i: number) => (
                    <div key={i} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[80%] rounded-lg px-4 py-3',
                        msg.direction === 'outbound'
                          ? 'bg-primary/5 border border-primary/10'
                          : 'bg-muted border border-border'
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground">{msg.sender_name}</span>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(msg.sent_at), 'dd MMM, HH:mm')}</span>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Info */}
        {!complaint && !loading && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Enter your ticket ID above to track your complaint status</p>
            <p className="text-xs text-muted-foreground mt-1">Your ticket ID was provided when the complaint was filed (e.g. CMP-2026-000001)</p>
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-12 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BankComplain AI — Secure Complaint Management
      </footer>
    </div>
  );
}
