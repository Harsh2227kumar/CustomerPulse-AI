import { cn } from '@/lib/utils';
import { ComplaintCategory } from '@/types/complaint';
import { CATEGORY_LABELS } from '@/lib/constants';

const categoryStyles: Record<ComplaintCategory, string> = {
  loan: 'bg-blue-50 text-blue-700 border-blue-200',
  account: 'bg-violet-50 text-violet-700 border-violet-200',
  card: 'bg-amber-50 text-amber-700 border-amber-200',
  transfer: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  kyc: 'bg-pink-50 text-pink-700 border-pink-200',
  fraud: 'bg-red-50 text-red-700 border-red-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function CategoryBadge({ category }: { category: ComplaintCategory }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', categoryStyles[category])}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}
