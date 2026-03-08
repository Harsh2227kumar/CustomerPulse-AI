import { cn } from '@/lib/utils';
import { ComplaintPriority } from '@/types/complaint';
import { PRIORITY_LABELS } from '@/lib/constants';

const severityStyles: Record<ComplaintPriority, string> = {
  low: 'bg-severity-low-bg text-severity-low',
  medium: 'bg-severity-medium-bg text-severity-medium',
  high: 'bg-severity-high-bg text-severity-high',
  critical: 'bg-severity-critical-bg text-severity-critical animate-pulse',
};

export default function SeverityBadge({ severity }: { severity: ComplaintPriority }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', severityStyles[severity])}>
      {PRIORITY_LABELS[severity]}
    </span>
  );
}
