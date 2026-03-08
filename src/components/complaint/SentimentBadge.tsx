import { cn } from '@/lib/utils';
import { Sentiment } from '@/types/complaint';
import { SENTIMENT_LABELS, SENTIMENT_EMOJIS } from '@/lib/constants';

const sentimentStyles: Record<Sentiment, string> = {
  positive: 'bg-sentiment-positive-bg text-sentiment-positive',
  neutral: 'bg-sentiment-neutral-bg text-sentiment-neutral',
  negative: 'bg-sentiment-negative-bg text-sentiment-negative',
  angry: 'bg-sentiment-angry-bg text-sentiment-angry',
};

export default function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', sentimentStyles[sentiment])}>
      <span>{SENTIMENT_EMOJIS[sentiment]}</span>
      {SENTIMENT_LABELS[sentiment]}
    </span>
  );
}
