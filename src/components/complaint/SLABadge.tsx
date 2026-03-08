import { cn } from '@/lib/utils';
import { SLAStatus } from '@/types/complaint';
import { SLA_LABELS } from '@/lib/constants';
import { AlertTriangle, Clock } from 'lucide-react';

const slaStyles: Record<SLAStatus, string> = {
  on_track: 'bg-sla-on-track-bg text-sla-on-track',
  at_risk: 'bg-sla-at-risk-bg text-sla-at-risk',
  breached: 'bg-sla-breached-bg text-sla-breached',
};

function formatHours(hours: number): string {
  if (hours <= 0) return 'Done';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d ${Math.round(hours % 24)}h`;
}

export default function SLABadge({ status, hoursRemaining }: { status: SLAStatus; hoursRemaining: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', slaStyles[status])}>
      {status === 'breached' ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {hoursRemaining > 0 ? formatHours(hoursRemaining) : SLA_LABELS[status]}
    </span>
  );
}
