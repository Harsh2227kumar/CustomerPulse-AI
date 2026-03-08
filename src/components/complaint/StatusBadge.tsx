import { cn } from '@/lib/utils';
import { ComplaintStatus } from '@/types/complaint';
import { STATUS_LABELS } from '@/lib/constants';

const statusStyles: Record<ComplaintStatus, string> = {
  new: 'bg-status-new-bg text-status-new',
  assigned: 'bg-status-assigned-bg text-status-assigned',
  in_progress: 'bg-status-in-progress-bg text-status-in-progress',
  pending_customer: 'bg-status-pending-bg text-status-pending',
  resolved: 'bg-status-resolved-bg text-status-resolved',
  closed: 'bg-status-closed-bg text-status-closed',
};

export default function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusStyles[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
