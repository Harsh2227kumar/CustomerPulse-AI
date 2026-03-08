import { useParams, useNavigate } from 'react-router-dom';
import { useComplaint, useComplaintMessages, useAuditLog } from '@/hooks/useComplaints';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/complaint/StatusBadge';
import SeverityBadge from '@/components/complaint/SeverityBadge';
import SentimentBadge from '@/components/complaint/SentimentBadge';
import SLABadge from '@/components/complaint/SLABadge';
import CategoryBadge from '@/components/complaint/CategoryBadge';
import ChannelIcon from '@/components/complaint/ChannelIcon';
import AgentAssignment from '@/components/complaint/AgentAssignment';
import AIResponseGenerator from '@/components/complaint/AIResponseGenerator';
import DuplicateDetector from '@/components/complaint/DuplicateDetector';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Brain, AlertTriangle, User, Clock, MessageSquare, Sparkles, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: complaint, isLoading } = useComplaint(id);
  const { data: messages = [] } = useComplaintMessages(id);
  const { data: auditLog = [] } = useAuditLog(id);

  if (isLoading) {
    return (
      <AppShell title="Loading...">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!complaint) {
    return (
      <AppShell title="Complaint Not Found">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Complaint not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={complaint.ticket_id}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <span className="text-lg font-mono font-bold text-primary">{complaint.ticket_id}</span>
        <StatusBadge status={complaint.status} />
        <SeverityBadge severity={complaint.priority} />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm">
            <AlertTriangle className="w-4 h-4 mr-1" /> Escalate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <ChannelIcon channel={complaint.channel} />
              <span className="text-xs text-muted-foreground capitalize">{complaint.channel}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{format(new Date(complaint.created_at), 'dd MMM yyyy, HH:mm')}</span>
            </div>
            <h2 className="text-base font-semibold text-foreground mb-2">{complaint.subject}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{complaint.body}</p>
            {complaint.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {complaint.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                ))}
              </div>
            )}
          </Card>

          {/* AI Analysis */}
          <Card className="p-5 border border-border bg-primary/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">AI Analysis</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                <CategoryBadge category={complaint.category} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sentiment</p>
                <SentimentBadge sentiment={complaint.sentiment} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Severity</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', complaint.severity_score > 70 ? 'bg-severity-critical' : complaint.severity_score > 40 ? 'bg-severity-medium' : 'bg-severity-low')}
                      style={{ width: `${complaint.severity_score}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-medium text-foreground">{complaint.severity_score}/100</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Confidence</p>
                <span className="text-xs font-medium text-foreground">{Math.round(complaint.sentiment_score * 100)}%</span>
              </div>
            </div>
            {complaint.ai_summary && (
              <div className="mb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">AI Summary</p>
                <p className="text-sm text-foreground">{complaint.ai_summary}</p>
              </div>
            )}
            {complaint.ai_key_issues.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Key Issues</p>
                <div className="flex flex-wrap gap-1.5">
                  {complaint.ai_key_issues.map((issue, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{issue}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* AI Response Generator */}
          <AIResponseGenerator complaint={complaint} />

          {/* Conversation */}
          <Card className="p-5 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Conversation</h3>
              <span className="text-xs text-muted-foreground">({messages.length} messages)</span>
            </div>
            <div className="space-y-4">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[80%] rounded-lg px-4 py-3',
                    msg.is_internal_note
                      ? 'bg-amber-50 border border-amber-200'
                      : msg.direction === 'outbound'
                        ? 'bg-primary/5 border border-primary/10'
                        : 'bg-muted border border-border'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      {msg.is_internal_note && <Lock className="w-3 h-3 text-amber-600" />}
                      <span className="text-xs font-medium text-foreground">{msg.sender_name}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(msg.sent_at), 'HH:mm')}</span>
                      {msg.is_ai_drafted && <Badge variant="outline" className="text-[9px] px-1 py-0">AI</Badge>}
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="p-5 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Customer</h3>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {complaint.customer_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{complaint.customer_name}</p>
                <p className="text-xs text-muted-foreground">{complaint.account_number}</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-foreground">{complaint.customer_email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="text-foreground">{complaint.customer_phone}</span></div>
            </div>
          </Card>

          <Card className="p-5 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">SLA Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Resolution SLA</span>
                <SLABadge status={complaint.sla_status} hoursRemaining={complaint.sla_hours_remaining} />
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    complaint.sla_status === 'on_track' ? 'bg-sla-on-track' : complaint.sla_status === 'at_risk' ? 'bg-sla-at-risk' : 'bg-sla-breached'
                  )}
                  style={{ width: `${Math.min(100, Math.max(5, 100 - (complaint.sla_hours_remaining / 48) * 100))}%` }}
                />
              </div>
              {complaint.first_response_at && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">First Response</span>
                  <span className="text-xs text-severity-low font-medium">✅ Met</span>
                </div>
              )}
            </div>
          </Card>

          <AgentAssignment complaint={complaint} />

          <DuplicateDetector complaint={complaint} />

          {auditLog.length > 0 && (
            <Card className="p-5 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Audit Trail</h3>
              <div className="space-y-3">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-foreground">{entry.description}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.actor_name} • {format(new Date(entry.created_at), 'dd MMM, HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
